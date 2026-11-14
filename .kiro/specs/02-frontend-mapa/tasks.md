# Plan de tareas: Frontend Mobile-First y Mapa (Integrante 2)

## Fase 0: Desbloqueo (primeros ~30 min)

- [ ] 1. Base compartida
  - [ ] 1.1 `templates/base.html` con viewport, bloques y navegación
  - [ ] 1.2 `static/css/styles.css`: variables, tipografía, botones, formularios, tarjetas, mensajes, estado de carga
  - [ ] 1.3 `static/js/api.js` (`apiFetch`, `ApiError`)
  - [ ] 1.4 `static/js/auth.js` (`obtenerUsuario`, `cerrarSesion`) y lógica de la navegación por rol
  - [ ] 1.5 Avisar al equipo: "base frontend lista" (los demás ya pueden extender `base.html`)
  - _Requisitos: R1_

## Fase 1: Lógica pura con pruebas

- [ ] 2. Funciones puras y sus pruebas
  - [ ] 2.1 `normalizarTexto` y `filtrarPuestos`
  - [ ] 2.2 `validarRecomendacion`
  - [ ] 2.3 `validarAcceso`, `esRutaInternaSegura` y `destinoTrasLogin`
  - [ ] 2.4 `static/js/tests/map.test.js` con todos los casos del diseño, ejecutado con `node --test`
  - _Requisitos: R4, R5.4, R6.2, R6.3, R8_

## Fase 2: Pantallas

- [ ] 3. Mapa principal (`index.html` + `map.js`)
  - [ ] 3.1 Inicializar Leaflet con tiles OSM y atribución
  - [ ] 3.2 Geolocalización con timeout de 8 s, fallback a CDMX, marcador "Tú estás aquí", botón "Centrar", y `window.AntojitoUbicacion`
  - [ ] 3.3 Cargar `GET /api/puestos` (si el backend aún no está listo, usar un JSON de ejemplo local en `static/js/mock_puestos.json` y quitarlo al integrar)
  - [ ] 3.4 Pines `verificado` y `recomendado` con `divIcon` y tarjetas con `textContent`
  - [ ] 3.5 Estados de error y de carga con "Reintentar"
  - _Requisitos: R2, R3_
- [ ] 4. Filtros y búsqueda
  - [ ] 4.1 Chips de categoría y selector de estatus
  - [ ] 4.2 Barra de búsqueda con filtrado instantáneo y contador
  - [ ] 4.3 Estado vacío con "Limpiar filtros"
  - _Requisitos: R4_
- [ ] 5. Acceso (`login.html` + `auth.js`)
  - [ ] 5.1 Pestañas Entrar y Crear cuenta con validación
  - [ ] 5.2 Redirección con `next` segura y destino por rol
  - [ ] 5.3 Mensajes de error del servidor
  - _Requisitos: R6_
- [ ] 6. Recomendar puesto (`recomendar.html`)
  - [ ] 6.1 Redirección si no hay sesión
  - [ ] 6.2 Mapa con pin que se coloca y arrastra, y rellena latitud y longitud
  - [ ] 6.3 Formulario con contador de caracteres, vista previa de foto y validación por campo
  - [ ] 6.4 Envío `multipart` con bloqueo de doble envío, pantalla de "+50 puntos" (con el cupón ganado si lo hay) y vuelta al mapa
  - [ ] 6.5 Manejo de `400` y `401`
  - _Requisitos: R5_

## Fase 3: Integración

- [ ] 7. Integrar con el backend real (quitar mocks) y con la spec 03: `{% include 'partials/boton_ia.html' ignore missing %}`, y verificar que `#zona-ia` queda libre
  - _Requisitos: R7_
- [ ] 8. Integrar con la spec 04: el botón "Ver menú y pedir" abre `/puesto/<id>` y la navegación muestra "Mi puesto" y "Perfil" según rol
  - _Requisitos: R3.5, R1.2_

## Fase 4: Verificación

- [ ] 9. Pruebas manuales en celular real (por HTTPS, ver spec 01)
  - [ ] Mapa centrado en la ubicación, y fallback al negar permiso
  - [ ] Pines distinguibles (también sin ver el color)
  - [ ] Filtros y búsqueda con acentos
  - [ ] Recomendar con y sin foto, y el aviso de puntos
  - [ ] Login, registro y redirección con `next`
  - [ ] Sin desplazamiento horizontal a 320 px, botones tocables sin error
  - _Requisitos: R1.6, R1.7, R8.3_
- [ ] 10. Punto de control: `node --test static/js/tests/` pasa completo

## Dependencias con otras specs
* **Recibe de Int. 1:** `GET /api/puestos`, `GET /api/puestos/categorias`, `POST /api/puestos/recomendar`, `auth/*`. Hasta entonces, usar datos de ejemplo con la misma forma del contrato compartido.
* **Entrega a Int. 3 y 4:** `base.html`, `api.js`, `styles.css`, `window.AntojitoUbicacion` y el contenedor `#zona-ia`.

## Diseño UX/UI (transversal)
- [ ] D1. Evaluar la interfaz de esta spec contra `.kiro/steering/diseno-ux-ui.md`, listar problemas visuales y de usabilidad, y corregir solo lo necesario
- [ ] D2. Usar únicamente los tokens, la escala tipográfica y los componentes del sistema de diseño (sin colores, fuentes ni espaciados sueltos)
- [ ] D3. Cubrir los estados de carga, error, vacío, éxito y deshabilitado de cada pantalla
- [ ] D4. Verificar accesibilidad: contraste AA, objetivos de 44 px, foco visible, teclado, lector de pantalla, texto ampliable y `prefers-reduced-motion`
- [ ] D5. Probar en móvil (Chrome Android y Safari iOS), tableta y escritorio, y pasar la lista de la sección 12 del prompt de diseño
