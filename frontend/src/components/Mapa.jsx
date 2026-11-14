import { useEffect, useRef, useState } from 'react';
import {
  AttributionControl,
  Map as MapaGL,
  Marker,
  NavigationControl,
  setWorkerUrl,
} from 'maplibre-gl';
// MapLibre 6 carga su worker desde un archivo aparte. Vite lo emite como asset y aquí se le indica dónde.
import urlWorker from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';
import {
  AREA_METROPOLITANA,
  CENTRO_CDMX,
  TILE_ATRIBUCION,
  TILE_URL,
  VISTA,
} from '../lib/config.js';
import { iconoDeCategoria } from '../lib/categorias.js';
import { circuloGeoJSON } from '../lib/geo.js';

setWorkerUrl(urlWorker);

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

// Sin `transition`: MapLibre mueve cada marcador con `transform`, y animarlo lo retrasa respecto al mapa.
const CLASE_BASE_PUESTO =
  'flex h-10 w-10 items-center justify-center rounded-full border-4 bg-white text-xl shadow-lg';

function crearElementoPuesto(puesto) {
  const boton = document.createElement('button');
  boton.type = 'button';
  const borde = puesto.estatus === 'verificado' ? 'border-green-600' : 'border-orange-500';
  boton.className = `${CLASE_BASE_PUESTO} ${borde}`;
  boton.textContent = iconoDeCategoria(puesto.categoria);
  boton.setAttribute('aria-label', puesto.nombre);
  return boton;
}

/**
 * Mapa MapLibre GL con vista inclinada tipo primera persona.
 * `siguiendo` = la cámara sigue al usuario. Se apaga cuando el usuario arrastra el mapa.
 */
export default function Mapa({
  posicion,
  precision,
  rumbo,
  siguiendo,
  onSeguirChange,
  puestos,
  seleccionadoId,
  onSeleccionar,
}) {
  const contenedorRef = useRef(null);
  const mapaRef = useRef(null);
  const marcadorRef = useRef(null);
  const primerAjusteRef = useRef(true);
  const marcadoresPuestosRef = useRef(new Map()); // id -> { marcador, clave }
  const alSeleccionarRef = useRef(onSeleccionar);
  alSeleccionarRef.current = onSeleccionar;
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
    // Un toque en el mapa vacío deselecciona. Los marcadores detienen la propagación del clic.
    mapa.on('click', () => alSeleccionarRef.current(null));
    mapaRef.current = mapa;
    return () => {
      mapa.remove();
      mapaRef.current = null;
      marcadorRef.current = null;
      marcadoresPuestosRef.current.clear();
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

  // Marcadores de puestos: se agregan, quitan y reemplazan según cambie la lista.
  useEffect(() => {
    const mapa = mapaRef.current;
    if (!mapa || !listo) return;
    const actuales = marcadoresPuestosRef.current;
    const ids = new Set(puestos.map((p) => p.id));
    for (const [id, { marcador }] of actuales) {
      if (!ids.has(id)) {
        marcador.remove();
        actuales.delete(id);
      }
    }
    for (const puesto of puestos) {
      const clave = `${puesto.estatus}|${puesto.categoria}|${puesto.nombre}`;
      const previo = actuales.get(puesto.id);
      if (previo && previo.clave === clave) {
        previo.marcador.setLngLat([puesto.longitud, puesto.latitud]);
        continue;
      }
      previo?.marcador.remove();
      const elemento = crearElementoPuesto(puesto);
      elemento.addEventListener('click', (evento) => {
        evento.stopPropagation();
        alSeleccionarRef.current(puesto.id);
      });
      const marcador = new Marker({ element: elemento })
        .setLngLat([puesto.longitud, puesto.latitud])
        .addTo(mapa);
      actuales.set(puesto.id, { marcador, clave });
    }
  }, [puestos, listo]);

  // Resalta el marcador seleccionado.
  useEffect(() => {
    for (const [id, { marcador }] of marcadoresPuestosRef.current) {
      const activo = id === seleccionadoId;
      const el = marcador.getElement();
      el.classList.toggle('scale-125', activo);
      el.style.zIndex = activo ? '10' : '';
    }
  }, [seleccionadoId, puestos, listo]);

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
