/** Cliente de la API. La ubicación solo viaja como parámetros de consulta y no se guarda. */

export function urlCercanos({ lat, lng, radio, categoria, estatus }) {
  const parametros = new URLSearchParams({ lat: String(lat), lng: String(lng) });
  if (radio) parametros.set('radio', String(radio));
  if (categoria) parametros.set('categoria', categoria);
  if (estatus) parametros.set('estatus', estatus);
  return `/api/puestos/cercanos?${parametros}`;
}

export async function obtenerCercanos(consulta, { signal } = {}) {
  const respuesta = await fetch(urlCercanos(consulta), { signal, credentials: 'same-origin' });
  if (!respuesta.ok) {
    let mensaje = 'No pudimos cargar los puestos';
    try {
      mensaje = (await respuesta.json()).error || mensaje;
    } catch {
      /* la respuesta no era JSON */
    }
    throw new Error(mensaje);
  }
  return respuesta.json();
}
