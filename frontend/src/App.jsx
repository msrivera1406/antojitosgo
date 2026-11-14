import { useCallback, useState } from 'react';
import Mapa from './components/Mapa.jsx';
import PanelPuesto from './components/PanelPuesto.jsx';
import { useGeolocalizacion } from './hooks/useGeolocalizacion.js';
import { usePuestosCercanos } from './hooks/usePuestosCercanos.js';
import { AREA_METROPOLITANA } from './lib/config.js';
import { dentroDelArea } from './lib/geo.js';

const AVISOS = {
  solicitando: 'Buscando tu ubicación…',
  denegado: 'Sin permiso de ubicación. Actívalo en el navegador para ver puestos cerca de ti.',
  no_disponible: 'No pudimos obtener tu ubicación. Mostrando la Ciudad de México.',
  timeout: 'Tu ubicación tardó demasiado en responder. Mostrando la Ciudad de México.',
};

const claseAviso = 'rounded-xl bg-white/95 px-4 py-2 text-sm text-gray-800 shadow-lg';

export default function App() {
  const { estado, posicion, precision, rumbo } = useGeolocalizacion();
  const [siguiendo, setSiguiendo] = useState(true);
  const [seleccionadoId, setSeleccionadoId] = useState(null);

  const dentro = posicion !== null && dentroDelArea(posicion, AREA_METROPOLITANA);
  const posicionValida = dentro ? posicion : null;
  const { puestos, estado: estadoPuestos, reintentar } = usePuestosCercanos(posicionValida);

  const aviso =
    estado === 'activo' && !dentro
      ? 'Estás fuera del área metropolitana de la CDMX. Por ahora Antojito solo cubre esa zona.'
      : AVISOS[estado];
  const sinPuestos = estadoPuestos === 'ok' && puestos.length === 0;
  const seleccionado = puestos.find((p) => p.id === seleccionadoId) ?? null;

  // Al elegir un puesto la cámara deja de seguir al usuario para no alejarse de él.
  const seleccionar = useCallback((id) => {
    setSeleccionadoId(id);
    if (id !== null) setSiguiendo(false);
  }, []);

  return (
    <div className="relative h-dvh w-screen overflow-hidden bg-gray-100">
      <Mapa
        posicion={posicionValida}
        precision={precision}
        rumbo={rumbo}
        siguiendo={siguiendo}
        onSeguirChange={setSiguiendo}
        puestos={puestos}
        seleccionadoId={seleccionadoId}
        onSeleccionar={seleccionar}
      />
      <div className="pointer-events-none absolute inset-x-3 top-3 z-20 flex flex-col gap-2">
        {aviso && (
          <div role="status" className={claseAviso}>
            {aviso}
          </div>
        )}
        {sinPuestos && (
          <div role="status" className={claseAviso}>
            No hay puestos registrados en esta zona todavía.
          </div>
        )}
        {estadoPuestos === 'error' && (
          <div role="alert" className={`${claseAviso} pointer-events-auto flex items-center justify-between gap-3`}>
            <span>No pudimos cargar los puestos.</span>
            <button type="button" onClick={reintentar} className="font-semibold text-blue-700">
              Reintentar
            </button>
          </div>
        )}
      </div>
      {seleccionado && (
        <PanelPuesto key={seleccionado.id} puesto={seleccionado} onCerrar={() => seleccionar(null)} />
      )}
    </div>
  );
}
