# Plan de tareas: Agente de IA (Integrante 3)

Hasta que Int. 1 entregue la Fase 0, se puede trabajar con funciones puras y pruebas que no necesitan la BD (tareas 1, 2 y 6).

## Fase 0: Preparación

- [ ] 0. Conseguir la API key de Gemini, elegir el modelo con Live API y token efímero, y probar un "hola" mínimo en un script aparte. Anotar en `.env` local (`GEMINI_API_KEY`, `GEMINI_MODEL`). Confirmar los nombres de los mensajes del WebSocket y el formato de los tokens efímeros.
  - _Requisitos: R3, riesgos del diseño_

## Fase 1: Backend

- [ ] 1. Servicio de clima (`services/clima.py`)
  - [ ] 1.1 `interpretar_weather_code` y `obtener_clima` con timeout de 3 s y retorno `None` ante fallos
  - [ ] 1.2 Caché de 10 min por coordenadas redondeadas
  - [ ] 1.3 Pruebas en `tests/test_ia.py` (feliz, timeout, 500, JSON inválido, caché, códigos WMO)
  - _Requisitos: R1, R6.1_
- [ ] 2. Lógica de contexto (`services/ia_contexto.py`)
  - [ ] 2.1 `franja_del_dia`, `sugerencia_por_hora`, `sugerencia_por_clima`
  - [ ] 2.2 `sanitizar_texto`
  - [ ] 2.3 `construir_system_instruction` (todas las reglas de R2.7 a R2.9)
  - [ ] 2.4 Pruebas de franjas en los bordes, sugerencias, sanitización y contenido del texto generado
  - _Requisitos: R2.6 a R2.10_
- [ ] 3. Puestos cercanos
  - [ ] 3.1 `buscar_puestos_cercanos` con Haversine parametrizada, pre-filtro por caja y productos de verificados
  - [ ] 3.2 Pruebas con puestos semilla a distintas distancias (usa `conftest.py` de Int. 1)
  - _Requisitos: R2.5, R5.4_
- [ ] 4. Rutas (`routes/ia_routes.py`)
  - [ ] 4.1 `GET /api/ia/contexto` con validación de coordenadas y manejo de ubicación por defecto
  - [ ] 4.2 `GET /api/ia/token` con límite por IP y errores `503`, `502`, `429`
  - [ ] 4.3 Pruebas de ambas rutas con Open-Meteo y Gemini simulados
  - _Requisitos: R2.1 a R2.4, R3, R6.1_

## Fase 2: Cliente de voz

- [ ] 5. Interfaz
  - [ ] 5.1 `templates/partials/boton_ia.html` y `static/css/ia.css` con estados, animaciones y `prefers-reduced-motion`
  - [ ] 5.2 Mensajes de estado y transcripción corta con `aria-live`
  - _Requisitos: R4.1, R4.5, R4.11_
- [ ] 6. Funciones puras de audio y estado con pruebas
  - [ ] 6.1 `float32AInt16`, `int16ABase64`, `base64AInt16`, `remuestrear`
  - [ ] 6.2 `siguienteEstado` y `construirMensajeInicial`
  - [ ] 6.3 `static/js/tests/gemini_live.test.js` ejecutado con `node --test`
  - _Requisitos: R6.2_
- [ ] 7. Sesión en vivo (`static/js/gemini_live.js`)
  - [ ] 7.1 `soportaVoz()` y manejo de falta de soporte o de contexto seguro
  - [ ] 7.2 Obtención de ubicación, contexto y token
  - [ ] 7.3 Captura del micrófono con `AudioWorklet` (y respaldo), remuestreo a 16 kHz y envío por WebSocket
  - [ ] 7.4 Reproducción en cola a 24 kHz y vaciado al interrumpir
  - [ ] 7.5 `cerrarSesion()` idempotente, cierre al ocultar la pestaña y límite de 5 min
  - [ ] 7.6 Manejo de errores y reintento
  - _Requisitos: R4, R5_

## Fase 3: Integración y verificación

- [ ] 8. Integración con `index.html` (Int. 2): confirmar la línea `include` y que `#zona-ia` no tapa controles del mapa
  - _Requisitos: R4.1_
- [ ] 9. Verificación manual con la API real (lista del diseño), incluidos Chrome Android y Safari iOS por HTTPS
  - _Requisitos: R4, R6.3_
- [ ] 10. Mejora opcional: tarjeta con enlace al puesto mencionado por el agente
  - _Requisitos: R4.13_
- [ ] 11. Punto de control: `pytest tests/test_ia.py` y `node --test static/js/tests/gemini_live.test.js` pasan, y `GEMINI_API_KEY` no aparece en ningún archivo versionado (`git grep`)
  - _Requisitos: R3.5, R6_

## Dependencias con otras specs
* **Recibe de Int. 1:** `db_cursor`, `conftest.py`, blueprint `ia` vacío y datos semilla. Variables `GEMINI_*` en `config.py` y `.env.example` (Int. 1 las deja declaradas desde la Fase 0).
* **Recibe de Int. 2:** `base.html`, `api.js`, `window.AntojitoUbicacion` y `#zona-ia`.
* **Entrega:** `partials/boton_ia.html`, `gemini_live.js` y `ia.css`.
* **Con Int. 4:** el enlace a `/puesto/<id>` de un puesto verificado (opcional).
