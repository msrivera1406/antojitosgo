import { Clock, Store } from 'lucide-react';
import Boton from '../ui/Boton.jsx';
import Alerta from '../ui/Alerta.jsx';
import { nombreDeCategoria } from '../ui/IconoCategoria.jsx';
import FotoPuesto from './FotoPuesto.jsx';
import ComoLlegar from './ComoLlegar.jsx';
import EtiquetaEstatus, { TEXTO_RECOMENDADO } from './EtiquetaEstatus.jsx';
import { formatearDistancia } from '../../lib/geo.js';

/**
 * Contenido del panel al elegir un puesto. En móvil es compacto (sin foto y con la descripción
 * resumida) para dejar el mapa a la vista. Todo el texto se inserta como texto, nunca como HTML.
 */
export default function DetallePuesto({ puesto }) {
  const verificado = puesto.estatus === 'verificado';
  return (
    <div className="space-y-3 md:space-y-4">
      <div className="hidden md:block">
        <FotoPuesto puesto={puesto} className="h-40 w-full rounded-tarjeta" iconoClase="h-14 w-14" />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <EtiquetaEstatus estatus={puesto.estatus} />
        <span className="rounded-full bg-tinta-100 px-3 py-1 text-etiqueta font-bold text-tinta-700">{nombreDeCategoria(puesto.categoria)}</span>
      </div>
      {puesto.horario && (
        <p className="flex items-center gap-2 font-semibold text-tinta-700">
          <Clock className="h-5 w-5 shrink-0 text-primario-600" aria-hidden="true" />
          <span>
            Horario: {puesto.horario}
            {Number.isFinite(puesto.distancia_m) && <span className="font-normal text-tinta-600"> · a {formatearDistancia(puesto.distancia_m)}</span>}
          </span>
        </p>
      )}
      {puesto.descripcion && <p className="line-clamp-1 text-tinta-700 md:line-clamp-none">{puesto.descripcion}</p>}
      {!verificado && <Alerta tipo="info">{TEXTO_RECOMENDADO}</Alerta>}
      <div className="flex flex-wrap items-center gap-2">
        <ComoLlegar puesto={puesto} />
        <Boton to={`/puesto/${puesto.id}`} icono={Store} className="min-w-0 flex-1">
          {verificado ? 'Ver menú y reseñas' : 'Ver reseñas'}
        </Boton>
      </div>
    </div>
  );
}
