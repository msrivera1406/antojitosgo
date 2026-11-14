import { useEffect, useRef, useState } from 'react';
import { Marker } from 'maplibre-gl';
import { LocateFixed } from 'lucide-react';
import Boton from '../ui/Boton.jsx';
import { useUbicacion } from '../../context/UbicacionContext.jsx';
import { crearMapaBase, ajustarAlTamano } from '../../lib/mapaBase.js';
import { VISTA } from '../../lib/mapaConfig.js';
import { crearElementoPunto } from './pinsDom.js';

/**
 * Mapa para marcar una ubicación con un toque. El pin se puede arrastrar para afinarlo.
 * valor { latitud, longitud } | null, onChange({ latitud, longitud }), error (texto).
 * Siempre se ofrece "Usar mi ubicación actual" para quien no puede apuntar con precisión.
 */
export default function SelectorPunto({ valor, onChange, error, id }) {
  const { ubicacion, solicitar, estado, centro } = useUbicacion();
  const contenedorRef = useRef(null);
  const mapaRef = useRef(null);
  const marcadorRef = useRef(null);
  const alCambiarRef = useRef(onChange);
  alCambiarRef.current = onChange;
  const [esperando, setEsperando] = useState(false);

  useEffect(() => {
    const mapa = crearMapaBase(contenedorRef.current, { centro: [centro.lng, centro.lat], zoom: VISTA.zoomInicial + 1 });
    mapa.on('click', (e) => alCambiarRef.current({ latitud: Number(e.lngLat.lat.toFixed(8)), longitud: Number(e.lngLat.lng.toFixed(8)) }));
    const soltar = ajustarAlTamano(mapa, contenedorRef.current);
    mapaRef.current = mapa;
    return () => {
      soltar();
      mapa.remove();
      mapaRef.current = null;
      marcadorRef.current = null;
    };
    // El centro inicial solo importa al crear el mapa.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Dibuja o mueve el pin cuando cambia el valor.
  useEffect(() => {
    const mapa = mapaRef.current;
    if (!mapa) return;
    if (!valor) {
      marcadorRef.current?.remove();
      marcadorRef.current = null;
      return;
    }
    if (!marcadorRef.current) {
      const marcador = new Marker({ element: crearElementoPunto(), anchor: 'bottom', draggable: true }).setLngLat([valor.longitud, valor.latitud]).addTo(mapa);
      marcador.on('dragend', () => {
        const { lat, lng } = marcador.getLngLat();
        alCambiarRef.current({ latitud: Number(lat.toFixed(8)), longitud: Number(lng.toFixed(8)) });
      });
      marcadorRef.current = marcador;
    } else {
      marcadorRef.current.setLngLat([valor.longitud, valor.latitud]);
    }
    mapa.easeTo({ center: [valor.longitud, valor.latitud], duration: 400 });
  }, [valor?.latitud, valor?.longitud]); // eslint-disable-line react-hooks/exhaustive-deps

  // Si la ubicación llega después de tocar el botón, se usa en cuanto esté disponible.
  useEffect(() => {
    if (esperando && ubicacion) {
      onChange({ latitud: ubicacion.lat, longitud: ubicacion.lng });
      setEsperando(false);
    }
  }, [esperando, ubicacion, onChange]);

  const usarMiUbicacion = () => {
    if (ubicacion) onChange({ latitud: ubicacion.lat, longitud: ubicacion.lng });
    else {
      setEsperando(true);
      solicitar();
    }
  };

  return (
    <div className="space-y-3">
      <div
        id={id}
        ref={contenedorRef}
        role="application"
        aria-label="Mapa para marcar la ubicación. Toca el mapa para colocar el pin."
        className={`h-64 w-full overflow-hidden rounded-tarjeta border-2 ${error ? 'border-peligro' : 'border-tinta-200'}`}
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Boton variante="secundario" tamano="chico" icono={LocateFixed} cargando={estado === 'buscando'} onClick={usarMiUbicacion}>
          Usar mi ubicación actual
        </Boton>
        <p className="text-etiqueta font-semibold text-tinta-600" aria-live="polite">
          {valor ? 'Ubicación marcada' : 'Aún no marcas la ubicación'}
        </p>
      </div>
    </div>
  );
}
