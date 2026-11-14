import { LoaderCircle } from 'lucide-react';

export default function Cargando({ texto = 'Cargando', className = '' }) {
  return (
    <div role="status" className={`flex items-center justify-center gap-3 p-8 text-tinta-600 ${className}`}>
      <LoaderCircle className="h-6 w-6 animate-spin text-primario-600" aria-hidden="true" />
      <span className="font-semibold">{texto}...</span>
    </div>
  );
}

/** Bloque gris de relleno mientras llega el contenido. */
export function Esqueleto({ className = '' }) {
  return <div aria-hidden="true" className={`animate-pulse rounded-suave bg-tinta-100 ${className}`} />;
}
