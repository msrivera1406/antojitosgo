import { AttributionControl, Map as MapaGL, NavigationControl, setWorkerUrl } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
// MapLibre 6 carga su worker desde un archivo aparte. Vite lo emite como asset y aquí se le indica dónde.
import urlWorker from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';
import { AREA_METROPOLITANA, CENTRO_CDMX, TILE_ATRIBUCION, TILE_URL, VISTA } from './mapaConfig.js';

setWorkerUrl(urlWorker);

const ESTILO = {
  version: 8,
  sources: {
    osm: { type: 'raster', tiles: [TILE_URL], tileSize: 256, maxzoom: 19, attribution: TILE_ATRIBUCION },
  },
  layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
};

const LIMITES = [
  [AREA_METROPOLITANA.lng[0], AREA_METROPOLITANA.lat[0]],
  [AREA_METROPOLITANA.lng[1], AREA_METROPOLITANA.lat[1]],
];

/**
 * Crea un mapa MapLibre con teselas de OpenStreetMap y su atribución visible (abajo a la izquierda).
 * `pitch` 0 da vista cenital. Los controles de zoom y brújula van arriba a la izquierda.
 */
export function crearMapaBase(contenedor, { pitch = 0, zoom = VISTA.zoomInicial, centro = CENTRO_CDMX } = {}) {
  const mapa = new MapaGL({
    container: contenedor,
    style: ESTILO,
    center: centro,
    zoom,
    minZoom: VISTA.zoomMin,
    maxZoom: VISTA.zoomMax,
    pitch,
    maxPitch: VISTA.pitchMax,
    maxBounds: LIMITES,
    attributionControl: false,
  });
  mapa.addControl(new AttributionControl({ compact: true }), 'bottom-left');
  mapa.addControl(new NavigationControl({ visualizePitch: true, showCompass: true }), 'top-left');
  return mapa;
}

/** Vuelve a medir el mapa cuando su contenedor cambia de tamaño (por ejemplo al alternar Mapa y Lista). */
export function ajustarAlTamano(mapa, contenedor) {
  const observador = new ResizeObserver(() => mapa.resize());
  observador.observe(contenedor);
  return () => observador.disconnect();
}
