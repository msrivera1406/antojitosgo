import { UtensilsCrossed } from 'lucide-react';
import Etiqueta from '../ui/Etiqueta.jsx';
import { dinero } from '../../lib/formato.js';

/** Menú de consulta: nombre y precio. Los productos agotados se atenúan y lo dicen con texto. */
export default function MenuPuesto({ productos }) {
  return (
    <section aria-labelledby="titulo-menu" className="rounded-panel bg-white p-5 shadow-tarjeta">
      <h2 id="titulo-menu" className="flex items-center gap-2 text-titulo-2">
        <UtensilsCrossed className="h-6 w-6 text-primario-600" aria-hidden="true" />
        Menú
      </h2>
      {productos.length === 0 ? (
        <p className="py-4 text-tinta-600">Este puesto aún no publica su menú.</p>
      ) : (
        <ul className="mt-2 divide-y divide-tinta-100">
          {productos.map((p) => (
            <li key={p.id} className={`flex items-center justify-between gap-3 py-3.5 ${p.disponible ? '' : 'opacity-60'}`}>
              <span className="min-w-0 font-bold text-tinta-900">{p.nombre}</span>
              <span className="flex shrink-0 items-center gap-2">
                {!p.disponible && <Etiqueta tono="neutro">Agotado</Etiqueta>}
                <span className="font-extrabold text-primario-800">{dinero(p.precio)}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-3 text-etiqueta text-tinta-600">Precios publicados por el puesto. Pueden cambiar en el lugar.</p>
    </section>
  );
}
