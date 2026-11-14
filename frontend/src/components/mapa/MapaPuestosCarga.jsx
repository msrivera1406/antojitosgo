import { lazy, Suspense } from 'react';
import Cargando from '../ui/Cargando.jsx';

// MapLibre pesa mucho: se descarga solo cuando se muestra un mapa.
const MapaPuestos = lazy(() => import('./MapaPuestos.jsx'));

export default function MapaPuestosCarga(props) {
  return (
    <Suspense fallback={<Cargando texto="Cargando el mapa" className="min-h-[22rem] flex-1 bg-crema-200" />}>
      <MapaPuestos {...props} />
    </Suspense>
  );
}
