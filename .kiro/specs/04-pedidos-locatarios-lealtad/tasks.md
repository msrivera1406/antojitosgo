# Plan de tareas: Pedidos, Locatarios y Lealtad (Integrante 4)

Hasta que Int. 1 entregue la Fase 0, se puede trabajar en la lógica pura del cliente (tarea 5) y escribir las pruebas del backend.

## Fase 1: Backend de pedidos (`routes/pedidos_routes.py`)

- [ ] 1. Crear pedido
  - [ ] 1.1 Validación del cuerpo y fusión de renglones repetidos
  - [ ] 1.2 Verificación de puesto verificado y de productos disponibles del puesto
  - [ ] 1.3 Cálculo de subtotal con `Decimal` desde precios de BD
  - [ ] 1.4 Cupones: validar y consumir con `utils/cupones.py` (dueño, uso, vigencia, puesto, compra mínima), y rechazo de pedidos en el propio puesto
  - [ ] 1.5 Generación de `ANT-###` único entre activos, bloqueo de la fila del puesto y manejo de agotamiento
  - [ ] 1.6 Inserción de `pedidos` y `detalle_pedidos` en una transacción
  - [ ] 1.7 Pruebas de los grupos "Crear", "Código" y "Cupones" (`tests/test_pedidos.py`)
  - _Requisitos: R1, R2, R3, R9, R10.1_
- [ ] 2. Cambiar estado y otorgar puntos
  - [ ] 2.1 `PATCH /api/pedidos/<id>/estado` con transiciones de un paso, permisos y `FOR UPDATE`
  - [ ] 2.2 Suma de puntos y emisión del cupón por consumo (`registrar_consumo`) al pasar a `entregado`, devolviendo `cupon_ganado`
  - [ ] 2.3 Pruebas de los grupos "Estado" y "Puntos"
  - _Requisitos: R4, R9, R10.1_
- [ ] 3. Pedidos del puesto
  - [ ] 3.1 `GET /api/pedidos/puesto/<id>` con activos, `?estado=entregado`, items y cliente (sin email)
  - [ ] 3.2 Pruebas del grupo "Panel"
  - [ ] 3.3 `GET /api/cupones/mios` con filtro `puesto_id` y sus pruebas
  - _Requisitos: R5, R10.1_
- [ ] 4. Prueba de integración del ciclo completo (5.º pedido entregado emite cupón, se usa en un pedido nuevo, perfil actualizado)
  - _Requisitos: R10.3_

## Fase 2: Lógica pura del cliente con pruebas

- [ ] 5. Funciones puras y `static/js/tests/pickup.test.js`
  - [ ] 5.1 Carrito (`agregarAlCarrito`, `cambiarCantidad`, `calcularSubtotal` en centavos, persistencia con `storage`)
  - [ ] 5.2 Cupones (`cuponesAplicables`, `calcularDescuento`, `calcularTotal`, `armarPayloadPedido`, `formatearMXN`)
  - [ ] 5.3 Panel (`validarPuesto`, `validarProducto`, `agruparPedidos`, `detectarNuevos`, `siguienteAccion`, `filtrarPorCodigo`)
  - [ ] 5.4 Perfil (`progresoInsignia`, `porcentajeHito`, `describirCupon`, `diasRestantes`, `separarPedidos`)
  - [ ] 5.5 Ejecutar con `node --test static/js/tests/`
  - _Requisitos: R6.4 a R6.6, R7.9, R8, R10.2_

## Fase 3: Pantallas

- [ ] 6. `puesto.html` + `pickup.js`
  - [ ] 6.1 Cabecera del puesto, etiqueta de recomendado y estado "no encontrado"
  - [ ] 6.2 Menú con productos disponibles y no disponibles
  - [ ] 6.3 Carrito con cantidades, totales en vivo y persistencia en `sessionStorage`
  - [ ] 6.4 Selector de cupón aplicable (con motivo cuando no aplica)
  - [ ] 6.5 Confirmación: bloqueo de doble envío, redirección al login conservando el carrito, manejo de errores
  - [ ] 6.6 Pantalla de código con el código en grande y "Paga al recoger"
  - _Requisitos: R6_
- [ ] 7. `locatario.html` + `locatario.js`
  - [ ] 7.1 Guardas de acceso por sesión y rol
  - [ ] 7.2 Selección de puesto y formulario de alta con mapa y productos iniciales
  - [ ] 7.3 Edición del puesto y del menú (interruptor de disponibilidad)
  - [ ] 7.4 Tablero de pedidos con sondeo de 10 s, pausa con la pestaña oculta, aviso de pedido nuevo y búsqueda por código
  - [ ] 7.5 Botones de avance de estado con bloqueo durante la petición
  - _Requisitos: R7_
- [ ] 8. `perfil.html` + `perfil.js`
  - [ ] 8.1 Puntos, insignia y barra de progreso de nivel
  - [ ] 8.1b "Mis cupones" y "Tu progreso" (recomendaciones y consumo por puesto)
  - [ ] 8.2 "Códigos activos" con sondeo de 15 s, e historial
  - [ ] 8.3 Explicación de cómo ganar cupones y puntos, y cierre de sesión
  - _Requisitos: R8_
- [ ] 9. `static/css/pedidos.css` (Mobile-First, ver diseño)
  - _Requisitos: R6 a R8_

## Fase 4: Integración y verificación

- [ ] 10. Integración con Int. 1 e Int. 2: quitar datos de ejemplo, comprobar las formas JSON del contrato compartido y que "Ver menú y pedir" abre `/puesto/<id>`
- [ ] 11. Prueba manual de extremo a extremo con dos dispositivos (cliente y locatario)
  - [ ] Cliente con cupón vigente pide y ve el descuento
  - [ ] El locatario ve el pedido en menos de 10 s
  - [ ] "Marcar listo" se refleja en el perfil del cliente en menos de 15 s
  - [ ] "Marcar entregado" suma los puntos esperados
  - [ ] El 5.º pedido entregado en el mismo puesto emite un cupón visible en el perfil del cliente
  - [ ] Probar en 320 px de ancho
  - _Requisitos: R6 a R8_
- [ ] 12. Punto de control: `pytest tests/test_pedidos.py` y `node --test static/js/tests/pickup.test.js` pasan, y `docker compose exec web pytest` completo en verde
  - _Requisitos: R10_

## Dependencias con otras specs
* **Recibe de Int. 1:** `db_cursor`, `utils/auth.py`, `utils/puntos.py`, `conftest.py`, blueprint `pedidos` vacío, semillas, `GET /api/puestos/<id>`, `/mios`, `POST /crear`, `PUT`, productos y `GET /usuarios/<id>/perfil`.
* **Recibe de Int. 2:** `base.html`, `api.js`, `auth.js`, `styles.css` y el patrón de mapa con pin.
* **Entrega:** `/puesto/<id>`, `/locatario`, `/perfil` y las rutas de pedidos.

## Diseño UX/UI (transversal)
- [ ] D1. Evaluar la interfaz de esta spec contra `.kiro/steering/diseno-ux-ui.md`, listar problemas visuales y de usabilidad, y corregir solo lo necesario
- [ ] D2. Usar únicamente los tokens, la escala tipográfica y los componentes del sistema de diseño (sin colores, fuentes ni espaciados sueltos)
- [ ] D3. Cubrir los estados de carga, error, vacío, éxito y deshabilitado de cada pantalla
- [ ] D4. Verificar accesibilidad: contraste AA, objetivos de 44 px, foco visible, teclado, lector de pantalla, texto ampliable y `prefers-reduced-motion`
- [ ] D5. Probar en móvil (Chrome Android y Safari iOS), tableta y escritorio, y pasar la lista de la sección 12 del prompt de diseño
