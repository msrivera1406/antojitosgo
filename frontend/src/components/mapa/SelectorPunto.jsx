import { useEffect, useRef, useState } from 'react';
import { LocateFixed } from 'lucide-react';
import FondoMapa from './FondoMapa.jsx';
import Boton from '../ui/Boton.jsx';
import { useUbicacion } from '../../context/UbicacionContext.jsx';
import { calcularRecuadro, aPorcentaje, desdePorcentaje } from './posicion.js';

const RECUADRO = calcularRecuadro([]);

/**
 * ESPACIO RESERVADO PARA EL MAPA DE SELECCIÓN (tarea aparte).
 * Contrato: valor { latitud, longitud } | null, onChange({ latitud, longitud }), error (texto).
 * El mapa real coloca o mueve un pin con un toque. Además de tocar, siempre se ofrece
 * "Usar mi ubicación actual" para quien no puede apuntar con precisión en un mapa.
 */
export default function SelectorPunto({ valor, onChange, error, id }) {
  const { ubicacion, solicitar, estado } = useUbicacion();
  const ref = useRef(null);
  const [esperando, setEsperando] = useState(false);

  // Si la ubicación llega después de tocar el botón, se usa en cuanto esté disponible.
  useEffect(() => {
    if (esperando && ubicacion) {
      onChange({ latitud: ubicacion.lat, longitud: ubicacion.lng });
      setEsperando(false);
    }
  }, [esperando, ubicacion, onChange]);

  const alTocar = (e) => {
    const caja = ref.current.getBoundingClientRect();
    onChange(desdePorcentaje((e.clientX - caja.left) / caja.width, (e.clientY - caja.top) / caja.height, RECUADRO));
  };

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
        ref={ref}
        id={id}
        role="button"
        tabIndex={0}
        aria-label="Espacio del mapa para marcar la ubicación. Toca para colocar el pin."
        data-espacio-mapa
        onClick={alTocar}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onChange({ latitud: 19.4326, longitud: -99.1332 });
          }
        }}
        className={`relative h-56 w-full cursor-crosshair overflow-hidden rounded-tarjeta border-2 ${error ? 'border-peligro' : 'border-tinta-200'}`}
      >
        <FondoMapa texto="Aquí se integrará el mapa de selección" />
        {valor && (
          <span
            aria-hidden="true"
            className="absolute h-6 w-6 -translate-x-1/2 -translate-y-full rounded-full rounded-br-none border-4 border-white bg-primario-600 shadow-elevada"
            style={{ ...aPorcentaje(valor, RECUADRO), transform: 'translate(-50%, -100%) rotate(45deg)' }}
          />
        )}
      </div>
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
