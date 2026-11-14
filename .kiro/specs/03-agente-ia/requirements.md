# Spec 03: Agente de IA conversacional (Gemini Live API) (Integrante 3)

Contexto compartido: `.kiro/steering/antojito-contrato-compartido.md` y `AntojitoGo.md`.

## Introducción

Esta spec entrega un asistente de voz que recomienda 1 o 2 puestos del mapa según el antojo del usuario, su ubicación, la hora y el clima, y un **chat de texto de respaldo**. El backend arma el contexto y entrega un token efímero (voz) o llama a Gemini directamente (chat). El navegador captura el micrófono, habla con Gemini Live por el **SDK JS** y reproduce la respuesta. Ambos canales tienen **modelos de respaldo** y **reconexión** para cuando un modelo esté saturado.

**Verificado (script `scripts/ia_smoke.py`):** voz con `gemini-3.8-live` y respaldos `gemini-2.5-flash-native-audio-latest` y `gemini-3.1-flash-live-preview`. Chat con `gemini-3.5-flash-lite` y respaldos `gemini-3.1-flash-lite` y `gemini-3.8-flash`. En las pruebas `gemini-2.5-flash` ya no estaba disponible para cuentas nuevas y `gemini-3.7-flash` y `gemini-3.8-flash` respondieron `503` por alta demanda, por eso hay respaldos. Un modelo que aparece en la lista de la API no garantiza que se pueda usar.

## Requisitos

### R1. Servicio de clima
**Historia:** Como asistente, quiero conocer el clima donde está el usuario, para recomendar el antojo adecuado.

1. CUANDO se solicite el clima para una `lat` y `lng`, EL SISTEMA DEBERÁ consultar Open-Meteo (`/v1/forecast` con `current=temperature_2m,precipitation,rain,weather_code`, `timezone=America/Mexico_City`) y devolver `temperatura_c`, `lluvia_mm`, `llueve` (booleano) y `descripcion` en español.
2. EL SISTEMA DEBERÁ considerar que **llueve** cuando `rain` o `precipitation` actuales sean mayores que 0, o el `weather_code` indique lluvia, llovizna o tormenta.
3. SI Open-Meteo no responde en 3 s, devuelve un error o un JSON inesperado, EL SISTEMA DEBERÁ devolver `None` sin lanzar excepción, y el contexto DEBERÁ construirse sin la sección de clima.
4. EL SISTEMA DEBERÁ guardar en caché el resultado por redondeo de coordenadas a 2 decimales durante 10 minutos, para no saturar la API.

### R2. Contexto dinámico
**Historia:** Como asistente, quiero un `system_instruction` con la ubicación, la hora, el clima y los puestos cercanos.

1. CUANDO se envíe `GET /api/ia/contexto?lat=&lng=`, EL SISTEMA DEBERÁ responder `200` con `{system_instruction, contexto}` según el contrato (ver diseño).
2. SI `lat` o `lng` faltan, EL SISTEMA DEBERÁ usar el centro de CDMX y marcar `contexto.ubicacion_por_defecto = true`.
3. SI `lat` o `lng` no son números, o están fuera de rango (lat -90 a 90, lng -180 a 180), EL SISTEMA DEBERÁ responder `400`.
4. SI las coordenadas válidas caen fuera del rectángulo de CDMX, EL SISTEMA DEBERÁ responder igualmente `200`, con una lista de puestos vacía y una indicación en el `system_instruction` de que no hay puestos cercanos.
5. EL SISTEMA DEBERÁ buscar en MySQL los puestos dentro de 3 km (fórmula de Haversine con parámetros), ordenados por distancia, máximo 10, e incluir de cada uno: `id`, `nombre`, `categoria`, `estatus`, `horario`, `distancia_m`, y para los `verificado` hasta 5 productos disponibles con `nombre` y `precio`.
6. EL SISTEMA DEBERÁ calcular la fecha y hora actuales en la zona `America/Mexico_City`, y la franja del día (mañana, mediodía, tarde/noche) según el contrato compartido.
7. EL `system_instruction` DEBERÁ indicar al agente que: habla en español mexicano, es breve y cálido, recomienda **1 o 2** puestos **únicamente de la lista**, explica el porqué (antojo, clima, hora, distancia), distingue los verificados (que permiten pedir pick-up) de las recomendaciones de la comunidad (pendientes de verificar), no inventa puestos, precios ni horarios, y pregunta qué se le antoja si el usuario no lo ha dicho.
8. EL `system_instruction` DEBERÁ incluir las reglas de clima y hora: si llueve o la temperatura es menor a 16 °C, sugerir bebidas calientes, caldos o pan dulce; si es mayor a 25 °C, aguas frescas, nieves o fruta; por la mañana tamales, atole y chilaquiles; a mediodía tortas y tacos; por la tarde y noche esquites, elotes y tacos. LAS reglas de clima aplican solo si hay datos de clima.
9. CUANDO no haya puestos cercanos, EL `system_instruction` DEBERÁ decirle al agente que lo reconozca con honestidad y sugiera al usuario recomendar un puesto nuevo en la app.
10. EL texto de nombres y descripciones de puestos que se inserte en el `system_instruction` DEBERÁ sanitizarse (sin saltos de línea ni instrucciones inyectadas, longitud acotada) porque proviene de usuarios.

### R3. Token efímero con modelos de respaldo
**Historia:** Como equipo, queremos que la API key de Gemini nunca llegue al navegador y que la voz siga funcionando si un modelo está saturado.

1. CUANDO se envíe `GET /api/ia/token?lat=&lng=&excluir=`, EL SISTEMA DEBERÁ validar `lat` y `lng` como en R2, construir el contexto y el `system_instruction`, y crear con la API key del servidor un token efímero de un solo uso (30 minutos de vigencia y 1 minuto para iniciar la sesión) con `live_connect_constraints` que **bloqueen el modelo, la modalidad de audio y el `system_instruction`**. DEBERÁ responder `{token, model, expira_en, modelos_restantes}`, donde `token` es el valor `name` del token.
2. EL modelo DEBERÁ ser el primero de la lista `[GEMINI_MODEL, *GEMINI_MODEL_FALLBACKS]` que no esté en `excluir` (lista separada por comas). LOS valores de `excluir` que no pertenezcan a la lista configurada DEBERÁN ignorarse.
3. SI todos los modelos están excluidos, EL SISTEMA DEBERÁ responder `503` con `{error, codigo: "modelos_agotados"}`.
4. SI `GEMINI_API_KEY` o `GEMINI_MODEL` no están configurados, EL SISTEMA DEBERÁ responder `503` con `codigo: "no_configurado"`, y el frontend DEBERÁ ofrecer el chat de texto o un mensaje claro.
5. SI Gemini falla al crear el token (`429`, `5xx`, tiempo agotado), EL SISTEMA DEBERÁ reintentar una vez tras 0,5 s y, si persiste, responder `502`.
6. EL SISTEMA DEBERÁ limitar a 10 peticiones por minuto por IP en este endpoint y responder `429` al excederlo.
7. LA `GEMINI_API_KEY` NO DEBERÁ aparecer en respuestas, plantillas, logs ni en el código del cliente.

### R4. Cliente de voz
**Historia:** Como comensal, quiero hablarle al asistente y escucharlo en tiempo real.

1. EL SISTEMA DEBERÁ mostrar en `index.html` un botón flotante de micrófono (dentro de `#zona-ia`) de al menos 56 px.
2. CUANDO el usuario toque el botón, EL SISTEMA DEBERÁ: pedir permiso de micrófono, obtener ubicación (`window.AntojitoUbicacion` o `navigator.geolocation`), pedir `GET /api/ia/token?lat=&lng=`, conectar con el SDK JS de Gemini (`ai.live.connect`) usando el token, y empezar a enviar audio.
3. EL SISTEMA DEBERÁ capturar el audio como PCM de 16 bits a 16 kHz mono y enviarlo en fragmentos, y reproducir el audio de respuesta (PCM de 24 kHz) sin cortes, en orden y con baja latencia.
4. CUANDO el usuario interrumpa al agente mientras habla, EL SISTEMA DEBERÁ detener y vaciar la reproducción pendiente.
5. EL botón DEBERÁ mostrar estados distintos y accesibles (`aria-label` y `aria-live`): **inactivo**, **conectando**, **escuchando**, **hablando** y **error**.
6. CUANDO el usuario toque el botón durante una sesión, EL SISTEMA DEBERÁ cerrarla, liberar micrófono, contexto de audio y WebSocket.
7. CUANDO la pestaña se oculte o se abandone la página, EL SISTEMA DEBERÁ cerrar la sesión.
8. SI el usuario niega el micrófono, EL SISTEMA DEBERÁ mostrar un mensaje con instrucciones para habilitarlo.
9. SI el navegador no soporta `getUserMedia`, `AudioContext` o WebSocket, o la página no está en un contexto seguro, EL SISTEMA DEBERÁ ocultar o deshabilitar el botón con una explicación.
10. SI la sesión se cierra con error o se pierde la red, EL SISTEMA DEBERÁ aplicar el protocolo de reconexión de R8.
11. EL SISTEMA DEBERÁ ofrecer una transcripción visual breve de lo último que dijo el agente (si la API la entrega), para accesibilidad y como respaldo si el audio falla.
12. EL SISTEMA DEBERÁ cerrar la sesión tras 5 minutos de duración máxima para limitar costos.
13. CUANDO el agente mencione un puesto, EL SISTEMA DEBERÁ ofrecer una tarjeta con el enlace al puesto en el mapa o a `/puesto/<id>` si es verificado (si esto no alcanza a entrar en el tiempo del hackathon, queda como mejora marcada).

### R5. Privacidad y seguridad
1. EL SISTEMA DEBERÁ pedir permiso de micrófono solo tras el toque del usuario.
2. EL SISTEMA NO DEBERÁ grabar ni almacenar el audio ni la conversación en el servidor.
3. LOS datos que se envían a Gemini DEBERÁN limitarse a coordenadas aproximadas (redondeadas a 3 decimales en el `system_instruction`), puestos públicos y clima.
4. EL parámetro `lat` y `lng` DEBERÁN validarse y la consulta SQL DEBERÁ ser parametrizada.

### R6. Pruebas automatizadas
1. EL backend DEBERÁ tener pruebas en `tests/test_ia.py` con Open-Meteo y Gemini simulados (sin red), incluidos la selección de modelo de respaldo, el reintento del chat y todos sus errores.
2. LA lógica pura del cliente (incluidos `clasificarError`, `calcularEspera` y el planificador de reintentos con reloj simulado) DEBERÁ estar en funciones exportables con pruebas en `static/js/tests/gemini_live.test.js` (`node --test`).
3. LA conversación real con Gemini DEBERÁ verificarse con una lista manual (ver tareas), porque no es automatizable de forma fiable.

### R7. Chat de texto de respaldo
**Historia:** Como comensal, quiero poder escribirle al asistente cuando no puedo o no quiero hablar.

1. EL SISTEMA DEBERÁ ofrecer, dentro de `#zona-ia`, un botón "Escribir" que abre un panel de chat con burbujas de conversación, campo de texto y botón de enviar (también con Enter).
2. EL panel de chat DEBERÁ abrirse automáticamente cuando el micrófono esté denegado o no soportado, no haya contexto seguro, o se agoten los modelos de voz (R8.7).
3. CUANDO se envíe `POST /api/ia/chat` con `{mensaje, lat, lng, historial}`, EL SISTEMA DEBERÁ responder `{respuesta, modelo}`. EL `mensaje` DEBERÁ tener entre 1 y 500 caracteres. EL `historial` DEBERÁ tener como máximo 10 entradas `{rol: "usuario"|"asistente", texto}` de hasta 1000 caracteres. Un cuerpo inválido DEBERÁ responder `400`.
4. EL SISTEMA DEBERÁ usar el mismo `system_instruction` que la voz (ubicación, hora, clima y puestos cercanos), con la regla adicional de responder en texto breve. LOS mensajes del usuario DEBERÁN enviarse como turnos de usuario, **nunca** concatenados al `system_instruction`.
5. EL SISTEMA DEBERÁ probar `GEMINI_CHAT_MODEL` y después cada modelo de `GEMINI_CHAT_MODEL_FALLBACKS`. POR cada modelo, hasta 2 intentos con espera de 0,5 s y 1 s (con variación aleatoria de ±25 %), un tiempo máximo de 12 s por llamada y 20 s en total.
6. SON reintentables los errores `429`, `500`, `503`, `504` y los tiempos agotados. UN `404` (modelo no disponible) DEBERÁ saltar de inmediato al siguiente modelo. UN `400`, `401` o `403` DEBERÁ detener el proceso y responder `502` (problema de configuración, no de saturación).
7. SI todos los modelos fallan, EL SISTEMA DEBERÁ responder `503` con "El asistente está ocupado, intenta en un momento".
8. EL SISTEMA DEBERÁ limitar `POST /api/ia/chat` a 20 peticiones por minuto por IP (`429`).
9. EL SISTEMA NO DEBERÁ guardar los mensajes ni las respuestas.
10. LA interfaz DEBERÁ pintar los textos con `textContent`, mostrar "escribiendo…" mientras espera, bloquear envíos dobles, usar `aria-live="polite"` y ofrecer "Reintentar" ante un error.
11. LA respuesta DEBERÁ conservar el historial en memoria de la página (no en `localStorage`).

### R8. Resiliencia de la voz: reintentos, reconexión y modelos de respaldo
**Historia:** Como comensal, quiero que el asistente se reconecte solo si el servicio está ocupado.

1. EL SISTEMA DEBERÁ clasificar cada fallo de conexión en una de tres categorías (`clasificarError`): **reintentable** (cierre `1006`, `1011`, `1013`, mensajes con `UNAVAILABLE`, `RESOURCE_EXHAUSTED`, `overloaded`, `503`, `429`, tiempo agotado), **cambiar de modelo** (`404`, `NOT_FOUND`, modelo no disponible) y **fatal** (`401`, `403`, `PERMISSION_DENIED`, `INVALID_ARGUMENT`, micrófono denegado).
2. ANTE un fallo reintentable, EL SISTEMA DEBERÁ reintentar hasta 3 veces por modelo con espera exponencial de 1 s, 2 s y 4 s, variación aleatoria de ±25 % y tope de 8 s, mostrando el estado "Reconectando…".
3. CADA reintento DEBERÁ pedir un token nuevo (`GET /api/ia/token`).
4. AGOTADOS los reintentos de un modelo, EL SISTEMA DEBERÁ pedir un token con `excluir=<modelos fallidos>` y continuar con el siguiente modelo, reiniciando el contador de intentos.
5. ANTE un fallo de tipo "cambiar de modelo", EL SISTEMA DEBERÁ pasar de inmediato al siguiente sin reintentar.
6. ANTE un fallo fatal, EL SISTEMA NO DEBERÁ reintentar y DEBERÁ mostrar un mensaje claro.
7. SI se agotan todos los modelos, EL SISTEMA DEBERÁ pasar al estado **error**, mostrar "El asistente de voz está muy ocupado" y abrir el chat de texto (R7.2).
8. SI la sesión se cae a mitad de una conversación, EL SISTEMA DEBERÁ reconectar con la reanudación de sesión (`sessionResumption`) usando el último identificador recibido, sin perder el hilo. SI no hay identificador o la reanudación falla, DEBERÁ abrir una sesión nueva y avisar "Se reinició la conversación".
9. CUANDO el servidor avise que cerrará la sesión (`goAway`), EL SISTEMA DEBERÁ reconectar de forma proactiva.
10. EL tiempo total de reconexión DEBERÁ limitarse a 30 s. DESPUÉS DEBERÁ pasar a error.
11. EL usuario DEBERÁ poder cancelar durante la reconexión tocando el botón, y se DEBERÁN limpiar los temporizadores.
12. EL SISTEMA NO DEBERÁ entrar nunca en un bucle infinito de reintentos.
13. EL modelo en uso DEBERÁ exponerse en `data-modelo` del botón para depuración y registrarse con `console.info`.