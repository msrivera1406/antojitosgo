# Spec 03: Agente de IA conversacional (Gemini Live API) (Integrante 3)

Contexto compartido: `.kiro/steering/antojito-contrato-compartido.md` y `AntojitoGo.md`.

## Introducción

Esta spec entrega un asistente de voz que recomienda 1 o 2 puestos del mapa según el antojo del usuario, su ubicación, la hora y el clima. El backend arma el contexto y entrega un token efímero. El navegador captura el micrófono, habla con Gemini Live por WebSocket y reproduce la respuesta.

**Pendiente:** el modelo y la API key de Gemini aún no están definidos. El diseño los toma de `GEMINI_MODEL` y `GEMINI_API_KEY`, y la parte de backend puede probarse por completo sin ellos.

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

### R3. Token efímero
**Historia:** Como equipo, queremos que la API key de Gemini nunca llegue al navegador.

1. CUANDO se envíe `GET /api/ia/token`, EL SISTEMA DEBERÁ crear con la API key del servidor un token efímero de un solo uso y de corta vida (30 minutos como máximo para el uso y 1 minuto para iniciar la sesión), y responder `{token, model, expira_en}`.
2. SI `GEMINI_API_KEY` o `GEMINI_MODEL` no están configurados, EL SISTEMA DEBERÁ responder `503` con un mensaje claro, y el frontend DEBERÁ mostrar "El asistente no está disponible por ahora".
3. SI el servicio de Gemini falla al crear el token, EL SISTEMA DEBERÁ responder `502`.
4. EL SISTEMA DEBERÁ limitar a 10 peticiones por minuto por IP en este endpoint y responder `429` al excederlo.
5. LA `GEMINI_API_KEY` NO DEBERÁ aparecer en respuestas, plantillas, logs ni en el código del cliente.

### R4. Cliente de voz
**Historia:** Como comensal, quiero hablarle al asistente y escucharlo en tiempo real.

1. EL SISTEMA DEBERÁ mostrar en `index.html` un botón flotante de micrófono (dentro de `#zona-ia`) de al menos 56 px.
2. CUANDO el usuario toque el botón, EL SISTEMA DEBERÁ: pedir permiso de micrófono, obtener ubicación (`window.AntojitoUbicacion` o `navigator.geolocation`), pedir `GET /api/ia/contexto` y `GET /api/ia/token`, abrir el WebSocket de Gemini Live con el `system_instruction`, y empezar a enviar audio.
3. EL SISTEMA DEBERÁ capturar el audio como PCM de 16 bits a 16 kHz mono y enviarlo en fragmentos, y reproducir el audio de respuesta (PCM de 24 kHz) sin cortes, en orden y con baja latencia.
4. CUANDO el usuario interrumpa al agente mientras habla, EL SISTEMA DEBERÁ detener y vaciar la reproducción pendiente.
5. EL botón DEBERÁ mostrar estados distintos y accesibles (`aria-label` y `aria-live`): **inactivo**, **conectando**, **escuchando**, **hablando** y **error**.
6. CUANDO el usuario toque el botón durante una sesión, EL SISTEMA DEBERÁ cerrarla, liberar micrófono, contexto de audio y WebSocket.
7. CUANDO la pestaña se oculte o se abandone la página, EL SISTEMA DEBERÁ cerrar la sesión.
8. SI el usuario niega el micrófono, EL SISTEMA DEBERÁ mostrar un mensaje con instrucciones para habilitarlo.
9. SI el navegador no soporta `getUserMedia`, `AudioContext` o WebSocket, o la página no está en un contexto seguro, EL SISTEMA DEBERÁ ocultar o deshabilitar el botón con una explicación.
10. SI el WebSocket se cierra con error o se pierde la red, EL SISTEMA DEBERÁ pasar a estado **error**, liberar recursos y permitir reintentar con un toque.
11. EL SISTEMA DEBERÁ ofrecer una transcripción visual breve de lo último que dijo el agente (si la API la entrega), para accesibilidad y como respaldo si el audio falla.
12. EL SISTEMA DEBERÁ cerrar la sesión tras 5 minutos de duración máxima para limitar costos.
13. CUANDO el agente mencione un puesto, EL SISTEMA DEBERÁ ofrecer una tarjeta con el enlace al puesto en el mapa o a `/puesto/<id>` si es verificado (si esto no alcanza a entrar en el tiempo del hackathon, queda como mejora marcada).

### R5. Privacidad y seguridad
1. EL SISTEMA DEBERÁ pedir permiso de micrófono solo tras el toque del usuario.
2. EL SISTEMA NO DEBERÁ grabar ni almacenar el audio ni la conversación en el servidor.
3. LOS datos que se envían a Gemini DEBERÁN limitarse a coordenadas aproximadas (redondeadas a 3 decimales en el `system_instruction`), puestos públicos y clima.
4. EL parámetro `lat` y `lng` DEBERÁN validarse y la consulta SQL DEBERÁ ser parametrizada.

### R6. Pruebas automatizadas
1. EL backend DEBERÁ tener pruebas en `tests/test_ia.py` con Open-Meteo y Gemini simulados (sin red).
2. LA lógica pura del cliente DEBERÁ estar en funciones exportables con pruebas en `static/js/tests/gemini_live.test.js` (`node --test`).
3. LA conversación real con Gemini DEBERÁ verificarse con una lista manual (ver tareas), porque no es automatizable de forma fiable.
