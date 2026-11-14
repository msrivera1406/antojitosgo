const PREFIJO = '/static/uploads/';

/** Solo se acepta una foto servida por nuestro propio backend. */
export function fotoSegura(url) {
  return typeof url === 'string' && url.startsWith(PREFIJO) && !url.includes('..') ? url : null;
}
