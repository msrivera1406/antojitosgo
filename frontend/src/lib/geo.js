// Funciones geográficas puras (sin DOM ni dependencias) para poder probarlas con node --test.

const RADIO_TIERRA_M = 6371008.8;
const aRadianes = (grados) => (grados * Math.PI) / 180;

/** Distancia en metros entre dos puntos {lat, lng} (fórmula de Haversine). */
export function distanciaMetros(a, b) {
  const dLat = aRadianes(b.lat - a.lat);
  const dLng = aRadianes(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(aRadianes(a.lat)) * Math.cos(aRadianes(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * RADIO_TIERRA_M * Math.asin(Math.sqrt(h));
}

/** true si el punto cae dentro del área {lat: [min, max], lng: [min, max]}. */
export function dentroDelArea(punto, area) {
  if (!punto || !Number.isFinite(punto.lat) || !Number.isFinite(punto.lng)) return false;
  return (
    punto.lat >= area.lat[0] &&
    punto.lat <= area.lat[1] &&
    punto.lng >= area.lng[0] &&
    punto.lng <= area.lng[1]
  );
}

/**
 * Decide si una lectura nueva reemplaza a la anterior.
 * Una lectura imprecisa (> maxPrecision) solo se acepta si no empeora la que ya había.
 */
export function aceptarLectura(anterior, nueva, maxPrecision) {
  if (!anterior) return true;
  if (nueva.precision <= maxPrecision) return true;
  return nueva.precision <= anterior.precision;
}

/** Normaliza un rumbo a [0, 360). Devuelve null si no es un número válido. */
export function normalizarRumbo(grados) {
  if (!Number.isFinite(grados)) return null;
  return ((grados % 360) + 360) % 360;
}

/**
 * Polígono GeoJSON que aproxima un círculo de `radioM` metros alrededor de `centro` {lat, lng}.
 * Se usa para dibujar el círculo de precisión del GPS.
 */
export function circuloGeoJSON(centro, radioM, pasos = 48) {
  const coordenadas = [];
  const dLat = (radioM / RADIO_TIERRA_M) * (180 / Math.PI);
  const dLng = dLat / Math.cos(aRadianes(centro.lat));
  for (let i = 0; i <= pasos; i += 1) {
    const angulo = (i / pasos) * 2 * Math.PI;
    coordenadas.push([centro.lng + dLng * Math.cos(angulo), centro.lat + dLat * Math.sin(angulo)]);
  }
  return { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [coordenadas] } };
}

/** Traduce un GeolocationPositionError (o su código numérico) a un estado de la app. */
export function estadoDesdeError(codigo) {
  if (codigo === 1) return 'denegado'; // PERMISSION_DENIED
  if (codigo === 3) return 'timeout'; // TIMEOUT
  return 'no_disponible'; // POSITION_UNAVAILABLE u otro
}

/**
 * ¿Hay que volver a consultar los puestos? Sí si no hay consulta previa, si el usuario se movió
 * `umbralM` metros o más desde la última, o si pasó `intervaloMs` desde la última.
 * `ultima` = { pos: {lat, lng}, ms } de la última consulta, o null.
 */
export function debeRefrescar(ultima, pos, ahoraMs, { umbralM = 50, intervaloMs = 30000 } = {}) {
  if (!pos) return false;
  if (!ultima) return true;
  if (distanciaMetros(ultima.pos, pos) >= umbralM) return true;
  return ahoraMs - ultima.ms >= intervaloMs;
}

/** 355 -> "355 m", 1240 -> "1.2 km". */
export function formatearDistancia(metros) {
  if (!Number.isFinite(metros)) return '';
  if (metros < 1000) return `${Math.round(metros)} m`;
  return `${(metros / 1000).toFixed(1)} km`;
}
