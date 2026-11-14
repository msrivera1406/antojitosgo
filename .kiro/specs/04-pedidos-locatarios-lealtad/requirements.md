# Spec 04: Pedidos Pick-up, Panel de locatarios y Lealtad (Integrante 4)

Contexto compartido: `.kiro/steering/antojito-contrato-compartido.md` y `AntojitoGo.md`.

## Introducción

Esta spec cubre el ciclo completo de un pedido para recoger: el cliente arma su carrito en `puesto.html`, confirma y recibe un código `ANT-###`. El locatario lo ve en su tablero y lo avanza de `pendiente` a `listo` y `entregado`. Al entregarse, el cliente gana puntos (para su insignia) y, cada 5 pedidos entregados en el mismo puesto, un cupón de descuento para ese puesto. Los cupones se aplican al crear un pedido. `perfil.html` muestra puntos, insignia, cupones, progreso hacia el siguiente cupón y pedidos.

El sistema de cupones está descrito en la sección 2.1 del contrato compartido. Los puntos **no se canjean**.

Las APIs de puestos, productos y perfil son de la spec 01. Esta spec **consume** esas APIs y **entrega** `routes/pedidos_routes.py` con las tres rutas de pedidos.

Se paga al recoger. No hay pago en línea ni delivery.

## Requisitos

### R1. Crear pedido pick-up
**Historia:** Como comensal, quiero pedir con anticipación y recibir un código para recoger sin hacer fila.

1. CUANDO un usuario con sesión envíe `POST /api/pedidos` con `{puesto_id, items: [{producto_id, cantidad}], cupon_id}` (`cupon_id` opcional), EL SISTEMA DEBERÁ crear el pedido en estado `pendiente` y responder `201` con `{pedido, cupon_usado}` (Pedido según el contrato compartido).
2. EL SISTEMA DEBERÁ calcular precios y totales con los precios de la BD e ignorar cualquier precio enviado por el cliente.
3. SI el usuario no tiene sesión, EL SISTEMA DEBERÁ responder `401`.
4. SI el puesto no existe, responder `404`. SI el puesto no es `verificado`, responder `409` ("Este puesto aún no acepta pedidos").
5. SI `items` está vacío, falta, o una `cantidad` no es entero entre 1 y 20, o hay más de 30 renglones, responder `400`.
6. SI un `producto_id` no existe, no pertenece al puesto indicado, o no está `disponible`, responder `400` indicando cuál, sin crear el pedido.
7. SI el mismo `producto_id` aparece varias veces, EL SISTEMA DEBERÁ sumar las cantidades en un solo renglón.
8. EL SISTEMA DEBERÁ guardar un `detalle_pedidos` por renglón con `subtotal = precio × cantidad`.
9. EL SISTEMA DEBERÁ crear pedido, detalles y marcado del cupón como usado en una sola transacción. Ante cualquier fallo, NO DEBERÁ quedar nada guardado y el cupón NO DEBERÁ consumirse.
10. EL `total` guardado DEBERÁ ser el importe final a pagar (`subtotal - descuento_aplicado`), según el contrato compartido.
11. SI el usuario en sesión es el propietario del puesto, EL SISTEMA DEBERÁ responder `403` ("No puedes pedir en tu propio puesto").

### R2. Código de recogida
1. EL SISTEMA DEBERÁ generar `codigo_pickup` con el formato `ANT-` más 3 dígitos (`ANT-007`).
2. EL código DEBERÁ ser único entre los pedidos activos (`pendiente` o `listo`) del mismo puesto.
3. SI tras 20 intentos aleatorios no se encuentra un código libre, EL SISTEMA DEBERÁ responder `409` ("El puesto tiene demasiados pedidos activos. Intenta más tarde") y no crear el pedido.
4. LOS códigos de pedidos `entregado` PODRÁN reutilizarse.

### R3. Cupones de descuento
**Historia:** Como comensal frecuente, quiero usar los cupones que me gané, para pagar menos en mi siguiente pedido.

1. SI `cupon_id` viene en el pedido, EL SISTEMA DEBERÁ validarlo con `utils/cupones.py`: debe existir, pertenecer al usuario en sesión, no estar usado, no estar vencido y ser aplicable al puesto (`puesto_id` nulo o igual al del pedido). SI no cumple, responder `400` con un mensaje claro que no revele si el cupón existe para otro usuario ("Cupón no válido").
2. SI el `subtotal` es menor que 3 veces el monto del cupón, responder `400` ("Compra mínima de $X para usar este cupón").
3. EL descuento DEBERÁ ser el monto del cupón (nunca mayor al subtotal), y `descuento_aplicado` y `cupon_id` DEBERÁN guardarse en el pedido.
4. EL SISTEMA DEBERÁ marcar el cupón como usado de forma atómica en la misma transacción, de modo que dos pedidos simultáneos no puedan usar el mismo cupón.
5. SOLO PODRÁ usarse un cupón por pedido.
6. SI `cupon_id` no viene, NO DEBERÁ aplicarse descuento.
7. `GET /api/cupones/mios` DEBERÁ exigir sesión y devolver los cupones vigentes y sin usar del usuario. CON `?puesto_id=` DEBERÁ devolver solo los aplicables a ese puesto.

### R4. Gestión de estado del pedido
**Historia:** Como locatario, quiero avisar cuando el pedido está listo y marcarlo como entregado.

1. CUANDO el dueño del puesto (o un `admin`) envíe `PATCH /api/pedidos/<id>/estado` con `{estado}`, EL SISTEMA DEBERÁ aceptar solo el avance de un paso: `pendiente` a `listo` o `listo` a `entregado`.
2. SI el estado no es uno de los tres valores, o la transición no es válida (retroceder, saltar, repetir), responder `409` en transiciones inválidas y `400` en valores desconocidos.
3. SI el usuario no tiene sesión, `401`. SI no es dueño del puesto del pedido ni `admin`, `403`. SI el pedido no existe, `404`.
4. CUANDO el pedido pase a `entregado`, EL SISTEMA DEBERÁ, en la misma transacción: sumar al cliente `10 × floor(total / 50)` puntos y llamar a `registrar_consumo` para avanzar el hito de cupón por consumo en ese puesto. LA respuesta DEBERÁ ser `{pedido, puntos_otorgados, cupon_ganado}` (`cupon_ganado` es `null` salvo que el pedido complete el hito).
5. LOS puntos por un pedido DEBERÁN otorgarse **una sola vez**, aunque la petición se repita o se envíe de forma simultánea.
6. SI `total` es menor a 50, `puntos_otorgados` DEBERÁ ser 0 sin error.

### R5. Pedidos para el panel del locatario
1. `GET /api/pedidos/puesto/<puesto_id>` DEBERÁ devolver los pedidos activos (`pendiente` y `listo`) del puesto, del más antiguo al más reciente, con `items` y el nombre del cliente.
2. EL SISTEMA DEBERÁ aceptar el parámetro opcional `?estado=entregado` para ver el historial reciente (últimos 20).
3. SI el usuario no tiene sesión, `401`. SI no es dueño del puesto ni `admin`, `403`. SI el puesto no existe, `404`.

### R6. Pantalla del puesto y carrito (`puesto.html` + `pickup.js`)
**Historia:** Como comensal, quiero ver el menú y armar mi pedido.

1. CUANDO se abra `/puesto/<id>`, EL SISTEMA DEBERÁ mostrar nombre, foto, horario, descripción y menú con precios (de `GET /api/puestos/<id>`).
2. SI el puesto no existe, EL SISTEMA DEBERÁ mostrar "Puesto no encontrado" con enlace al mapa.
3. SI el puesto es `recomendado`, EL SISTEMA DEBERÁ mostrar la etiqueta "Recomendación de la comunidad. Pendiente de verificación" y ocultar menú y carrito.
4. EL SISTEMA DEBERÁ permitir agregar, quitar y cambiar la cantidad de cada producto disponible (1 a 20), y mostrar subtotal y total en vivo. Los productos no disponibles se muestran atenuados y sin botón de agregar.
5. EL carrito DEBERÁ ser de un solo puesto y conservarse en `sessionStorage` por puesto, para que sobreviva a una recarga.
6. SI el usuario con sesión tiene cupones aplicables a este puesto (`GET /api/cupones/mios?puesto_id=`), EL SISTEMA DEBERÁ ofrecer elegir uno (o ninguno), mostrar el descuento y el total resultante, y avisar si el subtotal no alcanza la compra mínima, deshabilitando ese cupón.
7. CUANDO el usuario toque "Confirmar pedido" sin sesión, EL SISTEMA DEBERÁ llevarlo a `/login?next=/puesto/<id>` conservando el carrito.
8. CUANDO la confirmación sea `201`, EL SISTEMA DEBERÁ vaciar el carrito y mostrar una pantalla de confirmación con el **código en grande**, el resumen, el cupón aplicado y su descuento si lo hubo, el total a pagar al recoger, el texto "Paga al recoger" y el nombre y horario del puesto.
9. EL botón de confirmar DEBERÁ bloquearse mientras la petición está en curso para evitar pedidos duplicados.
10. SI el servidor devuelve error, EL SISTEMA DEBERÁ mostrar su mensaje y conservar el carrito. SI un producto dejó de estar disponible, EL SISTEMA DEBERÁ ofrecer recargar el menú.

### R7. Panel del locatario (`locatario.html` + `locatario.js`)
**Historia:** Como dueño de un puesto, quiero administrar mi puesto, mi menú y mis pedidos.

1. SI el usuario no tiene sesión, redirigir a `/login?next=/locatario`. SI su rol es `cliente`, mostrar "Esta sección es para dueños de puestos".
2. EL SISTEMA DEBERÁ listar los puestos del usuario (`GET /api/puestos/mios`) y permitir elegir uno.
3. SI el usuario no tiene puestos, EL SISTEMA DEBERÁ mostrar el formulario de alta (nombre, categoría, descripción, horario, ubicación con pin en mapa y productos iniciales) que envía `POST /api/puestos/crear`.
4. EL SISTEMA DEBERÁ permitir editar los datos y la ubicación del puesto (`PUT /api/puestos/<id>`).
5. EL SISTEMA DEBERÁ permitir agregar un producto, cambiar nombre y precio, y activar o desactivar su disponibilidad con un interruptor (`POST /api/puestos/<id>/productos`, `PATCH /api/productos/<id>`). NO habrá eliminación de productos.
6. EL SISTEMA DEBERÁ mostrar un **tablero de pedidos** con las columnas "Pendientes" y "Listos", que se actualice solo cada 10 s mientras la pestaña esté visible (y se pause cuando esté oculta).
7. CADA tarjeta de pedido DEBERÁ mostrar el código, cliente, renglones, total y hora, y un botón con la acción siguiente ("Marcar listo", "Marcar entregado"). TRAS "entregado" el pedido sale del tablero.
8. EL SISTEMA DEBERÁ avisar visualmente (y con un sonido breve opcional) cuando llegue un pedido nuevo.
9. EL SISTEMA DEBERÁ validar los formularios antes de enviar (nombre no vacío, precio mayor que 0, coordenadas elegidas) y mostrar los errores del servidor.
10. EL SISTEMA DEBERÁ permitir buscar un código (`ANT-482`) para encontrar rápidamente un pedido.

### R8. Perfil y lealtad (`perfil.html` + `perfil.js`)
**Historia:** Como comensal, quiero ver mis puntos, mi nivel y mis pedidos.

1. SI no hay sesión, redirigir a `/login?next=/perfil`.
2. EL SISTEMA DEBERÁ mostrar nombre, puntos, insignia actual (*Explorador de Banqueta*, *Cazador de Garnachas* o *Maestro del Antojo*) y una barra de progreso hacia el siguiente nivel con los puntos faltantes. EN el nivel máximo, mostrar un mensaje de felicitación en lugar de la barra.
3. EL SISTEMA DEBERÁ mostrar la sección "Mis cupones" con código, monto, a qué puesto aplica (o "Cualquier puesto verificado"), vigencia y compra mínima, y una explicación breve de cómo se ganan: recomendar puestos (cada 5, con máximo 3 por día contando) y pedir en el mismo puesto (cada 5 pedidos entregados de al menos $50). También DEBERÁ explicar que los puntos suben el nivel y no se canjean.
4. EL SISTEMA DEBERÁ listar los pedidos con código, puesto, total, estado y fecha. Los pedidos `pendiente` y `listo` DEBERÁN aparecer arriba bajo "Códigos activos", con el código en grande.
5. CUANDO existan pedidos activos, EL SISTEMA DEBERÁ refrescar su estado cada 15 s mientras la pestaña esté visible, para que el cliente vea cuándo está "listo".
6. EL SISTEMA DEBERÁ mostrar "Tu progreso" con una barra para recomendaciones (por ejemplo 2 de 5) y una barra por cada puesto donde el usuario tenga pedidos entregados (por ejemplo "Tacos El Güero: 4 de 5"), con el nombre del puesto. Un cupón vigente DEBERÁ ofrecer el botón "Usar en un pedido" que lleva al mapa (o a `/puesto/<id>` si el cupón es de un puesto).
7. EL SISTEMA DEBERÁ ofrecer "Cerrar sesión".

### R9. Seguridad y consistencia
1. TODAS las rutas de pedidos DEBERÁN validar sesión y permisos en el servidor, nunca solo en la interfaz.
2. EL SISTEMA DEBERÁ usar consultas parametrizadas y bloqueo de la fila del usuario (`SELECT ... FOR UPDATE`) o actualizaciones condicionadas donde afecten puntos y estado.
3. TODO texto de BD (nombres, productos, cliente) DEBERÁ insertarse en el DOM con `textContent`.
4. EL SISTEMA NO DEBERÁ aceptar de forma directa en el cuerpo: `total`, `descuento_aplicado`, `estado` inicial, `codigo_pickup` ni `cliente_id` (el cliente sale de la sesión).

### R10. Pruebas automatizadas
1. LAS rutas de pedidos DEBERÁN tener pruebas en `tests/test_pedidos.py` que cubran cada regla y error de R1 a R5 (ver diseño).
2. LA lógica pura del cliente (carrito, totales, cupones aplicables, validaciones) DEBERÁ estar en funciones exportables con pruebas en `static/js/tests/pickup.test.js` (`node --test`).
3. DEBERÁ existir una prueba de integración del ciclo completo: el cliente con 4 pedidos entregados hace un quinto pedido, el locatario lo avanza a `entregado`, se emite el cupón, el cliente lo usa en un pedido nuevo con el descuento correcto, y el perfil refleja puntos, cupón usado y progreso.
