# Spec 02: Frontend Mobile-First y Mapa interactivo (Integrante 2)

Contexto compartido: `.kiro/steering/antojito-contrato-compartido.md` y `AntojitoGo.md`.

## Introducción

Esta spec cubre la estructura visual base (layout, estilos, cliente de API compartido), la pantalla principal con el mapa, los filtros, el formulario para recomendar puestos y la pantalla de acceso. Las demás specs construyen sus páginas sobre `base.html`, `api.js` y `styles.css`, por lo que esas piezas se entregan primero.

## Requisitos

### R1. Base compartida Mobile-First
**Historia:** Como integrante del equipo, quiero un layout y utilidades comunes, para que todas las pantallas se vean y se comporten igual.

1. EL SISTEMA DEBERÁ ofrecer `templates/base.html` con `<meta name="viewport" content="width=device-width, initial-scale=1">`, `lang="es"`, barra de navegación inferior o superior y los bloques `head`, `content` y `scripts`.
2. LA barra de navegación DEBERÁ mostrar: Mapa, Perfil (si hay sesión), "Mi puesto" (solo `locatario` o `admin`) y Entrar o Salir.
3. EL SISTEMA DEBERÁ ofrecer `static/js/api.js` con `apiFetch(url, opciones)` que: envía y recibe JSON, incluye cookies (`credentials: 'same-origin'`), lanza un `ApiError {status, mensaje}` con el campo `error` de la respuesta y, ante un `401`, permite al llamador redirigir a `/login?next=<ruta>`.
4. EL SISTEMA DEBERÁ ofrecer `static/js/auth.js` con `obtenerUsuario()` (usa `GET /api/auth/me`, guarda en memoria el resultado) y `cerrarSesion()`.
5. `styles.css` DEBERÁ definir variables CSS (colores, espaciado, radios), tipografía legible, botones, formularios, tarjetas, mensajes de error y de éxito, y un estado de carga reutilizables.
6. TODOS los elementos interactivos DEBERÁN medir al menos 44×44 px y tener contraste de texto suficiente (WCAG AA).
7. EL diseño DEBERÁ funcionar sin desplazamiento horizontal desde 320 px de ancho.

### R2. Mapa con geolocalización
**Historia:** Como comensal, quiero ver el mapa centrado donde estoy, para encontrar puestos cerca.

1. CUANDO se abra `/`, EL SISTEMA DEBERÁ mostrar un mapa Leaflet con tiles de OpenStreetMap que ocupe el espacio disponible entre la cabecera y la navegación.
2. CUANDO el navegador conceda la ubicación, EL SISTEMA DEBERÁ centrar el mapa en la posición del usuario (zoom 16) y mostrar un marcador distinto para "Tú estás aquí".
3. SI el usuario niega el permiso, o la geolocalización falla o tarda más de 8 s, EL SISTEMA DEBERÁ centrar el mapa en el centro de CDMX (`19.4326, -99.1332`, zoom 13) y mostrar un aviso breve y no bloqueante.
4. EL SISTEMA DEBERÁ ofrecer un botón "Centrar en mi ubicación".
5. EL SISTEMA DEBERÁ guardar la última posición conocida del usuario y exponerla (`window.AntojitoUbicacion = {lat, lng}`) para que la use el asistente de voz (spec 03).
6. EL SISTEMA DEBERÁ incluir la atribución de OpenStreetMap exigida.

### R3. Pines diferenciados
**Historia:** Como comensal, quiero distinguir de un vistazo qué puestos están verificados.

1. CUANDO cargue el mapa, EL SISTEMA DEBERÁ pedir `GET /api/puestos` y dibujar un pin por puesto.
2. LOS pines `verificado` DEBERÁN verse en dorado o verde, y los `recomendado` en azul o naranja, distinguibles también por forma o ícono (no solo por color).
3. CUANDO el usuario toque un pin, EL SISTEMA DEBERÁ abrir una tarjeta con nombre, categoría, horario, foto si existe y descripción.
4. SI el puesto es `recomendado`, la tarjeta DEBERÁ mostrar la etiqueta "Recomendación de la comunidad. Pendiente de verificación" y NO DEBERÁ mostrar botón de pedido.
5. SI el puesto es `verificado`, la tarjeta DEBERÁ mostrar el botón "Ver menú y pedir" que lleva a `/puesto/<id>`.
6. EL texto del puesto DEBERÁ insertarse con `textContent` o escaparse, nunca como HTML crudo.
7. SI la petición de puestos falla, EL SISTEMA DEBERÁ mostrar un mensaje de error con opción "Reintentar".

### R4. Filtros y búsqueda
1. EL SISTEMA DEBERÁ ofrecer chips de categoría (`chilaquiles`, `esquites`, `tacos`, `tamales`, `tortas`, `postres`, `bebidas`, más "Todas") y un selector de estatus (`todos`, `verificados`, `recomendados`).
2. EL SISTEMA DEBERÁ ofrecer una barra de búsqueda por texto que compare con nombre, descripción y categoría sin distinguir mayúsculas ni acentos.
3. CUANDO cambie un filtro o el texto, EL SISTEMA DEBERÁ actualizar los pines al instante, sin recargar la página y sin nuevas peticiones (filtrado en el cliente sobre la lista ya cargada).
4. CUANDO ningún puesto coincida, EL SISTEMA DEBERÁ mostrar "No encontramos puestos con esos filtros" y un botón para limpiar filtros.
5. EL SISTEMA DEBERÁ mostrar cuántos puestos coinciden.

### R5. Recomendar un puesto
**Historia:** Como comensal, quiero sugerir un puesto que conozco, para ayudar a la comunidad y ganar puntos.

1. CUANDO un usuario sin sesión abra `/recomendar`, EL SISTEMA DEBERÁ redirigir a `/login?next=/recomendar`.
2. EL formulario DEBERÁ pedir: nombre, categoría (lista de `GET /api/puestos/categorias`), ubicación y reseña breve (hasta 500 caracteres, con contador), y foto opcional.
3. EL SISTEMA DEBERÁ mostrar un mapa donde un toque coloca o mueve un pin y rellena latitud y longitud, y DEBERÁ centrarse en la ubicación del usuario cuando esté disponible.
4. EL SISTEMA DEBERÁ validar en el cliente antes de enviar: nombre no vacío (máx. 120), categoría elegida, pin colocado, foto de tipo JPG/PNG/WebP y de máx. 5 MB, y mostrar el error junto al campo.
5. CUANDO el formulario sea válido, EL SISTEMA DEBERÁ enviar `POST /api/puestos/recomendar` como `multipart/form-data`, deshabilitar el botón mientras espera y evitar envíos dobles.
6. CUANDO la respuesta sea `201`, EL SISTEMA DEBERÁ mostrar "¡Ganaste 50 puntos Antojito!" con el total. SI `cupon_ganado` no es `null`, DEBERÁ mostrar además el cupón (código, monto y vigencia) como celebración. EN caso contrario, DEBERÁ mostrar un mensaje corto sobre el progreso hacia el siguiente cupón (por ejemplo "Llevas 2 de 5 recomendaciones"). DEBERÁ ofrecer volver al mapa, donde el nuevo puesto aparece como recomendado.
7. SI el servidor responde con error, EL SISTEMA DEBERÁ mostrar el mensaje devuelto y conservar lo que el usuario escribió.
8. CUANDO la respuesta sea `401`, EL SISTEMA DEBERÁ redirigir al login con `next`.

### R6. Acceso (login y registro)
1. EL SISTEMA DEBERÁ ofrecer `/login` con dos pestañas: "Entrar" (email y contraseña) y "Crear cuenta" (nombre, email, contraseña, y selección "Soy comensal" o "Tengo un puesto").
2. EL SISTEMA DEBERÁ validar en el cliente email con formato válido y contraseña de al menos 8 caracteres.
3. CUANDO el acceso sea exitoso, EL SISTEMA DEBERÁ redirigir a `next` si es una ruta interna del mismo sitio (empieza con `/` y no con `//`), y si no, a `/`. Un `locatario` sin `next` DEBERÁ ir a `/locatario`.
4. SI hay error (`401`, `409`, `400`), EL SISTEMA DEBERÁ mostrar el mensaje del servidor sin borrar el email.

### R7. Integración con la IA
1. `index.html` DEBERÁ incluir `{% include 'partials/boton_ia.html' %}` y cargar `gemini_live.js` como módulo ES (`type="module"`). Hasta que la spec 03 entregue el parcial, EL SISTEMA DEBERÁ funcionar sin él (usar `{% include ... ignore missing %}`).
2. EL SISTEMA DEBERÁ dejar libre la esquina inferior derecha del mapa, por encima de la navegación, para el botón flotante.

### R8. Pruebas automatizadas
1. LA lógica pura (`filtrarPuestos`, `normalizarTexto`, `validarRecomendacion`, `validarAcceso`, `esRutaInternaSegura`) DEBERÁ estar en funciones exportables con pruebas en `static/js/tests/map.test.js` ejecutables con `node --test`.
2. LAS pruebas DEBERÁN cubrir combinaciones de filtros, acentos, listas vacías, entradas inválidas y redirecciones inseguras (`//evil.com`, `http://...`).
3. EL equipo DEBERÁ ejecutar una lista de verificación manual en un celular real (ver tareas).
