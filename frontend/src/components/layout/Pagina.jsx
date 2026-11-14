import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

/** Contenedor de página con encabezado opcional y enlace para volver. */
export default function Pagina({ titulo, subtitulo, volverA, volverTexto = 'Volver', estrecha = false, children }) {
  return (
    <div className={`${estrecha ? 'pagina-estrecha' : 'pagina'} animate-aparecer space-y-6 py-6 md:py-8`}>
      {(titulo || volverA) && (
        <header className="space-y-2">
          {volverA && (
            <Link
              to={volverA}
              className="inline-flex min-h-toque items-center gap-1.5 rounded-suave pr-3 font-bold text-primario-700 hover:text-primario-900"
            >
              <ArrowLeft className="h-5 w-5" aria-hidden="true" />
              {volverTexto}
            </Link>
          )}
          {titulo && <h1 className="text-titulo-1">{titulo}</h1>}
          {subtitulo && <p className="max-w-prose text-subtitulo text-tinta-600">{subtitulo}</p>}
        </header>
      )}
      {children}
    </div>
  );
}
