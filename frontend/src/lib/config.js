// Configuración del mapa. Los valores de área deben coincidir con config.CDMX_BBOX del backend.
export const AREA_METROPOLITANA = {
  lat: [19.0, 19.9],
  lng: [-99.45, -98.75],
};

// [lng, lat] es el orden que usa MapLibre.
export const CENTRO_CDMX = [-99.1332, 19.4326];

export const TILE_URL =
  import.meta.env.VITE_TILE_URL || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
export const TILE_ATRIBUCION =
  '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors';

export const VISTA = {
  zoomInicial: 12,
  zoomUsuario: 17,
  zoomMin: 9,
  zoomMax: 19,
  pitchPrimeraPersona: 60,
  pitchMax: 70,
};

// Lecturas con peor precisión que esto (en metros) se descartan si ya hay una mejor.
export const PRECISION_MAX_METROS = 100;
