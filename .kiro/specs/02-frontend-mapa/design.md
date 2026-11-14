# Diseño: Frontend Mobile-First y Mapa

## Visión general

Vistas HTML renderizadas por Flask (Jinja) que extienden `base.html`. La interactividad es JavaScript puro que consume la API JSON. Sin frameworks ni paso de compilación. Leaflet se carga desde CDN (`unpkg`) con versión fija.

## Estructura (archivos de esta spec)

```
templates/base.html, index.html, recomendar.html, login.html
static/css/styles.css
static/js/api.js, auth.js, map.js
static/js/tests/map.test.js
```

## `base.html`

```
<head> meta viewport, título, styles.css, {% block head %}
<body>
  <header> logo "Antojito" + saludo/puntos si hay sesión </header>
  <main> {% block content %} </main>
  <nav class="nav-inferior"> Mapa | Perfil | Mi puesto | Entrar/Salir </nav>
  <script src="api.js"><script src="auth.js">
  {% block scripts %}
```
La navegación se completa al cargar con `obtenerUsuario()`: oculta o muestra enlaces según rol. Las demás páginas no deben reconstruir la navegación.

## `api.js`

```js
class ApiError extends Error { constructor(status, mensaje) {...} }
async function apiFetch(url, { metodo='GET', cuerpo, formData } = {}) {
  // JSON o FormData (no fijar Content-Type con FormData)
  // res.ok ? res.json() : throw new ApiError(res.status, (await res.json()).error)
}
```
Los demás integrantes lo usan para todas las llamadas, para que el manejo de errores sea uniforme.

## `map.js`

Estado del módulo:
```js
const estado = { todos: [], filtros: { categoria: null, estatus: 'todos', texto: '' }, mapa, capaPines, ubicacion }
```

Funciones puras (exportables y probadas):
```js
normalizarTexto(s)                           // minúsculas, sin acentos (NFD + quitar diacríticos), trim
filtrarPuestos(puestos, {categoria, estatus, texto})
```
`estatus` del selector (`verificados`, `recomendados`) se traduce a `verificado` y `recomendado`.

Funciones con DOM:
```js
iniciarMapa()                // Leaflet, tiles OSM, geolocalización con timeout 8 s, fallback CDMX
cargarPuestos()              // apiFetch('/api/puestos'); error con botón reintentar
dibujarPines(lista)          // limpia capaPines y recrea. L.divIcon con clases CSS
crearTarjeta(puesto)         // construye nodos con textContent, devuelve HTMLElement para bindPopup
```

Pines: `L.divIcon` con clases `.pin-verificado` (dorado/verde, ícono de check) y `.pin-recomendado` (azul/naranja, ícono de signo de pregunta). Se evita depender de imágenes externas.

Con pocos puestos (decenas) se redibuja la capa completa en cada cambio de filtro, lo cual es suficiente. No hace falta clustering para el MVP.

## `recomendar.html` y su script

Un mapa Leaflet pequeño, un `L.marker` arrastrable que se crea o mueve con `map.on('click')`. Los campos ocultos `latitud` y `longitud` se rellenan con 8 decimales. Funciones puras:

```js
validarRecomendacion({nombre, categoria, latitud, longitud, descripcion, foto})
  // -> { ok: boolean, errores: { campo: mensaje } }
```
Envío con `FormData` y `apiFetch`. Se bloquea el botón con una bandera `enviando`.

Para que el código esté en un solo archivo por spec, la lógica de `recomendar.html` y de `login.html` va en `map.js` y `auth.js`, respectivamente, y se activa según un atributo `data-pagina` en `<body>` (`data-pagina="mapa|recomendar|login"`).

## `login.html`

Dos formularios (pestañas con atributo `hidden`). Funciones puras en `auth.js`:
```js
validarAcceso({email, password, nombre?, rol?}, modo)   // modo: 'login' | 'registro'
esRutaInternaSegura(ruta)                               // true solo si empieza con '/' y no con '//' ni '/\\'
destinoTrasLogin(usuario, next)                         // next seguro, o '/locatario' si rol locatario, o '/'
```

## Estilos

* Variables: `--color-primario` (naranja chile), `--color-verificado` (verde/dorado), `--color-recomendado` (azul), `--color-fondo`, `--espacio-1..5`, `--radio`.
* Mobile-First: estilos base para pantalla pequeña y `@media (min-width: 768px)` para ampliar (contenedor centrado, máx. 480 px para formularios).
* El mapa usa `height: calc(100dvh - alto-cabecera - alto-nav)`.
* Contenedor flotante `#zona-ia` (posición `fixed`, `bottom` encima de la navegación, `right`) reservado para spec 03.

## Manejo de errores

| Situación | Comportamiento |
|---|---|
| Permiso de ubicación denegado o timeout | Centro CDMX y aviso no bloqueante |
| `GET /api/puestos` falla | Tarjeta de error con "Reintentar" |
| `401` en cualquier llamada protegida | Redirigir a `/login?next=<ruta actual>` |
| `400` en formulario | Mensajes junto a campos, o el `error` del servidor arriba |
| Sin red | Mensaje "Sin conexión. Inténtalo de nuevo" |

## Seguridad

* Todo dato de puestos y usuarios se inserta con `textContent`/`setAttribute`. `innerHTML` solo para plantillas estáticas sin datos del usuario.
* `esRutaInternaSegura` evita redirecciones abiertas con `next`.
* `foto_url` se asigna a `img.src` solo si empieza con `/static/uploads/`.

## Estrategia de pruebas

`node --test static/js/tests/map.test.js`

| Función | Casos |
|---|---|
| `normalizarTexto` | "Chilaquiles" ≡ "chilaquilés", espacios, `null`/`undefined` |
| `filtrarPuestos` | Sin filtros devuelve todos, solo categoría, solo estatus, texto en nombre/descripción/categoría, combinación, sin resultados, no muta el arreglo original |
| `validarRecomendacion` | Nombre vacío, nombre > 120, categoría vacía, sin pin, descripción > 500, foto con tipo o tamaño inválido, caso válido |
| `validarAcceso` | Email mal formado, contraseña corta, registro sin nombre, caso válido |
| `esRutaInternaSegura` | `/perfil` sí. `//evil.com`, `https://evil.com`, `javascript:alert(1)`, `/\evil.com`, vacío, no. |
| `destinoTrasLogin` | Respeta `next` seguro, ignora inseguro, locatario sin `next` va a `/locatario` |

Prueba manual en celular (Chrome Android y Safari iOS): ver tarea final.
