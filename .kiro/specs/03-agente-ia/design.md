# Diseño: Agente de IA conversacional

## Visión general

```
Navegador                          Flask                          Externos
  │  GET /api/ia/contexto?lat&lng ─▶ clima.py ───────────────────▶ Open-Meteo
  │                                  ia_contexto.py ─▶ MySQL (puestos cercanos)
  │  GET /api/ia/token?lat&lng&excluir ─▶ contexto + token efímero (modelo e instrucciones bloqueados) ─▶ Gemini
  │  POST /api/ia/chat ───────────▶ gemini_chat.py (modelo principal y respaldos) ─▶ Gemini (texto)
  │
  └─ WebSocket (token efímero + system_instruction) ─────────────▶ Gemini Live API
       audio PCM16 16 kHz ▶   ◀ audio PCM 24 kHz
```

El servidor prepara el contexto y el token, y atiende el chat de texto. El audio viaja directo del navegador a Gemini, sin pasar por Flask, usando el SDK JS (`@google/genai`, importado como módulo ES). Los tokens efímeros se crean con `v1beta` y el cliente se conecta con el valor `token.name` como si fuera la API key. Solo sirven para la Live API.

> Verificado el día de la implementación con `scripts/ia_smoke.py`: token efímero con `live_connect_constraints` (modelo, audio e instrucciones) funciona con los tres modelos de voz. El SDK de Python avisa que el soporte de tokens es experimental. Todo sigue en *preview*, así que los nombres pueden cambiar.

## Estructura (archivos de esta spec)

```
routes/ia_routes.py            GET /api/ia/contexto, GET /api/ia/token, POST /api/ia/chat
services/clima.py              Open-Meteo, caché de 10 min, timeout de 3 s
services/ia_contexto.py        franjas, reglas, cercanos (Haversine), system_instruction
services/gemini_token.py       lista de modelos, selección con excluir, creación del token efímero
services/gemini_chat.py        chat de texto con modelos de respaldo y reintentos
services/limitador.py          límite de peticiones por IP en memoria
static/js/gemini_live.js       módulo ES: sesión, SDK, micrófono, reproducción, reconexión, chat
static/js/audio_utils.js       funciones puras (PCM, base64, remuestreo, estados, reintentos)
static/css/ia.css              estados, animaciones y panel de chat
templates/partials/boton_ia.html
scripts/ia_smoke.py            verificación manual de clave y modelos (voz y chat)
tests/test_ia.py               clima, contexto, rutas, token, chat (todo simulado)
static/js/tests/gemini_live.test.js
```

## Backend

### `services/clima.py`
```python
def obtener_clima(lat: float, lng: float) -> dict | None
# {"temperatura_c": 14.2, "lluvia_mm": 0.4, "llueve": True, "descripcion": "lluvia ligera"}
def interpretar_weather_code(codigo: int) -> tuple[str, bool]   # (descripción, llueve)
```
* `requests.get(URL, params=..., timeout=3)`. Todo `try/except requests.RequestException` y de `KeyError`/`ValueError` devuelve `None`.
* Caché en memoria `dict` con clave `(round(lat,2), round(lng,2))` y marca de tiempo, TTL de 600 s. Es suficiente en un solo proceso.
* Códigos WMO de lluvia: 51 a 67 (llovizna y lluvia), 80 a 82 (chubascos), 95 a 99 (tormenta).

### `services/ia_contexto.py`
```python
def franja_del_dia(ahora: datetime) -> str            # 'manana' | 'mediodia' | 'tarde_noche'
def sugerencia_por_clima(clima: dict | None) -> str | None
def sugerencia_por_hora(franja: str) -> str
def sanitizar_texto(s: str, max_len=80) -> str        # quita saltos de línea y caracteres de control, colapsa espacios, recorta
def buscar_puestos_cercanos(cursor, lat, lng, radio_m=3000, limite=10) -> list[dict]
def construir_system_instruction(lat, lng, ahora, clima, puestos) -> str
```

Consulta (con parámetros, sin interpolar):
```sql
SELECT id, nombre, categoria, estatus, horario,
  6371000 * ACOS(LEAST(1, COS(RADIANS(%s)) * COS(RADIANS(latitud)) * COS(RADIANS(longitud) - RADIANS(%s))
                      + SIN(RADIANS(%s)) * SIN(RADIANS(latitud)))) AS distancia_m
FROM puestos
HAVING distancia_m <= %s
ORDER BY distancia_m
LIMIT %s
```
Luego, una segunda consulta con `WHERE puesto_id IN (...)` (placeholders generados) trae hasta 5 productos disponibles por puesto verificado. Se acota con un pre-filtro por caja (`latitud BETWEEN`, `longitud BETWEEN`) para no calcular trigonometría en toda la tabla.

`LEAST(1, ...)` evita errores de dominio por redondeo en `ACOS`.

### Estructura del `system_instruction`
```
Eres "Antojito", un asistente de voz amable que ayuda a encontrar antojitos mexicanos callejeros en la CDMX.
REGLAS: español mexicano, respuestas cortas (máx. 3 frases), recomienda 1 o 2 puestos SOLO de la lista...
CONTEXTO ACTUAL: fecha y hora (hora CDMX), franja, clima (si hay), ubicación aprox. del usuario.
GUÍA POR CLIMA Y HORA: <sugerencias calculadas>
PUESTOS CERCANOS (JSON): [ {id, nombre, categoria, estatus, horario, distancia_m, productos:[...]} ]
Si no hay puestos, ...
```
El JSON se serializa con `json.dumps(..., ensure_ascii=False)` y los textos de usuario pasan por `sanitizar_texto`. También se indica al modelo que el contenido de la lista son datos, no instrucciones.

### `routes/ia_routes.py`

| Ruta | Respuesta |
|---|---|
| `GET /api/ia/contexto?lat=&lng=` | `200 {system_instruction, contexto: {lat, lng, ubicacion_por_defecto, fecha_hora, franja, clima, puestos}}` |
| `GET /api/ia/token?lat=&lng=&excluir=a,b` | `200 {token, model, expira_en, modelos_restantes}`, `400` coordenadas inválidas, `503` (`no_configurado` o `modelos_agotados`), `502` si Gemini falla, `429` por límite |
| `POST /api/ia/chat` | `200 {respuesta, modelo}`, `400` cuerpo inválido, `502` configuración, `503` modelos ocupados, `429` por límite |

* Límite por IP con un `dict` de ventanas deslizantes en memoria (10/min). Basta para un MVP de un solo proceso.
* El token se crea con `google.genai.Client(api_key=..., http_options={"api_version": "v1beta"}).auth_tokens.create(config={"uses": 1, "expire_time": ..., "new_session_expire_time": ..., "live_connect_constraints": {"model": modelo, "config": {"response_modalities": ["AUDIO"], "system_instruction": texto}}})` y se devuelve `token.name`. El token también bloquea las transcripciones de entrada y salida. El cliente conecta con el mismo `model` y solo indica `responseModalities: ["AUDIO"]`: se verificó que las instrucciones del token se aplican aunque el cliente no las envíe.
* Solo se registra en el log el error técnico, nunca la clave.

## Frontend (`gemini_live.js`)

### Máquina de estados
```
inactivo ─toque→ conectando ─ok→ escuchando ⇄ hablando
   ▲                 │ error            │ error / cierre
   └──── toque ──────┴──────────────────┴→ error ─toque→ conectando
```

### Módulos internos
| Pieza | Responsabilidad |
|---|---|
| `soportaVoz()` | Detecta `getUserMedia`, `AudioContext`, `WebSocket` y `window.isSecureContext`. |
| `obtenerUbicacion()` | `window.AntojitoUbicacion`, o `geolocation`, o centro CDMX. |
| `iniciarVoz()` | Soporte, micrófono, ubicación y `orquestarConexion` con `pedirToken` y `conectarSDK` (SDK `ai.live.connect`). Un identificador de corrida evita carreras si el usuario cancela y vuelve a tocar. |
| Captura | `AudioContext` + `AudioWorklet` (con respaldo a `ScriptProcessor` si no existe), remuestreo a 16 kHz, `Float32` a `Int16`, base64 y envío. |
| Reproducción | Cola de buffers, programación con `AudioBufferSourceNode.start(tiempoSiguiente)` a 24 kHz, y vaciado al interrumpir. |
| UI | Clases CSS por estado, `aria-live`, transcripción corta. |
| `cerrarSesion()` | Cierra WebSocket, detiene pistas del micrófono, cierra `AudioContext`, limpia temporizadores. Idempotente. |

### Funciones puras (exportables y probadas)
```js
float32AInt16(float32Array) -> Int16Array         // con saturación a [-1, 1]
int16ABase64(int16Array) -> string
base64AInt16(base64) -> Int16Array
remuestrear(float32, tasaOrigen, tasaDestino) -> Float32Array
siguienteEstado(estado, evento) -> estado         // transiciones válidas de la máquina
construirMensajeInicial(modelo, systemInstruction) -> object
```

### UI (`boton_ia.html` + `ia.css`)
```html
<div id="zona-ia">
  <button id="btn-ia" aria-label="Hablar con el asistente" data-estado="inactivo">🎤</button>
  <p id="ia-estado" aria-live="polite"></p>
  <p id="ia-transcripcion"></p>
</div>
```
Animación de pulso en `escuchando`, ondas en `hablando`, color de alerta en `error`. Respetar `prefers-reduced-motion`.

## Modelos de respaldo y reconexión

### Servidor: `services/gemini_token.py`
```python
def modelos_voz() -> list[str]                          # [GEMINI_MODEL, *GEMINI_MODEL_FALLBACKS], sin vacíos ni duplicados
def elegir_modelo(excluir: list[str]) -> str | None     # primero no excluido; ignora valores ajenos a la lista
def crear_token(modelo, system_instruction) -> dict     # {token, model, expira_en}; 1 reintento a los 0,5 s
```
El token no "prueba" el modelo: crearlo no detecta saturación. La saturación se detecta en el cliente al conectar, y de ahí el parámetro `excluir`, que mantiene al servidor sin estado.

### Cliente: protocolo de reintentos (`audio_utils.js`)
```js
clasificarError(evento)      // -> 'reintentable' | 'cambiar_modelo' | 'fatal'
calcularEspera(intento, aleatorio = Math.random)   // 1000, 2000, 4000 ms ±25 %, tope 8000
orquestarConexion({ pedirToken, conectar, dormir, reloj, alEstado, cancelado, excluir, maxIntentosPorModelo: 3, tiempoTotalMs: 30000 })
   // -> {ok:true, sesion, modelo, excluir} | {ok:false, motivo: cancelado|tiempo_agotado|modelos_agotados|no_configurado|servidor_no_responde|fatal}
```
Flujo:
```
conectar(modelo)
  ├─ éxito ─────────────────────────────────────────▶ escuchando
  ├─ reintentable (intento < 3) ─ esperar ─ token nuevo ─▶ conectar(mismo modelo)
  ├─ reintentable (intento = 3) ─ excluir += modelo ─▶ conectar(siguiente modelo)
  ├─ cambiar_modelo ─ excluir += modelo ────────────▶ conectar(siguiente modelo)
  ├─ fatal ─────────────────────────────────────────▶ error (sin reintentos)
  └─ sin modelos o > 30 s ──────────────────────────▶ error + abrir chat de texto
```
`reloj` y `dormir` se inyectan para probar el planificador sin esperas reales.

### Caída a mitad de la conversación
Se probó la reanudación de sesión (`sessionResumption` con el último `newHandle`) con tokens efímeros en tres variantes: mismo token, token nuevo y token sin el campo bloqueado. En ninguna conservó el contexto de la charla. Por eso, si la sesión se cae, el cliente abre una sesión nueva con token nuevo (prefiriendo el mismo modelo, con 2 intentos antes de pasar al respaldo), vacía la reproducción, limpia la transcripción y avisa "Se reinició la conversación". Los eventos de la sesión vieja se ignoran con un identificador de conexión (`gen`), y una sesión cerrada por el usuario nunca se reconecta.

## Chat de texto

### `services/gemini_chat.py`
```python
def modelos_chat() -> list[str]
def generar_respuesta(system_instruction, historial, mensaje, *, cliente=None, dormir=time.sleep, aleatorio=random.random) -> dict
    # {respuesta, modelo}. Lanza ChatOcupado (503) o ChatConfiguracion (502)
def es_reintentable(error) -> bool      # 429, 500, 503, 504, tiempo agotado
def es_modelo_no_disponible(error) -> bool   # 404
```
Para cada modelo: hasta 2 intentos con 0,5 s de espera entre ellos (±25 %), sin espera al cambiar de modelo, 12 s por llamada y 20 s en total. `cliente`, `dormir` y `aleatorio` se inyectan para que las pruebas no hagan esperas ni llamadas de red. Se limita la salida (`max_output_tokens`) y el razonamiento para mantener la latencia baja. Los mensajes del usuario van como `contents` y el contexto como `system_instruction`.

### Interfaz
Panel dentro de `#zona-ia` con burbujas, entrada y envío. Cambia entre voz y texto sin perder el historial de la página. Se abre solo ante micrófono denegado, sin soporte, sin HTTPS o modelos de voz agotados.

### Límite por IP (`services/limitador.py`)
Ventana deslizante en memoria: `permitir(clave, maximo, ventana_s=60, ahora=time.monotonic)`. El token usa 10 por minuto y el chat 20.

## Manejo de errores

| Situación | Resultado |
|---|---|
| Micrófono denegado | Estado `error`, mensaje con pasos para habilitarlo |
| Sin HTTPS | Botón deshabilitado con explicación |
| `503` en token | "El asistente no está disponible por ahora" |
| Fallo de Open-Meteo | Contexto sin clima. El asistente sigue funcionando |
| WebSocket cae | Estado `error`, recursos liberados, reintento con un toque |
| Sesión > 5 min | Cierre automático con aviso |

## Estrategia de pruebas

### `tests/test_ia.py` (pytest, sin red)
| Caso | Verificación |
|---|---|
| Clima feliz | Con `responses` simulando Open-Meteo, `obtener_clima` devuelve valores y `llueve` correcto |
| Clima con fallo | Timeout, `500` y JSON inválido devuelven `None` |
| Caché | Dos llamadas con coordenadas cercanas hacen una sola petición HTTP |
| `weather_code` | 0 no llueve, 61 llueve, 95 llueve |
| Franjas | 05:00 y 11:59 mañana, 12:00 y 15:59 mediodía, 16:00, 23:00 y 04:59 tarde/noche |
| Sugerencias | 15 °C sugiere calientes, 26 °C frescas, 20 °C sin sugerencia, lluvia sugiere calientes |
| `sanitizar_texto` | Quita `\n`, `Ignora lo anterior`, recorta a 80 |
| Cercanos | Con semillas, un punto a 500 m aparece, uno a 10 km no, orden por distancia, máx. 10 |
| `GET /contexto` | Feliz (`system_instruction` contiene nombre de un puesto y la hora), sin coordenadas, coordenadas no numéricas (`400`), fuera de rango (`400`), fuera de CDMX (puestos vacíos), clima caído (sin sección de clima) |
| `GET /token` | Sin clave `503 no_configurado`, feliz sin la clave en el cuerpo, `excluir` salta al respaldo, `excluir` con todos da `503 modelos_agotados`, `excluir` con valores ajenos se ignora, coordenadas inválidas `400`, Gemini simulado con `503` reintenta una vez y luego `502`, `429` tras 10 llamadas |
| `POST /chat` | Feliz, cuerpo inválido (mensaje vacío, > 500 caracteres, historial > 10, rol desconocido) `400`, el principal da `503` y responde el respaldo, `404` salta de inmediato, `400/401/403` detiene con `502`, todos fallan `503`, reintentos y esperas con reloj simulado, mensaje del usuario nunca aparece dentro del `system_instruction`, `429` tras 20 llamadas |
| `elegir_modelo` | Sin exclusiones devuelve el principal, excluye el principal devuelve el primer respaldo, todos excluidos devuelve `None`, ignora nombres ajenos, sin duplicados |

### `static/js/tests/gemini_live.test.js` (`node --test`)
Planificador de reintentos (`clasificarError` con cada tipo de fallo, `calcularEspera` 1 s, 2 s, 4 s con aleatorio fijo, tope de 8 s, planificador: 3 intentos y cambio de modelo, `cambiar_modelo` inmediato, `fatal` sin reintentos, tope de 30 s, nunca bucle infinito), conversión `float32AInt16` (silencio, +1, -1, fuera de rango), ida y vuelta base64, `remuestrear` (longitud esperada de 48 kHz a 16 kHz), `siguienteEstado` (transiciones válidas e inválidas) y `construirMensajeInicial`.

### Verificación manual (checklist)
1. Con clave real, pregunta "¿qué me recomiendas con este frío?" y comprobar que recomienda de la lista.
2. Interrumpir al agente a media frase y comprobar que se calla.
3. Denegar micrófono y comprobar el mensaje.
4. Apagar Wi-Fi a media sesión y comprobar el estado `error`.
5. Probar en Chrome Android y Safari iOS por HTTPS.

## Riesgos
* **Modelo y API key sin definir:** se mitiga con variables de entorno, el `503` controlado y pruebas con simulación. Conseguir la clave en las primeras 2 horas.
* **API de Live en evolución:** aislar los nombres de mensajes en `construirMensajeInicial` y en un único `manejarMensajeServidor`.
* **Audio en iOS Safari:** el `AudioContext` debe crearse o reanudarse dentro del evento de toque.
* **Costos y abuso:** límite por IP, token de un solo uso y cierre a los 5 minutos.
