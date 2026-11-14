export const MAX_CANTIDAD = 20;
export const MAX_RENGLONES = 30;
export const FACTOR_COMPRA_MIN = 3;

/** Carrito: arreglo de { producto_id, nombre, precio, cantidad }. Siempre se devuelve uno nuevo. */
export function agregarProducto(carrito, producto) {
  const existente = carrito.find((r) => r.producto_id === producto.id);
  if (existente) return cambiarCantidad(carrito, producto.id, existente.cantidad + 1);
  if (carrito.length >= MAX_RENGLONES) return carrito;
  return [...carrito, { producto_id: producto.id, nombre: producto.nombre, precio: producto.precio, cantidad: 1 }];
}

export function cambiarCantidad(carrito, productoId, cantidad) {
  const n = Math.floor(Number(cantidad));
  if (!Number.isFinite(n) || n < 1) return carrito.filter((r) => r.producto_id !== productoId);
  return carrito.map((r) => (r.producto_id === productoId ? { ...r, cantidad: Math.min(MAX_CANTIDAD, n) } : r));
}

export function quitarProducto(carrito, productoId) {
  return carrito.filter((r) => r.producto_id !== productoId);
}

/** Trabaja en centavos para evitar errores de coma flotante. */
export function subtotal(carrito) {
  const centavos = carrito.reduce((acc, r) => acc + Math.round(r.precio * 100) * r.cantidad, 0);
  return centavos / 100;
}

export function totalPiezas(carrito) {
  return carrito.reduce((acc, r) => acc + r.cantidad, 0);
}

export function compraMinimaCupon(cupon) {
  return cupon.monto * FACTOR_COMPRA_MIN;
}

/** Un cupón es utilizable si el subtotal alcanza 3 veces su monto. */
export function cuponUtilizable(cupon, subtotalActual) {
  return subtotalActual >= compraMinimaCupon(cupon);
}

export function calcularTotales(carrito, cupon) {
  const sub = subtotal(carrito);
  const descuento = cupon && cuponUtilizable(cupon, sub) ? Math.min(cupon.monto, sub) : 0;
  return { subtotal: sub, descuento, total: Math.round((sub - descuento) * 100) / 100 };
}

/** Cuerpo de POST /api/pedidos. No se envían precios ni totales. */
export function armarPedido(puestoId, carrito, cupon) {
  const cuerpo = {
    puesto_id: puestoId,
    items: carrito.map((r) => ({ producto_id: r.producto_id, cantidad: r.cantidad })),
  };
  if (cupon) cuerpo.cupon_id = cupon.id;
  return cuerpo;
}

/** Descarta renglones inválidos de un carrito leído de sessionStorage. */
export function sanearCarrito(crudo) {
  if (!Array.isArray(crudo)) return [];
  return crudo
    .filter((r) => r && Number.isInteger(r.producto_id) && typeof r.nombre === 'string' && Number.isFinite(r.precio))
    .map((r) => ({
      producto_id: r.producto_id,
      nombre: r.nombre,
      precio: r.precio,
      cantidad: Math.min(MAX_CANTIDAD, Math.max(1, Math.floor(Number(r.cantidad)) || 1)),
    }))
    .slice(0, MAX_RENGLONES);
}
