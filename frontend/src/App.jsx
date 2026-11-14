import { useState } from 'react';
import Mapa from './components/Mapa.jsx';
import { useGeolocalizacion } from './hooks/useGeolocalizacion.js';
import { AREA_METROPOLITANA } from './lib/config.js';
import { dentroDelArea } from './lib/geo.js';

const AVISOS = {
  solicitando: 'Buscando tu ubicación…',
  denegado: 'Sin permiso de ubicación. Actívalo en el navegador para ver puestos cerca de ti.',
  no_disponible: 'No pudimos obtener tu ubicación. Mostrando la Ciudad de México.',
  timeout: 'Tu ubicación tardó demasiado en responder. Mostrando la Ciudad de México.',
};

export default function App() {
  const { estado, posicion, precision, rumbo } = useGeolocalizacion();
  const [siguiendo, setSiguiendo] = useState(true);

  const dentro = posicion !== null && dentroDelArea(posicion, AREA_METROPOLITANA);
  const aviso =
    estado === 'activo' && !dentro
      ? 'Estás fuera del área metropolitana de la CDMX. Por ahora Antojito solo cubre esa zona.'
      : AVISOS[estado];

  return (
    <div className="relative h-dvh w-screen overflow-hidden bg-gray-100">
      <Mapa
        posicion={dentro ? posicion : null}
        precision={precision}
        rumbo={rumbo}
        siguiendo={siguiendo}
        onSeguirChange={setSiguiendo}
      />
      {aviso && (
        <div
          role="status"
          className="pointer-events-none absolute inset-x-3 top-3 rounded-xl bg-white/95 px-4 py-2 text-sm text-gray-800 shadow-lg"
        >
          {aviso}
        </div>
      )}
    </div>
  );
}
