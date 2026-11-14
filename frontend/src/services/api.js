import { USAR_DUMMY } from './config.js';

export class ApiError extends Error {
  constructor(status, mensaje) {
    super(mensaje);
    this.name = 'ApiError';
    this.status = status;
    this.mensaje = mensaje;
  }
}

/**
 * Cliente único de la API. Envía y recibe JSON (o FormData), incluye cookies y lanza ApiError
 * con el campo `error` de la respuesta. Ante 401 el llamador decide si redirige al login.
 */
export async function apiFetch(url, { metodo = 'GET', cuerpo, formData } = {}) {
  if (USAR_DUMMY) {
    const { responderDummy } = await import('./mock/router.js');
    return responderDummy(metodo, url, formData ?? cuerpo);
  }

  const opciones = { method: metodo, credentials: 'same-origin', headers: { Accept: 'application/json' } };
  if (formData) {
    opciones.body = formData; // El navegador fija el Content-Type con su frontera.
  } else if (cuerpo !== undefined) {
    opciones.headers['Content-Type'] = 'application/json';
    opciones.body = JSON.stringify(cuerpo);
  }

  let respuesta;
  try {
    respuesta = await fetch(url, opciones);
  } catch {
    throw new ApiError(0, 'Sin conexión. Inténtalo de nuevo.');
  }

  let datos = null;
  try {
    datos = await respuesta.json();
  } catch {
    /* respuesta sin cuerpo JSON */
  }
  if (!respuesta.ok) {
    throw new ApiError(respuesta.status, datos?.error ?? 'Ocurrió un error inesperado.');
  }
  return datos;
}
