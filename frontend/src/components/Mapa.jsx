import { useEffect, useRef, useState } from 'react';
import { AttributionControl, Map as MapaGL, Marker, NavigationControl } from 'maplibre-gl';
import {
  AREA_METROPOLITANA,
  CENTRO_CDMX,
  TILE_ATRIBUCION,
  TILE_URL,
  VISTA,
} from '../lib/config.js';
import { circuloGeoJSON } from '../lib/geo.js';

const ESTILO = {
  version: 8,
  sources: {
    osm: {
      type: 'raster',
      tiles: [TILE_URL],
      tileSize: 256,
      maxzoom: 19,
      attribution: TILE_ATRIBUCION,
    },
  },
  layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
};

const LIMITES = [
  [AREA_METROPOLITANA.lng[0], AREA_METROPOLITANA.lat[0]],
  [AREA_METROPOLITANA.lng[1], AREA_METROPOLITANA.lat[1]],
];

const FUENTE_PRECISION = 'precision-gps';

function crearElementoUsuario() {
  const raiz = document.createElement('div');
  raiz.className = 'relative h-6 w-6';
  raiz.innerHTML = `
    <div data-flecha class="absolute left-1/2 -top-2 hidden -translate-x-1/2 border-x-[7px] border-b-[12px] border-x-transparent border-b-blue-600"></div>
    <div class="h-6 w-6 rounded-full border-[3px] border-white bg-blue-600 shadow-lg"></div>`;
  return raiz;
}

/**
 * Mapa MapLibre GL con vista inclinada tipo primera persona.
 * `siguiendo` = la cámara sigue al usuario. Se apaga cuando el usuario arrastra el mapa.
 */
export default function Mapa({ posicion, precision, rumbo, siguiendo, onSeguirChange }) {
  const contenedorRef = useRef(null);
  const mapaRef = useRef(null);
  const marcadorRef = useRef(null);
  const primerAjusteRef = useRef(true);
  const [listo, setListo] = useState(false);
  const [inclinado, setInclinado] = useState(true);

  // Crear el mapa una sola vez.
  useEffect(() => {
    const mapa = new MapaGL({
      container: contenedorRef.current,
      style: ESTILO,
      center: CENTRO_CDMX,
      zoom: VISTA.zoomInicial,
      minZoom: VISTA.zoomMin,
      maxZoom: VISTA.zoomMax,
      pitch: VISTA.pitchPrimeraPersona,
      maxPitch: VISTA.pitchMax,
      maxBounds: LIMITES,
      attributionControl: false,
    });
    mapa.addControl(new AttributionControl({ compact: true }), 'bottom-left');
    mapa.addControl(new NavigationControl({ visualizePitch: true }), 'top-right');
    mapa.on('load', () => {
      mapa.addSource(FUENTE_PRECISION, {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });
      mapa.addLayer({
        id: 'precision-relleno',
        type: 'fill',
        source: FUENTE_PRECISION,
        paint: { 'fill-color': '#2563eb', 'fill-opacity': 0.15 },
      });
      setListo(true);
    });
    // originalEvent solo existe cuando el usuario arrastra, no cuando la cámara se mueve por código.
    mapa.on('dragstart', (e) => {
      if (e.originalEvent) onSeguirChange(false);
    });
    mapa.on('pitchend', () => setInclinado(mapa.getPitch() > 10));
    mapaRef.current = mapa;
    return () => {
      mapa.remove();
      mapaRef.current = null;
      marcadorRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Marcador, círculo de precisión y flecha de rumbo.
  useEffect(() => {
    const mapa = mapaRef.current;
    if (!mapa || !listo) return;
    if (!posicion) {
      marcadorRef.current?.remove();
      marcadorRef.current = null;
      mapa.getSource(FUENTE_PRECISION)?.setData({ type: 'FeatureCollection', features: [] });
      return;
    }
    if (!marcadorRef.current) {
      marcadorRef.current = new Marker({
        element: crearElementoUsuario(),
        rotationAlignment: 'map',
        pitchAlignment: 'viewport',
      })
        .setLngLat([posicion.lng, posicion.lat])
        .addTo(mapa);
    }
    const marcador = marcadorRef.current;
    marcador.setLngLat([posicion.lng, posicion.lat]);
    marcador.setRotation(rumbo ?? 0);
    marcador.getElement().querySelector('[data-flecha]').classList.toggle('hidden', rumbo === null);
    mapa
      .getSource(FUENTE_PRECISION)
      ?.setData(circuloGeoJSON(posicion, Math.max(precision ?? 0, 1)));
  }, [posicion, precision, rumbo, listo]);

  // Cámara: sigue al usuario mientras `siguiendo` esté activo.
  useEffect(() => {
    const mapa = mapaRef.current;
    if (!mapa || !listo || !posicion || !siguiendo) return;
    const destino = { center: [posicion.lng, posicion.lat], duration: 800 };
    if (rumbo !== null) destino.bearing = rumbo;
    if (primerAjusteRef.current) {
      destino.zoom = VISTA.zoomUsuario;
      destino.duration = 1500;
      primerAjusteRef.current = false;
    }
    mapa.easeTo(destino);
  }, [posicion, rumbo, siguiendo, listo]);

  const alternarInclinacion = () => {
    const mapa = mapaRef.current;
    if (!mapa) return;
    mapa.easeTo({ pitch: inclinado ? 0 : VISTA.pitchPrimeraPersona, duration: 600 });
  };

  const claseBoton =
    'rounded-full bg-white px-4 py-2 text-sm font-medium text-gray-900 shadow-lg active:bg-gray-100 disabled:opacity-40';

  return (
    <div className="relative h-full w-full">
      <div ref={contenedorRef} className="h-full w-full" />
      <div className="pointer-events-none absolute inset-x-0 bottom-8 flex justify-center gap-3">
        <button
          type="button"
          className={`${claseBoton} pointer-events-auto`}
          onClick={alternarInclinacion}
          disabled={!listo}
        >
          {inclinado ? 'Vista cenital' : 'Vista 3D'}
        </button>
        <button
          type="button"
          className={`${claseBoton} pointer-events-auto`}
          onClick={() => onSeguirChange(true)}
          disabled={!posicion || siguiendo}
        >
          Centrar en mí
        </button>
      </div>
    </div>
  );
}
