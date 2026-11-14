import { useMemo } from 'react';
import { LocateFixed, LoaderCircle } from 'lucide-react';
import FondoMapa from './FondoMapa.jsx';
import PinPuesto from './PinPuesto.jsx';
import { aPorcentaje, calcularRecuadro } from './posicion.js';

/**
 * ESPACIO RESERVADO PARA EL MAPA (tarea aparte: Leaflet + OpenStreetMap).
 *
 * Contrato que debe respetar la implementación real, para sustituir este archivo sin tocar las páginas:
 *   puestos            Puesto[] ya filtrados (latitud, longitud, estatus, nombre)
 *   seleccionadoId     id del puesto con el panel abierto, o null
 *   onSeleccionar(id)  se llama al tocar un pin
 *   ubicacion          { lat, lng } | null  (para el marcador "Tú estás aquí")
 *   centro             { lat, lng }         (centro inicial; CDMX si no hay ubicación)
 *   estadoUbicacion    'sin-pedir' | 'buscando' | 'lista' | 'no-disponible'
 *   onCentrar()        botón "Centrar en mi ubicación"
 *
 * Reglas del mapa real: atribución visible de OpenStreetMap, esquina inferior derecha libre
 * (#zona-ia) y pines con la forma de PinPuesto.jsx. Aquí solo se dibujan pines de vista previa.
 */
export default function MapaPuestos({
  puestos, seleccionadoId, onSeleccionar, ubicacion, estadoUbicacion, onCentrar, children,
}) {
  const recuadro = useMemo(() => calcularRecuadro(puestos.map((p) => ({ latitud: p.latitud, longitud: p.longitud }))), [puestos]);
  const buscando = estadoUbicacion === 'buscando';

  return (
    <div id="mapa-puestos" data-espacio-mapa className="relative min-h-[22rem] w-full flex-1 overflow-hidden bg-crema-200">
      <FondoMapa />

      <div className="absolute inset-0 mt-12 mb-10">
        <div className="relative h-full w-full">
          {puestos.map((p) => (
            <PinPuesto
              key={p.id}
              estatus={p.estatus}
              nombre={p.nombre}
              seleccionado={p.id === seleccionadoId}
              onClick={() => onSeleccionar(p.id)}
              style={aPorcentaje(p, recuadro)}
            />
          ))}
          {ubicacion && (
            <span
              role="img"
              aria-label="Tú estás aquí"
              className="absolute h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-white bg-primario-600 shadow-elevada"
              style={aPorcentaje({ latitud: ubicacion.lat, longitud: ubicacion.lng }, recuadro)}
            />
          )}
        </div>
      </div>

      <div className="absolute right-3 top-14 z-10">
        <button
          type="button"
          onClick={onCentrar}
          disabled={buscando}
          className="flex min-h-toque items-center gap-2 rounded-full bg-white px-4 font-bold text-tinta-800 shadow-elevada transition hover:bg-primario-50 active:scale-95 disabled:opacity-70"
        >
          {buscando ? <LoaderCircle className="h-5 w-5 animate-spin" aria-hidden="true" /> : <LocateFixed className="h-5 w-5 text-primario-600" aria-hidden="true" />}
          <span className="hidden sm:inline">Centrar en mi ubicación</span>
          <span className="sm:hidden">Mi ubicación</span>
        </button>
      </div>

      {children}
    </div>
  );
}
