# Diseño: Agente de IA conversacional

## Visión general

```
Navegador                          Flask                          Externos
  │  GET /api/ia/contexto?lat&lng ─▶ clima.py ───────────────────▶ Open-Meteo
  │                                  ia_contexto.py ─▶ MySQL (puestos cercanos)
  │  GET /api/ia/token ───────────▶ google-genai: token efímero ─▶ Gemini
  │
  └─ WebSocket (token efímero + system_instruction) ─────────────▶ Gemini Live API
       audio PCM16 16 kHz ▶   ◀ audio PCM 24 kHz
```

El servidor solo prepara el contexto y el token. El audio viaja directo del navegador a Gemini, sin pasar por Flask. Si los tokens efímeros resultaran inviables con la versión del SDK que se use, el plan B es un proxy WebSocket en Flask (requiere `flask-sock`), documentado como alternativa, no como parte del MVP.

> Verificar en la documentación vigente de Gemini Live: nombre del modelo, versión de API que admite tokens efímeros (`v1alpha` a la fecha de escribir esto), formato exacto de los mensajes del WebSocket y si la transcripción está disponible. Los nombres de este documento son orientativos.

## Estructura (archivos de esta spec)

```
routes/ia_routes.py
services/clima.py
services/ia_contexto.py
static/js/gemini_live.js
static/css/ia.css
templates/partials/boton_ia.html
tests/test_ia.py
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
| `GET /api/ia/token` | `200 {token, model, expira_en}`, `503` sin configuración, `502` si Gemini falla, `429` por límite |

* Límite por IP con un `dict` de ventanas deslizantes en memoria (10/min). Basta para un MVP de un solo proceso.
* El token se crea con `google.genai.Client(api_key=..., http_options={"api_version": "v1alpha"}).auth_tokens.create(config={"uses": 1, "expire_time": ..., "new_session_expire_time": ...})`. Verificar contra la versión instalada de `google-genai`.
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
| `iniciarSesion()` | Contexto, token, WebSocket, mensaje de configuración con `system_instruction`. |
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
| `GET /token` | Sin clave `503`, Gemini simulado `502`, feliz sin la clave en el cuerpo, `429` tras 10 llamadas |

### `static/js/tests/gemini_live.test.js` (`node --test`)
Conversión `float32AInt16` (silencio, +1, -1, fuera de rango), ida y vuelta base64, `remuestrear` (longitud esperada de 48 kHz a 16 kHz), `siguienteEstado` (transiciones válidas e inválidas) y `construirMensajeInicial`.

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

## Lineamientos de diseño UX/UI
Esta spec sigue el prompt maestro de diseño en `.kiro/steering/diseno-ux-ui.md` y los principios de `.kiro/steering/etica-legal-sin-sesgos.md` (accesibilidad, privacidad y no sesgo). Aplican sobre todo: D (asistente de voz) y las secciones 7 a 9 y 11, usando los tokens de `styles.css` en `ia.css`. No se cambian la lógica de negocio, las APIs ni el contrato compartido. Si el diseño choca con una regla del contrato, manda el contrato.
