const moneda = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });

/** 35 -> "$35.00". Devuelve '' si no es un número. */
export function formatearPrecio(valor) {
  return Number.isFinite(valor) ? moneda.format(valor) : '';
}
