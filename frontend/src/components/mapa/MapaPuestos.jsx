import { useEffect, useRef, useState } from 'react';
import { Marker } from 'maplibre-gl';
import { Box, LocateFixed, LoaderCircle, Map as IconoMapa } from 'lucide-react';
import { crearMapaBase, ajustarAlTamano } from '../../lib/mapaBase.js';
import { VISTA } from '../../lib/mapaConfig.js';
import { circuloGeoJSON } from '../../lib/geo.js';
import { crearElementoPin, crearElementoUsuario, marcarPinSeleccionado } from './pinsDom.js';

const FUENTE_PRECISION = 'precision-gps';
const CLASE_CONTROL =
  'flex min-h-toque items-center gap-2 rounded-full bg-white px-4 font-bold text-tinta-800 shadow-elevada transition hover:bg-primario-50 active:scale-95 disabled:opacity-70';

/**
 * Mapa de puestos con MapLibre GL y teselas de OpenStreetMap (atribución visible abajo a la izquierda).
 *
 * Props:
 *   puestos          Puesto[] ya filtrados
 *   seleccionadoId   id del puesto con el panel abierto, o null
 *   onSeleccionar(id) al tocar un pin (null al tocar el mapa vacío)
 *   ubicacion        { lat, lng } | null, precision (m), rumbo (0 a 360) | null
 *   estadoUbicacion  'sin-pedir' | 'buscando' | 'lista' | ...
 *   onCentrar()      pide la ubicación cuando aún no hay
 * `children` se dibuja encima (panel del puesto). Deja libre la esquina inferior derecha (#zona-ia).
 */
export default function MapaPuestos({
  puestos, seleccionadoId, onSeleccionar, ubicacion, precision, rumbo, estadoUbicacion, onCentrar, children,
}) {
  const contenedorRef = useRef(null);
  const mapaRef = useRef(null);
  const marcadorUsuarioRef = useRef(null);
  const pinesRef = useRef(new Map()); // id -> { marcador, clave }
  const alSeleccionarRef = useRef(onSeleccionar);
  alSeleccionarRef.current = onSeleccionar;
  const primerAjusteRef = useRef(true);
  const [listo, setListo] = useState(false);
  const [inclinado, setInclinado] = useState(true);
  const [siguiendo, setSiguiendo] = useState(false);
  const buscando = estadoUbicacion === 'buscando';

  // Crear el mapa una sola vez.
  useEffect(() => {
    const mapa = crearMapaBase(contenedorRef.current, { pitch: VISTA.pitchPrimeraPersona });
    mapa.on('load', () => {
      mapa.addSource(FUENTE_PRECISION, { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      mapa.addLayer({
        id: 'precision-relleno',
        type: 'fill',
        source: FUENTE_PRECISION,
        paint: { 'fill-color': '#C63B2C', 'fill-opacity': 0.15 },
      });
      setListo(true);
    });
    // originalEvent solo existe cuando la persona arrastra, no cuando la cámara se mueve por código.
    mapa.on('dragstart', (e) => e.originalEvent && setSiguiendo(false));
    mapa.on('pitchend', () => setInclinado(mapa.getPitch() > 10));
    // Un toque en el mapa vacío cierra el panel. Los pines detienen la propagación del clic.
    mapa.on('click', () => alSeleccionarRef.current(null));
    const soltar = ajustarAlTamano(mapa, contenedorRef.current);
    mapaRef.current = mapa;
    const pines = pinesRef.current;
    return () => {
      soltar();
      mapa.remove();
      mapaRef.current = null;
      marcadorUsuarioRef.current = null;
      pines.clear();
    };
  }, []);

  // Marcador "Tú estás aquí", flecha de rumbo y círculo de precisión.
  useEffect(() => {
    const mapa = mapaRef.current;
    if (!mapa || !listo) return;
    if (!ubicacion) {
      marcadorUsuarioRef.current?.remove();
      marcadorUsuarioRef.current = null;
      mapa.getSource(FUENTE_PRECISION)?.setData({ type: 'FeatureCollection', features: [] });
      return;
    }
    if (!marcadorUsuarioRef.current) {
      marcadorUsuarioRef.current = new Marker({ element: crearElementoUsuario(), rotationAlignment: 'map', pitchAlignment: 'viewport' })
        .setLngLat([ubicacion.lng, ubicacion.lat])
        .addTo(mapa);
    }
    const marcador = marcadorUsuarioRef.current;
    marcador.setLngLat([ubicacion.lng, ubicacion.lat]);
    marcador.setRotation(rumbo ?? 0);
    marcador.getElement().querySelector('[data-flecha]').classList.toggle('hidden', rumbo === null);
    mapa.getSource(FUENTE_PRECISION)?.setData(circuloGeoJSON(ubicacion, Math.max(precision ?? 0, 1)));
  }, [ubicacion, precision, rumbo, listo]);

  // Pines de puestos: se agregan, quitan y reemplazan según cambie la lista filtrada.
  useEffect(() => {
    const mapa = mapaRef.current;
    if (!mapa || !listo) return;
    const actuales = pinesRef.current;
    const ids = new Set(puestos.map((p) => p.id));
    for (const [id, { marcador }] of actuales) {
      if (!ids.has(id)) {
        marcador.remove();
        actuales.delete(id);
      }
    }
    for (const puesto of puestos) {
      const clave = `${puesto.estatus}|${puesto.nombre}`;
      const previo = actuales.get(puesto.id);
      if (previo && previo.clave === clave) {
        previo.marcador.setLngLat([puesto.longitud, puesto.latitud]);
        continue;
      }
      previo?.marcador.remove();
      const elemento = crearElementoPin(puesto);
      elemento.addEventListener('click', (evento) => {
        evento.stopPropagation();
        alSeleccionarRef.current(puesto.id);
      });
      const marcador = new Marker({ element: elemento }).setLngLat([puesto.longitud, puesto.latitud]).addTo(mapa);
      actuales.set(puesto.id, { marcador, clave });
    }
  }, [puestos, listo]);

  // Resalta el pin seleccionado y acerca la cámara a él, dejando libre la zona que tapa el panel.
  useEffect(() => {
    const mapa = mapaRef.current;
    if (!mapa || !listo) return;
    for (const [id, { marcador }] of pinesRef.current) marcarPinSeleccionado(marcador.getElement(), id === seleccionadoId);
    const puesto = puestos.find((p) => p.id === seleccionadoId);
    if (puesto) {
      setSiguiendo(false);
      const movil = window.matchMedia('(max-width: 767px)').matches;
      mapa.easeTo({
        center: [puesto.longitud, puesto.latitud],
        padding: movil ? { bottom: 210, top: 0, left: 0, right: 0 } : { left: 400, top: 0, bottom: 0, right: 0 },
        duration: 600,
      });
    } else {
      mapa.easeTo({ padding: { top: 0, bottom: 0, left: 0, right: 0 }, duration: 400 });
    }
  }, [seleccionadoId, puestos, listo]);

  // Cámara: sigue a la persona mientras `siguiendo` esté activo.
  useEffect(() => {
    const mapa = mapaRef.current;
    if (!mapa || !listo || !ubicacion || !siguiendo) return;
    const destino = { center: [ubicacion.lng, ubicacion.lat], duration: 800 };
    if (rumbo !== null) destino.bearing = rumbo;
    if (primerAjusteRef.current) {
      destino.zoom = VISTA.zoomUsuario;
      destino.duration = 1500;
      primerAjusteRef.current = false;
    }
    mapa.easeTo(destino);
  }, [ubicacion, rumbo, siguiendo, listo]);

  // Al llegar la primera lectura tras pedir la ubicación, la cámara va hacia la persona.
  useEffect(() => {
    if (ubicacion && primerAjusteRef.current) setSiguiendo(true);
  }, [ubicacion]);

  const centrar = () => {
    if (ubicacion) setSiguiendo(true);
    else {
      onCentrar();
      setSiguiendo(true);
    }
  };

  const alternarInclinacion = () => {
    mapaRef.current?.easeTo({ pitch: inclinado ? 0 : VISTA.pitchPrimeraPersona, duration: 600 });
  };

  return (
    <div id="mapa-puestos" className="relative min-h-[22rem] w-full flex-1 overflow-clip bg-crema-200">
      {/* MapLibre fija position: relative en su contenedor, por eso va dentro de un envoltorio absoluto. */}
      <div className="absolute inset-0">
        <div ref={contenedorRef} className="h-full w-full" aria-label="Mapa de puestos cercanos" />
      </div>

      <div className="absolute right-3 top-3 z-10 flex flex-col items-end gap-2">
        <button type="button" onClick={centrar} disabled={buscando || (Boolean(ubicacion) && siguiendo)} className={CLASE_CONTROL}>
          {buscando ? <LoaderCircle className="h-5 w-5 animate-spin" aria-hidden="true" /> : <LocateFixed className="h-5 w-5 text-primario-600" aria-hidden="true" />}
          <span className="hidden sm:inline">Centrar en mi ubicación</span>
          <span className="sm:hidden">Mi ubicación</span>
        </button>
        <button type="button" onClick={alternarInclinacion} disabled={!listo} className={CLASE_CONTROL} aria-pressed={inclinado}>
          {inclinado ? <IconoMapa className="h-5 w-5 text-primario-600" aria-hidden="true" /> : <Box className="h-5 w-5 text-primario-600" aria-hidden="true" />}
          {inclinado ? 'Vista cenital' : 'Vista 3D'}
        </button>
      </div>

      {children}
    </div>
  );
}
