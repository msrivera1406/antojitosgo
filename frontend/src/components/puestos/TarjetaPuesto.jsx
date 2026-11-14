import { Clock, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { nombreDeCategoria } from '../ui/IconoCategoria.jsx';
import FotoPuesto from './FotoPuesto.jsx';
import EtiquetaEstatus from './EtiquetaEstatus.jsx';

/**
 * Tarjeta de lista. Misma estructura para todos los puestos: foto, nombre, categoría, horario,
 * estatus y acción. Los datos que no existen simplemente no se muestran.
 */
export default function TarjetaPuesto({ puesto, seleccionado = false, onElegir }) {
  const verificado = puesto.estatus === 'verificado';
  return (
    <article
      className={`overflow-hidden rounded-tarjeta border-2 bg-white shadow-tarjeta transition ${
        seleccionado ? 'border-primario-600 ring-4 ring-primario-100' : 'border-transparent hover:border-primario-200'
      }`}
    >
      <div className="flex gap-3 p-3">
        <FotoPuesto puesto={puesto} className="h-24 w-24 shrink-0 rounded-suave" />
        <div className="min-w-0 flex-1 space-y-1.5">
          <h3 className="text-subtitulo font-extrabold leading-snug text-tinta-900">
            <button
              type="button"
              onClick={() => onElegir?.(puesto.id)}
              aria-pressed={seleccionado}
              className="-my-2 flex min-h-toque w-full items-center rounded text-left hover:text-primario-800"
            >
              {puesto.nombre}
            </button>
          </h3>
          <p className="text-etiqueta font-semibold text-tinta-600">{nombreDeCategoria(puesto.categoria)}</p>
          {puesto.horario && (
            <p className="flex items-center gap-1.5 text-etiqueta text-tinta-700">
              <Clock className="h-4 w-4 shrink-0" aria-hidden="true" />
              {puesto.horario}
            </p>
          )}
          <EtiquetaEstatus estatus={puesto.estatus} />
        </div>
      </div>
      {(
        <Link
          to={`/puesto/${puesto.id}`}
          className="flex min-h-toque items-center justify-between border-t border-tinta-100 bg-crema-100 px-4 font-bold text-primario-800 transition hover:bg-primario-50"
        >
          {verificado ? 'Ver menú y reseñas' : 'Ver reseñas'}
          <ChevronRight className="h-5 w-5" aria-hidden="true" />
        </Link>
      )}
    </article>
  );
}
