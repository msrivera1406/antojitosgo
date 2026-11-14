const MONEDA = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });

export function dinero(valor) {
  const n = Number(valor);
  return Number.isFinite(n) ? MONEDA.format(n) : MONEDA.format(0);
}

export function hora(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false });
}

export function fechaCorta(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function diasRestantes(iso, ahora = new Date()) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 0;
  return Math.max(0, Math.ceil((d.getTime() - ahora.getTime()) / 86400000));
}
