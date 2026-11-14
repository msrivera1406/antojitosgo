import { lazy, Suspense } from 'react';
import { Esqueleto } from '../ui/Cargando.jsx';

const SelectorPunto = lazy(() => import('./SelectorPunto.jsx'));

export default function SelectorPuntoCarga(props) {
  return (
    <Suspense fallback={<Esqueleto className="h-64 w-full" />}>
      <SelectorPunto {...props} />
    </Suspense>
  );
}
