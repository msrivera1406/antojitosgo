import { Clock, Store } from 'lucide-react';
import Boton from '../ui/Boton.jsx';
import Alerta from '../ui/Alerta.jsx';
import { nombreDeCategoria } from '../ui/IconoCategoria.jsx';
import FotoPuesto from './FotoPuesto.jsx';
import EtiquetaEstatus, { TEXTO_RECOMENDADO } from './EtiquetaEstatus.jsx';

/** Contenido del panel inferior al elegir un puesto. Todo el texto se inserta como texto, nunca como HTML. */
export default function DetallePuesto({ puesto }) {
  return (
    <div className="space-y-4">
      <FotoPuesto puesto={puesto} className="h-28 w-full rounded-tarjeta sm:h-40" iconoClase="h-12 w-12" />
      <div className="flex flex-wrap items-center gap-2">
        <EtiquetaEstatus estatus={puesto.estatus} />
        <span className="rounded-full bg-tinta-100 px-3 py-1 text-etiqueta font-bold text-tinta-700">{nombreDeCategoria(puesto.categoria)}</span>
      </div>
      {puesto.horario && (
        <p className="flex items-center gap-2 font-semibold text-tinta-700">
          <Clock className="h-5 w-5 text-primario-600" aria-hidden="true" />
          Horario: {puesto.horario}
        </p>
      )}
      {puesto.descripcion && <p className="text-tinta-700">{puesto.descripcion}</p>}
      {puesto.estatus === 'verificado' ? (
        <Boton to={`/puesto/${puesto.id}`} icono={Store} tamano="grande" className="w-full">
          Ver menú y pedir
        </Boton>
      ) : (
        <Alerta tipo="info">{TEXTO_RECOMENDADO}</Alerta>
      )}
    </div>
  );
}
