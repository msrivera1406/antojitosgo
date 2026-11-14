# Plan de tareas: Agente de IA (Integrante 3)

Rama de trabajo: `feat/int3-ia`. Pruebas del backend: `docker compose run --rm --no-deps web pytest tests/test_ia.py` (con `docker compose up -d db` activo).

## Fase 0: Preparación

- [x] 0. Clave de Gemini, elección de modelos y verificación con `scripts/ia_smoke.py`
  - Voz: `gemini-3.8-live` (principal), `gemini-2.5-flash-native-audio-latest` y `gemini-3.1-flash-live-preview` (respaldos). El token efímero con modelo, audio e instrucciones bloqueados funciona con `v1beta`.
  - Chat: `gemini-3.5-flash-lite` (principal), `gemini-3.1-flash-lite` y `gemini-3.8-flash` (respaldos). `gemini-2.5-flash` ya no está disponible para cuentas nuevas.
  - Variables en `.env` y `.env.example`, y lectura en `config.py`.
  - _Requisitos: R3, R7, R8_
- [x] 0.1 Verificado: el cliente puede omitir `system_instruction` al conectar; el token ya lo trae bloqueado y se aplica (el agente respondió con las instrucciones del token)
  - _Requisitos: R3.1_

## Fase 1: Backend

- [x] 1. Servicio de clima (`services/clima.py`)
  - [x] 1.1 `interpretar_weather_code` y `obtener_clima` con timeout de 3 s y retorno `None` ante fallos
  - [x] 1.2 Caché de 10 min por coordenadas redondeadas
  - [x] 1.3 Pruebas en `tests/test_ia.py` (feliz, timeout, 500, JSON inválido, caché y expiración, códigos WMO)
  - _Requisitos: R1, R9.1_
- [x] 2. Lógica de contexto (`services/ia_contexto.py`)
  - [x] 2.1 `validar_coordenadas`, `franja_del_dia`, `sugerencia_por_hora`, `sugerencia_por_clima`
  - [x] 2.2 `sanitizar_texto`
  - [x] 2.3 `construir_system_instruction` (reglas de R2.7 a R2.9, canal voz o texto)
  - [x] 2.4 Pruebas de franjas en los bordes, sugerencias, sanitización, inyección y contenido del texto
  - _Requisitos: R2.2 a R2.10_
- [x] 3. Puestos cercanos
  - [x] 3.1 `buscar_puestos_cercanos` con Haversine parametrizada, pre-filtro por caja y productos de verificados
  - [x] 3.2 `construir_contexto` (fuera de CDMX no consulta puestos)
  - [x] 3.3 Pruebas contra MySQL real (`antojito_test_ia`, se omiten si no hay BD)
  - _Requisitos: R2.4, R2.5, R5.4_
- [x] 4. Límite por IP y selección de modelos
  - [x] 4.1 `services/limitador.py` (ventana deslizante, reloj inyectable) y sus pruebas
  - [x] 4.2 `services/gemini_token.py`: `modelos_voz`, `elegir_modelo(excluir)`, `crear_token` con 1 reintento y sus pruebas
  - _Requisitos: R3.2, R3.3, R3.5, R3.6_
- [x] 5. Chat de texto con respaldos (`services/gemini_chat.py`)
  - [x] 5.1 `generar_respuesta` con reintentos por modelo, espera con variación, límites de 12 s y 20 s, y clasificación de errores
  - [x] 5.2 Pruebas con cliente simulado y reloj inyectado (sin esperas reales)
  - _Requisitos: R7.3 a R7.7_
- [x] 6. Rutas (`routes/ia_routes.py`)
  - [x] 6.1 `GET /api/ia/contexto` con validación y ubicación por defecto
  - [x] 6.2 `GET /api/ia/token` con `excluir`, límite y errores `503`, `502`, `429`
  - [x] 6.3 `POST /api/ia/chat` con validación del cuerpo y límite
  - [x] 6.4 Pruebas de las tres rutas con Gemini y Open-Meteo simulados
  - _Requisitos: R2.1 a R2.4, R3, R7, R9.1_

## Fase 2: Cliente

- [x] 7. Lógica pura (`static/js/audio_utils.js`) con pruebas
  - [x] 7.1 `float32AInt16`, `int16ABase64`, `base64AInt16`, `remuestrear`
  - [x] 7.2 `clasificarError`, `calcularEspera`, `orquestarConexion` (reloj y espera inyectados)
  - [x] 7.3 `siguienteEstado` y `construirMensajeInicial`
  - [x] 7.4 `static/js/tests/gemini_live.test.js` ejecutado con `node --test`
  - _Requisitos: R8, R9.2_
- [x] 8. Interfaz (`partials/boton_ia.html` y `ia.css`)
  - [x] 8.1 Botón flotante con estados (incluye `reconectando`), transcripción y `aria-live`
  - [x] 8.2 Panel de chat con burbujas, indicador "escribiendo…" y reintento
  - _Requisitos: R4.1, R4.5, R4.11, R7.1, R7.10_
- [x] 9. Sesión de voz (`static/js/gemini_live.js`, módulo ES con el SDK de Gemini)
  - [x] 9.1 `soportaVoz()` y manejo de falta de soporte o de contexto seguro
  - [x] 9.2 Ubicación, token y conexión con `ai.live.connect`
  - [x] 9.3 Captura del micrófono (`AudioWorklet` con respaldo), remuestreo a 16 kHz y envío
  - [x] 9.4 Reproducción en cola a 24 kHz y vaciado al interrumpir
  - [x] 9.5 Reintentos, cambio de modelo con `excluir` y reconexión con sesión nueva ante una caída (la reanudación no conservó el contexto)
  - [x] 9.6 `cerrarSesion()` idempotente, cierre al ocultar la pestaña, límite de 5 min y de 30 s de reconexión
  - [x] 9.7 Apertura automática del chat ante micrófono denegado, sin soporte o modelos agotados
  - _Requisitos: R4, R5, R7.2, R8_
- [x] 10. Chat de texto en el cliente (envío, historial en memoria y errores)
  - _Requisitos: R7_

## Fase 3: Integración y verificación

- [x] 11. Integración con `index.html`: el parcial es autocontenido (carga su CSS y su módulo); `index.html` solo necesita el `include`. Pendiente confirmar con Int. 2 que `#zona-ia` no tapa controles del mapa (Int. 2): confirmar el `include` del parcial, el `<script type="module">` y que `#zona-ia` no tapa controles del mapa
  - _Requisitos: R4.1_
- [ ] 12. Verificación manual con la API real (ya automatizado en Chrome real con micrófono falso: `scripts/ia_browser_test.mjs`; falta probar con micrófono y altavoz reales y en móvil)
  - [ ] Pregunta "¿qué me recomiendas con este frío?" y comprobar que recomienda de la lista
  - [ ] Interrumpir al agente a media frase y comprobar que se calla
  - [ ] Forzar fallo del modelo principal (cambiar `GEMINI_MODEL` a un nombre falso) y comprobar el cambio al respaldo
  - [ ] Apagar el Wi-Fi a media sesión y comprobar la reconexión y luego el estado de error con el chat abierto
  - [ ] Denegar micrófono y comprobar que se abre el chat
  - [ ] Chat de texto con el modelo principal y con un principal falso
  - [ ] Chrome Android y Safari iOS por HTTPS
  - _Requisitos: R4, R7, R8, R9.3_
- [ ] 13. Mejora opcional: tarjeta con enlace al puesto mencionado por el agente
  - _Requisitos: R4.13_
- [ ] 14. Punto de control: `pytest tests/test_ia.py` y `node --test static/js/tests/gemini_live.test.js` pasan, y `git grep` no encuentra la clave de Gemini en ningún archivo versionado
  - _Requisitos: R3.7, R9_

## Dependencias con otras specs

* **Recibe de Int. 1:** `db_cursor`, `conftest.py` (mientras tanto `tests/test_ia.py` usa su propia BD de pruebas), blueprint `ia` vacío y datos semilla. Una línea en `requirements.txt` (`tzdata`) y las variables `GEMINI_*` en `config.py` y `.env.example`, ya agregadas.
* **Recibe de Int. 2:** `base.html`, `api.js`, `window.AntojitoUbicacion` y `#zona-ia`.
* **Entrega:** `partials/boton_ia.html`, `gemini_live.js`, `audio_utils.js`, `ia.css` y las tres rutas de `/api/ia/`.
* **Con Int. 4:** el enlace a `/puesto/<id>` de un puesto verificado (opcional).
