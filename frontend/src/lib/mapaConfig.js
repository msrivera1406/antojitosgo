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
  zoomInicial: 13,
  zoomUsuario: 16,
  zoomMin: 9,
  zoomMax: 19,
  pitchPrimeraPersona: 60,
  pitchMax: 70,
};

// Lecturas con peor precisión que esto (en metros) se descartan si ya hay una mejor.
export const PRECISION_MAX_METROS = 100;

// Búsqueda de puestos. Sin ubicación se muestran los del centro de la CDMX con un radio mayor.
export const RADIO_CERCANOS_M = 1500;
export const RADIO_SIN_UBICACION_M = 5000;
export const REFRESCO = { umbralM: 50, intervaloMs: 30000 };
