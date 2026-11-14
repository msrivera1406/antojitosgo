/** Convierte coordenadas a porcentaje dentro del recuadro del espacio reservado (solo vista previa). */
export function calcularRecuadro(puntos, margen = 0.15) {
  const validos = puntos.filter((p) => Number.isFinite(p.latitud) && Number.isFinite(p.longitud));
  if (validos.length === 0) return { latMin: 19.41, latMax: 19.45, lngMin: -99.17, lngMax: -99.11 };
  const lats = validos.map((p) => p.latitud);
  const lngs = validos.map((p) => p.longitud);
  const dLat = Math.max(Math.max(...lats) - Math.min(...lats), 0.01);
  const dLng = Math.max(Math.max(...lngs) - Math.min(...lngs), 0.01);
  return {
    latMin: Math.min(...lats) - dLat * margen,
    latMax: Math.max(...lats) + dLat * margen,
    lngMin: Math.min(...lngs) - dLng * margen,
    lngMax: Math.max(...lngs) + dLng * margen,
  };
}

export function aPorcentaje({ latitud, longitud }, r) {
  return {
    left: `${((longitud - r.lngMin) / (r.lngMax - r.lngMin)) * 100}%`,
    top: `${(1 - (latitud - r.latMin) / (r.latMax - r.latMin)) * 100}%`,
  };
}

export function desdePorcentaje(x, y, r) {
  return {
    latitud: Number((r.latMax - y * (r.latMax - r.latMin)).toFixed(8)),
    longitud: Number((r.lngMin + x * (r.lngMax - r.lngMin)).toFixed(8)),
  };
}
