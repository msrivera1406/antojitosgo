# Diseño: Pedidos Pick-up, Panel de locatarios y Lealtad

## Visión general

```
Cliente (puesto.html + pickup.js)           Locatario (locatario.html + locatario.js)
   │  POST /api/pedidos                        │  GET /api/pedidos/puesto/<id>  (sondeo 10 s)
   ▼                                           ▼  PATCH /api/pedidos/<id>/estado
              routes/pedidos_routes.py ──────────────────────────────┐
                        │  usa utils/puntos.py y utils/auth.py (Int. 1)│
                        ▼                                              │
                     MySQL: pedidos, detalle_pedidos, usuarios.puntos ◀┘
Perfil (perfil.html + perfil.js) ── GET /api/usuarios/<id>/perfil (Int. 1)
```

Sin WebSockets: el tablero y el perfil usan sondeo periódico (`setInterval` que se pausa con `document.visibilityState`). Es suficiente para el MVP y más simple de desplegar.

## Estructura (archivos de esta spec)

```
routes/pedidos_routes.py
templates/puesto.html, locatario.html, perfil.html
static/js/pickup.js, locatario.js, perfil.js
static/css/pedidos.css
tests/test_pedidos.py
static/js/tests/pickup.test.js
```

## Backend

### `POST /api/pedidos`

Petición:
```json
{ "puesto_id": 3, "items": [ {"producto_id": 9, "cantidad": 2} ], "cupon_id": 4 }
```
Respuesta `201`:
```json
{ "pedido": { "id": 12, "codigo_pickup": "ANT-482", "estado": "pendiente", "subtotal": 120.00,
              "descuento_aplicado": 15.00, "total": 105.00, "creado_en": "...",
              "puesto": {"id": 3, "nombre": "..."}, "items": [ ... ] },
  "cupon_usado": { "id": 4, "codigo": "CUP-7K2Q9X", "monto": 15.00 } }
```

Algoritmo (un único `db_cursor`, una transacción):
1. `login_requerido`. Leer y validar el cuerpo (tipos, rangos, máx. 30 renglones). Fusionar productos repetidos.
2. `SELECT estatus, propietario_id FROM puestos WHERE id = %s`. `404` si no existe, `409` si no es `verificado`, `403` si `propietario_id` es el usuario en sesión.
3. `SELECT id, nombre, precio, disponible FROM productos WHERE puesto_id = %s AND id IN (...)`. Todo producto pedido debe estar en el resultado y `disponible`.
4. `subtotal = Σ precio × cantidad` con `Decimal`. Nunca `float` para dinero dentro del cálculo.
5. Si viene `cupon_id`: `validar_y_consumir_cupon(cursor, cupon_id, usuario_id, puesto_id, subtotal)` (de `utils/cupones.py`). Valida dueño, uso, vigencia, puesto y compra mínima, y lo marca usado de forma atómica. El `descuento` es el `monto` del cupón. Un `ValueError` se traduce en `400`.
6. `total = subtotal - descuento`.
7. Generar código: hasta 20 intentos de `ANT-%03d` con `random.randint(0, 999)` y comprobar que no exista entre pedidos activos del puesto (`SELECT 1 FROM pedidos WHERE puesto_id = %s AND codigo_pickup = %s AND estado IN ('pendiente','listo')`). Si agota, `409` y rollback (los puntos se devuelven al revertir la transacción).
8. `INSERT INTO pedidos`, luego `INSERT INTO detalle_pedidos` por renglón.
9. Commit y responder.

Una colisión entre dos pedidos simultáneos con el mismo código es posible entre la comprobación y el `INSERT`. Se acepta como riesgo bajo para el MVP: la probabilidad es mínima con pocos pedidos activos. Si se quisiera cerrar, habría que bloquear la fila del puesto con `SELECT ... FOR UPDATE` al inicio (una línea). **Se recomienda hacerlo**, por ser barato.

### `GET /api/cupones/mios?puesto_id=`
* `login_requerido`. Delega en `listar_cupones_vigentes(cursor, usuario_id, puesto_id)`: `usado = FALSE`, `vence_en > NOW()` y, si se indica `puesto_id`, `puesto_id IS NULL OR puesto_id = %s`.
* Respuesta: `{"cupones": [Cupon, ...]}` (forma en el contrato compartido).
* Se declara en `pedidos_routes.py` (misma blueprint, ruta absoluta `/api/cupones/mios`).

### `GET /api/pedidos/puesto/<puesto_id>`
* `login_requerido`, luego verificar con `es_dueno_o_admin`.
* Pedidos con `estado IN ('pendiente','listo')`, `ORDER BY creado_en ASC`. Con `?estado=entregado`, `LIMIT 20` en orden descendente.
* Los renglones se traen con una sola consulta `WHERE pedido_id IN (...)` y se agrupan en Python.
* Cada pedido incluye `cliente: {id, nombre}`. No se expone el email del cliente.

### `PATCH /api/pedidos/<id>/estado`
```python
TRANSICIONES = {"pendiente": "listo", "listo": "entregado"}
```
1. `login_requerido`. Validar que `estado` esté en el enum (`400` si no).
2. `SELECT p.*, pu.propietario_id FROM pedidos p JOIN puestos pu ... WHERE p.id = %s FOR UPDATE`. `404` si no existe. `403` si no es dueño ni `admin`.
3. Si `TRANSICIONES.get(actual) != nuevo`, `409`.
4. `UPDATE pedidos SET estado = %s WHERE id = %s AND estado = %s` y verificar `rowcount == 1` (defensa extra contra carreras).
5. Si `nuevo == 'entregado'`: `puntos = puntos_por_compra(total)`, y si es mayor que 0, `sumar_puntos(cursor, cliente_id, puntos)`. Después `cupon_ganado = registrar_consumo(cursor, cliente_id, puesto_id)`.
6. Responder `{pedido, puntos_otorgados, cupon_ganado}`.

La unicidad de los puntos se garantiza porque la transición `listo` a `entregado` solo puede ocurrir una vez (paso 3 y 4).

## Frontend

### `pickup.js`

Funciones puras (exportables y probadas):
```js
agregarAlCarrito(carrito, producto)            // devuelve carrito nuevo (inmutable). Máx. 20 por producto
cambiarCantidad(carrito, productoId, cantidad) // 0 elimina
calcularSubtotal(carrito)                      // en centavos enteros para evitar errores de coma flotante
cuponesAplicables(cupones, puestoId, subtotalCentavos, ahora)  // marca cada cupón con {aplicable, motivo}: de otro puesto, vencido, bajo el mínimo (3 × monto)
calcularDescuento(cupon, subtotalCentavos)     // min(monto, subtotal), en centavos
calcularTotal(subtotalCentavos, cupon)         // subtotal - descuento
armarPayloadPedido(puestoId, carrito, cuponId) // solo ids y cantidades, sin precios
formatearMXN(n)                                // "$105.00"
cargarCarrito(storage, puestoId) / guardarCarrito(storage, puestoId, carrito)
```
Para el dinero en el cliente se trabaja en centavos enteros y se convierte al mostrar.

Vistas con DOM: `renderMenu`, `renderCarrito`, `renderConfirmacion`. Estado: `{puesto, carrito, cuponId, cupones, usuario, enviando}`.

### `locatario.js`
* Módulos: `cargarMisPuestos`, `renderFormularioAlta` (mapa Leaflet pequeño con pin, reutilizando el patrón de Int. 2), `renderEditarPuesto`, `renderMenuEditable`, `renderTablero`.
* Funciones puras: `validarPuesto(datos)`, `validarProducto(datos)`, `agruparPedidos(lista)` (`{pendientes, listos}`), `detectarNuevos(idsPrevios, lista)`, `siguienteAccion(estado)` (`{etiqueta, estado}` o `null`), `filtrarPorCodigo(lista, texto)`.
* Sondeo: `setInterval(refrescar, 10000)`, con `visibilitychange` para pausar y reanudar (y refresco inmediato al volver).
* Los botones de estado se deshabilitan mientras su petición está en curso.

### `perfil.js`
* Funciones puras: `progresoInsignia({nivel, siguiente_nivel, puntos_para_siguiente}, puntos)` (porcentaje 0 a 100), `porcentajeHito(actual, meta)`, `describirCupon(cupon)` (texto de monto, alcance y vigencia), `diasRestantes(vence_en, ahora)` y `separarPedidos(lista)` (`{activos, historial}`).
* Sondeo de 15 s solo si hay pedidos activos.

### Estilos (`pedidos.css`)
Código de recogida en tipografía grande y monoespaciada, tarjetas de pedido, columnas del tablero apiladas en móvil y en dos columnas desde 768 px, barra de progreso, insignias con emoji o SVG propio.

## Modelo de datos usado (sin cambios al esquema)
`pedidos(cliente_id, puesto_id, total, descuento_aplicado, estado, codigo_pickup, cupon_id)`, `detalle_pedidos(pedido_id, producto_id, cantidad, subtotal)` y `cupones` (ver sección 2.1 del contrato compartido). El subtotal del pedido no se guarda: se calcula como `total + descuento_aplicado`.

## Manejo de errores

| Código | Situaciones |
|---|---|
| 400 | Cuerpo inválido, cantidad fuera de rango, producto ajeno o no disponible, cupón no válido (ajeno, usado, vencido, de otro puesto), compra por debajo del mínimo del cupón, estado desconocido |
| 401 | Sin sesión |
| 403 | No es dueño del puesto ni `admin`, o intenta pedir en su propio puesto |
| 404 | Puesto o pedido inexistente |
| 409 | Puesto no verificado, transición de estado inválida, sin código libre |

En cada error la transacción se revierte, por lo que nunca se pierden ni se regalan puntos.

## Estrategia de pruebas

### `tests/test_pedidos.py` (pytest, BD `antojito_test`)

| Grupo | Casos |
|---|---|
| Crear, feliz | Un renglón, varios renglones, repetidos fusionados, subtotal y total correctos, código con formato `^ANT-\d{3}$`, estado `pendiente`, cliente tomado de la sesión |
| Crear, seguridad | Sin sesión (`401`), intento de enviar `total` o `cliente_id` en el cuerpo (se ignora), precio manipulado (se ignora) |
| Crear, validación | Items vacíos, cantidad 0, 21, negativa, no entera, más de 30 renglones, producto de otro puesto, producto no disponible, puesto `recomendado` (`409`), puesto inexistente (`404`) |
| Código | Formato; unicidad entre activos (forzando colisión con `monkeypatch` de `random.randint`); reutilización tras `entregado`; agotamiento (`409` y rollback sin pedido) |
| Cupones | Cupón válido descuenta su monto y queda `usado`; cupón ajeno, usado, vencido, de otro puesto y bajo el mínimo (`400`); mismo cupón en dos pedidos simultáneos (solo uno pasa); si el pedido falla después, el cupón sigue disponible (rollback); descuento nunca mayor al subtotal; sin `cupon_id` no hay descuento; un solo cupón por pedido |
| Estado | `pendiente` a `listo` a `entregado` (dueño), `entregado` a `listo` (`409`), saltar `pendiente` a `entregado` (`409`), repetir (`409`), estado desconocido (`400`), otro locatario (`403`), cliente (`403`), `admin` (`200`), inexistente (`404`) |
| Puntos | Total 105 suma 20, total 49.99 suma 0, total 50 suma 10, total 0 suma 0; doble `PATCH` a `entregado` suma una sola vez |
| Panel | Solo activos, orden ascendente, `?estado=entregado`, items incluidos, no se filtra el email del cliente, `403` al dueño de otro puesto |
| Hito de consumo | 4 pedidos entregados no emiten cupón, el 5.º sí (con `puesto_id` y monto $20); pedidos de menos de $50 no cuentan; dueño de puesto no puede pedir en el suyo (`403`); `cupon_ganado` en la respuesta de `PATCH` solo en el 5.º, y no se duplica al repetir |
| Cupones, listado | `GET /api/cupones/mios` solo propios, vigentes y sin usar; filtro por `puesto_id`; `401` sin sesión |
| Integración | Ciclo completo: cliente con 4 pedidos entregados hace el 5.º, el locatario lo avanza, se emite el cupón, el cliente lo usa en un pedido nuevo, y `GET /perfil` refleja puntos, cupón usado y progreso |

### `static/js/tests/pickup.test.js` (`node --test`)
`agregarAlCarrito` (nuevo, existente, tope de 20, inmutabilidad), `cambiarCantidad` (0 elimina), `calcularSubtotal` (sin errores como `0.1 + 0.2`), `cuponesAplicables` (de otro puesto, vencido, bajo el mínimo, aplicable), `calcularDescuento` (nunca mayor al subtotal), `calcularTotal`, `armarPayloadPedido` (no incluye precios), `formatearMXN`, carga y guardado con `storage` falso, `validarPuesto`, `validarProducto`, `agruparPedidos`, `detectarNuevos`, `siguienteAccion`, `filtrarPorCodigo`, `progresoInsignia`, `porcentajeHito` (0 %, 60 %, tope 100 %), `describirCupon`, `diasRestantes` y `separarPedidos`.

## Riesgos
* **Dependencia de la spec 01:** `puestos/mios`, edición de puestos y productos, y `perfil` los entrega Int. 1. Usar datos de ejemplo mientras tanto y acordar la forma exacta del JSON.
* **Sondeo y carga:** con pocos puestos en la demo es irrelevante. Se documenta el sondeo como decisión consciente.
* **Cupón consumido al crear el pedido:** si el cliente nunca recoge, pierde el cupón. No hay cancelación en el MVP. Se documenta como decisión consciente.
