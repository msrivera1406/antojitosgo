# Antojito: contrato compartido entre integrantes

Este archivo complementa a `AntojitoGo.md`. Si ambos se contradicen, **este archivo prevalece** (recoge las decisiones tomadas después de la primera revisión). Las cuatro specs en `.kiro/specs/` dependen de lo definido aquí.

## 1. Propiedad de archivos (para no pisarse)

Regla: **solo el dueño edita un archivo**. Si necesitas un cambio en un archivo ajeno, pídelo al dueño o abre un PR pequeño hacia su rama.

| Integrante | Spec | Archivos propios |
|---|---|---|
| 1. DevOps / Backend core / BD | `01-infra-backend-core` | `Dockerfile`, `docker-compose.yml`, `.env.example`, `app.py`, `config.py`, `db.py`, `database.sql`, `requirements.txt`, `requirements-dev.txt`, `utils/auth.py`, `utils/puntos.py`, `utils/cupones.py`, `utils/respuestas.py`, `routes/auth_routes.py`, `routes/puestos_routes.py`, `scripts/`, `docs/despliegue.md`, `tests/conftest.py`, `tests/test_auth.py`, `tests/test_puestos.py`, `tests/test_cupones.py`, `tests/test_paginas.py` |
| 2. Frontend / Mapa | `02-frontend-mapa` | `static/css/styles.css`, `static/js/api.js`, `static/js/map.js`, `static/js/auth.js`, `templates/base.html`, `templates/index.html`, `templates/recomendar.html`, `templates/login.html`, `static/js/tests/map.test.js` |
| 3. Agente IA | `03-agente-ia` | `routes/ia_routes.py`, `services/clima.py`, `services/ia_contexto.py`, `services/gemini_token.py`, `services/gemini_chat.py`, `scripts/ia_smoke.py`, `static/js/gemini_live.js`, `static/js/audio_utils.js`, `static/css/ia.css`, `templates/partials/boton_ia.html`, `tests/test_ia.py`, `static/js/tests/gemini_live.test.js` |
| 4. Pedidos / Locatarios / Lealtad | `04-pedidos-locatarios-lealtad` | `routes/pedidos_routes.py`, `templates/puesto.html`, `templates/locatario.html`, `templates/perfil.html`, `static/js/pickup.js`, `static/js/locatario.js`, `static/js/perfil.js`, `static/css/pedidos.css`, `tests/test_pedidos.py`, `static/js/tests/pickup.test.js` |

Puntos de integración (una sola línea en archivo ajeno, acordada de antemano):
* `templates/index.html` (Int. 2) incluye `{% include 'partials/boton_ia.html' %}` y carga `gemini_live.js` como **módulo ES** (`<script type="module" src="...">`), porque usa el SDK JS de Gemini.
* `templates/base.html` (Int. 2) expone los bloques `{% block content %}`, `{% block head %}` y `{% block scripts %}`. Todas las plantillas extienden `base.html`.
* `app.py` (Int. 1) registra los cuatro blueprints desde el inicio. Int. 1 crea **blueprints vacíos** para `pedidos_routes` y `ia_routes` en la primera entrega, para que la app arranque y Int. 3 y 4 solo reemplacen su contenido.
* Cada integrante agrega sus estilos en su propio CSS (`ia.css`, `pedidos.css`), no en `styles.css`.

### Flujo de Git
Una rama por integrante (`feat/int1-infra`, `feat/int2-frontend`, `feat/int3-ia`, `feat/int4-pedidos`). Commits pequeños y merge a `main` seguido. Primera entrega obligatoria en los primeros ~30 min (ver sección 6).

## 2. Decisiones tomadas

| Tema | Decisión |
|---|---|
| Sesión | Sesión de Flask con cookie firmada (`SECRET_KEY`), `HttpOnly`, `SameSite=Lax`. Se guarda `session['usuario_id']` y `session['rol']`. Sin JWT. |
| Contraseñas | Hash con `werkzeug.security`. Mínimo 8 caracteres. |
| Puntos por compra | Se otorgan **al pasar el pedido a `entregado`**, no al crearlo. Fórmula: `10 * floor(total / 50)`. `total` es el importe final pagado (ya con descuento). |
| Puntos por recomendación | +50 al crear la recomendación. Los puntos solo sirven para el nivel de insignia. |
| Código pick-up | `ANT-` + 3 dígitos (`ANT-007`, `ANT-482`). Único entre los pedidos activos (`pendiente` o `listo`) del mismo puesto. |
| Recompensas | **No hay canje de puntos.** Los descuentos se ganan con **cupones por hitos** (ver sección 2.1). |
| Insignias | Se calculan con `usuarios.puntos`: 0 a 149 *Explorador de Banqueta*, 150 a 499 *Cazador de Garnachas*, 500 o más *Maestro del Antojo*. Los puntos ya no se gastan, así que el nivel nunca baja. |
| Pago | Sin pago en línea. Se paga al recoger. |
| Clima | Se consulta Open-Meteo con la `lat`/`lng` del usuario. Solo si el navegador no da ubicación se usa el centro de CDMX (`19.4326, -99.1332`). |
| Franjas horarias (hora CDMX) | Mañana 05:00 a 11:59 (tamales, atole, chilaquiles). Mediodía 12:00 a 15:59 (tortas, tacos). Tarde/noche 16:00 a 04:59 (esquites, elotes, tacos). La franja de mediodía es una suposición nuestra. |
| Verificación de puestos | Un `recomendado` pasa a `verificado` manualmente desde phpMyAdmin. No hay panel admin en el MVP. |
| Fotos | Se guardan en `static/uploads/` (volumen Docker). S3 es opcional y queda fuera del MVP. Máx. 5 MB, solo JPG/PNG/WebP, nombre `uuid4`. |
| Gemini | Voz: `gemini-3.8-live`, con respaldos `gemini-2.5-flash-native-audio-latest` y `gemini-3.1-flash-live-preview`. Chat de texto: `gemini-3.5-flash-lite`, con respaldos `gemini-3.1-flash-lite` y `gemini-3.8-flash`. Todo configurable en `.env` (`GEMINI_MODEL`, `GEMINI_MODEL_FALLBACKS`, `GEMINI_CHAT_MODEL`, `GEMINI_CHAT_MODEL_FALLBACKS`). Verificado con `scripts/ia_smoke.py`. La clave **nunca** llega al navegador: el backend entrega un token efímero con el modelo y las instrucciones bloqueados. |
| HTTPS | `getUserMedia` (micrófono) y `geolocation` exigen contexto seguro. Funcionan en `localhost`, pero en EC2 hace falta HTTPS (ver spec 01). |

## 2.1 Recompensas con cupones

Los puntos Antojito **ya no se gastan**: solo definen el nivel de insignia. Los descuentos se ganan con **cupones por hitos**, y se diseñaron para ser difíciles de conseguir.

| Hito | Regla | Cupón |
|---|---|---|
| Recomendar | Cada **5 recomendaciones contables**. Son contables máximo **3 por día** por usuario. Las demás se aceptan y dan puntos, pero no avanzan el hito. | \$15, válido en cualquier puesto verificado |
| Consumir | Cada **5 pedidos `entregado`** del mismo usuario **en el mismo puesto**, y cada uno con `total` pagado de al menos \$50. | \$20, válido solo en ese puesto |

Reglas comunes:
* Vigencia de 30 días desde la emisión. Un cupón por pedido, no acumulables, sin valor en efectivo.
* Compra mínima: `subtotal >= 3 × monto del cupón` (\$45 para el de \$15, \$60 para el de \$20). El descuento nunca supera el subtotal.
* El cupón se marca `usado` al **crear** el pedido. No hay cancelación en el MVP, así que no se devuelve.
* Un usuario **no puede pedir en un puesto del que es propietario** (evita granjas de cupones).
* Cada hito emite **un solo cupón**. Una `clave_hito` única por usuario lo garantiza (`reco:2`, `consumo:<puesto_id>:1`), aunque la petición se repita.
* El cupón se emite automáticamente: al recomendar (Int. 1) y al pasar un pedido a `entregado` (Int. 4). La respuesta de esas rutas incluye `cupon_ganado` (objeto o `null`).
* Código de cupón: `CUP-` + 6 caracteres alfanuméricos en mayúscula, sin `0`, `O`, `1`, `I`. Único globalmente.
* Parámetros en `config.py` (para ajustar la dificultad sin tocar la lógica): `HITO_RECOMENDACIONES=5`, `CUPON_RECOMENDACION_MXN=15`, `MAX_RECOMENDACIONES_CONTABLES_DIA=3`, `HITO_CONSUMO=5`, `CONSUMO_MIN_MXN=50`, `CUPON_CONSUMO_MXN=20`, `CUPON_VIGENCIA_DIAS=30`, `CUPON_COMPRA_MIN_FACTOR=3`.

### Cambios al esquema (respecto a `AntojitoGo.md` sección 5)
* `usuarios.recomendaciones_contadas INT NOT NULL DEFAULT 0`: recomendaciones que cuentan para el hito.
* `puestos.recomendado_por INT NULL` (FK a `usuarios`, `ON DELETE SET NULL`): quién sugirió el puesto. Sirve para el límite diario.
* `pedidos.cupon_id INT NULL` (FK a `cupones`): cupón usado en el pedido.
* Nueva tabla `cupones` (`id`, `usuario_id`, `puesto_id` NULL = cualquier puesto, `codigo` único, `monto`, `origen` (`recomendacion`/`consumo`), `clave_hito`, `usado`, `vence_en`, `creado_en`, y `UNIQUE (usuario_id, clave_hito)`). Se crea **antes** de `pedidos`.

### Formas JSON nuevas
```jsonc
// Cupón
{ "id": 4, "codigo": "CUP-7K2Q9X", "monto": 15.00, "origen": "recomendacion",
  "puesto": null,                                   // o {"id": 3, "nombre": "..."} si es de un puesto
  "vence_en": "2025-02-28T23:59:59" }

// Progreso (dentro de GET /api/usuarios/<id>/perfil)
{ "recomendaciones": { "actual": 2, "meta": 5, "contables_hoy_restantes": 1 },
  "consumo": [ { "puesto_id": 3, "puesto_nombre": "...", "actual": 4, "meta": 5 } ] }
```
El perfil devuelve además `cupones` (vigentes y sin usar) y `progreso`.

## 3. Convenciones de API

* Todas las respuestas son JSON. Las rutas de vistas devuelven HTML.
* Errores: `{"error": "mensaje legible en español"}` con código `400` (validación), `401` (sin sesión), `403` (sin permiso), `404`, `409` (conflicto de estado), `502`/`503` (servicio externo).
* Los `DECIMAL` de MySQL se serializan como número JSON (`float` con 2 decimales para dinero, 8 para coordenadas). Nunca como cadena.
* Fechas en ISO 8601 (`2025-01-31T14:05:00`).
* Queries siempre parametrizadas. Nunca se interpolan valores en SQL.
* Los textos libres se escapan al pintarlos en el DOM (`textContent`, no `innerHTML` con datos del usuario).
* El precio de los productos siempre se toma de la BD, nunca del cliente.

### Formas de objeto compartidas
```jsonc
// Usuario
{ "id": 1, "nombre": "Ana", "email": "ana@x.com", "rol": "cliente", "puntos": 120 }

// Puesto (en listas)
{ "id": 3, "nombre": "Esquites Doña Lupe", "descripcion": "...", "categoria": "esquites",
  "latitud": 19.41, "longitud": -99.16, "horario": "17:00 a 23:00",
  "estatus": "verificado", "foto_url": "/static/uploads/abc.jpg" }

// Puesto (detalle) = Puesto + "productos"
{ "...": "...", "productos": [ { "id": 9, "nombre": "Esquite chico", "precio": 35.00, "disponible": true } ] }

// Pedido
{ "id": 12, "codigo_pickup": "ANT-482", "estado": "pendiente", "subtotal": 120.00,
  "descuento_aplicado": 15.00, "total": 105.00, "creado_en": "...",
  "cupon": { "id": 4, "codigo": "CUP-7K2Q9X", "monto": 15.00 },   // null si no se usó cupón
  "puesto": { "id": 3, "nombre": "..." },
  "items": [ { "producto_id": 9, "nombre": "Esquite chico", "cantidad": 2, "subtotal": 70.00 } ] }
```

### Categorías válidas
`chilaquiles`, `esquites`, `tacos`, `tamales`, `tortas`, `postres`, `bebidas`. Se definen una sola vez en `config.CATEGORIAS` y el frontend las recibe de `GET /api/puestos/categorias`.

## 4. Adiciones al contrato original

El documento original no cubre estas necesidades. Se agregan, y el dueño de cada una está en la tabla.

| Endpoint | Dueño | Motivo |
|---|---|---|
| `GET /api/auth/me` | Int. 1 | El frontend necesita saber si hay sesión y qué rol tiene. |
| `POST /api/auth/logout` | Int. 1 | Cerrar sesión. |
| `GET /api/puestos/categorias` | Int. 1 | Lista única de categorías. |
| `GET /api/puestos/mios` | Int. 1 | Panel del locatario: sus puestos. |
| `PUT /api/puestos/<id>` | Int. 1 | Editar puesto (dueño o admin). |
| `POST /api/puestos/<id>/productos` | Int. 1 | Agregar producto al menú. |
| `PATCH /api/productos/<id>` | Int. 1 | Editar nombre, precio o disponibilidad. |
| `GET /api/ia/token?lat=&lng=&excluir=` | Int. 3 | Token efímero para Gemini Live sin exponer la API key. Fija modelo e instrucciones. `excluir` lista modelos que ya fallaron para pasar al respaldo. |
| `POST /api/ia/chat` | Int. 3 | Chat de texto de respaldo del asistente, con modelos de respaldo en el servidor. |
| `GET /api/cupones/mios?puesto_id=` | Int. 4 | Cupones vigentes del usuario, filtrables por los aplicables a un puesto. |
| Página `login.html` y rutas `/login`, `/registro` | Int. 2 | El documento no incluía pantalla de acceso. |

Rutas de vistas (las registra Int. 1 en `app.py`): `/`, `/puesto/<id>`, `/recomendar`, `/locatario`, `/perfil`, `/login`.

## 5. Quién necesita sesión

| Acción | Requisito |
|---|---|
| Ver mapa, listar y ver detalle de puestos, `GET /api/ia/contexto`, `GET /api/ia/token`, `POST /api/ia/chat` | Público (token y chat llevan límite de peticiones por IP) |
| Recomendar puesto, crear pedido, ver perfil propio, ver mis cupones | Sesión iniciada |
| Crear/editar puesto y productos | `locatario` (solo sus puestos) o `admin` |
| Ver y cambiar estado de pedidos de un puesto | `locatario` dueño de ese puesto o `admin` |
| Registro | Solo puede crear roles `cliente` o `locatario`. `admin` solo por BD. |

## 6. Orden de entrega (3.5 h)

1. **0:00 a 0:30, desbloqueo.** Int. 1 entrega: Docker funcionando, `database.sql` con esquema, `app.py` con blueprints vacíos, `db.py`, `utils/auth.py`. Int. 2 entrega: `base.html`, `api.js`, `styles.css` base. Mientras tanto, 3 y 4 trabajan sobre sus servicios y lógica pura con pruebas.
2. **0:30 a 2:00, desarrollo en paralelo** de cada spec.
3. **2:00 a 3:00, integración** entre áreas (mapa a puesto, puesto a pedido, locatario, IA en el index).
4. **3:00 a 3:30, despliegue en EC2, prueba de extremo a extremo y datos semilla de la demo.**

## 7. Pruebas

* **Backend:** `pytest`. Se ejecuta con `docker compose exec web pytest`. Usa una BD aparte `antojito_test`, que `tests/conftest.py` crea a partir de `database.sql`. Las pruebas no tocan `antojito_db`.
* **APIs externas** (Open-Meteo, Gemini): siempre simuladas con `unittest.mock` o `responses`. Ninguna prueba hace llamadas de red reales.
* **Frontend:** la lógica pura (filtros, validaciones, carrito, armado de payloads) vive en funciones exportables con `if (typeof module !== 'undefined') module.exports = {...}` y se prueba con `node --test static/js/tests/`. Requiere Node 18 o superior solo en la máquina de desarrollo, no en el contenedor.
* Cada tarea con lógica debe tener su prueba antes de darse por terminada.

## 8. Fuera de alcance del MVP

Delivery, pagos en línea, panel admin, historial de puntos, notificaciones push, S3, cancelación de pedidos (por eso un cupón se consume al crear el pedido y no se devuelve), eliminación de productos (se marcan `disponible = false`), cupones transferibles o acumulables.
