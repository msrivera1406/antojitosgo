export const ESTADOS_PEDIDO = {
  pendiente: { etiqueta: 'En preparación', descripcion: 'El puesto está preparando tu pedido.' },
  listo: { etiqueta: 'Listo para recoger', descripcion: 'Ya puedes pasar por él.' },
  entregado: { etiqueta: 'Entregado', descripcion: 'Pedido completado.' },
};

export const PASOS_PEDIDO = ['pendiente', 'listo', 'entregado'];

export function etiquetaEstado(estado) {
  return ESTADOS_PEDIDO[estado]?.etiqueta ?? 'Desconocido';
}

export function esActivo(pedido) {
  return pedido.estado === 'pendiente' || pedido.estado === 'listo';
}

/** Acción del locatario para el siguiente estado, o null si no hay. */
export function accionSiguiente(estado) {
  if (estado === 'pendiente') return { estado: 'listo', etiqueta: 'Marcar listo' };
  if (estado === 'listo') return { estado: 'entregado', etiqueta: 'Marcar entregado' };
  return null;
}

/** Coincidencia de código ANT-482 sin importar mayúsculas, guion ni espacios. */
export function coincideCodigo(pedido, consulta) {
  const limpio = (s) => String(s ?? '').toUpperCase().replace(/[\s-]/g, '');
  const q = limpio(consulta);
  return q === '' || limpio(pedido.codigo_pickup).includes(q);
}
