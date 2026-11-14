/** Solo rutas internas del mismo sitio. Evita redirecciones abiertas con `next`. */
export function esRutaInternaSegura(ruta) {
  if (typeof ruta !== 'string' || ruta.length === 0) return false;
  if (!ruta.startsWith('/')) return false;
  if (ruta.startsWith('//') || ruta.startsWith('/\\')) return false;
  if (/[\u0000-\u001f]/.test(ruta)) return false;
  return true;
}

/** `next` seguro, o /locatario para un locatario sin `next`, o /. */
export function destinoTrasLogin(usuario, next) {
  if (esRutaInternaSegura(next)) return next;
  if (usuario?.rol === 'locatario') return '/locatario';
  return '/';
}

export function rutaLoginConNext(rutaActual) {
  return `/login?next=${encodeURIComponent(rutaActual)}`;
}
