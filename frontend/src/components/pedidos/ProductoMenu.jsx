import { Plus } from 'lucide-react';
import Etiqueta from '../ui/Etiqueta.jsx';
import SelectorCantidad from './SelectorCantidad.jsx';
import { dinero } from '../../lib/formato.js';

/** Renglón del menú. Un producto no disponible se atenúa, dice "Agotado" y no tiene botón de agregar. */
export default function ProductoMenu({ producto, cantidad, onAgregar, onCambiar }) {
  const disponible = producto.disponible;
  return (
    <li className={`flex items-center justify-between gap-3 py-3.5 ${disponible ? '' : 'opacity-60'}`}>
      <div className="min-w-0">
        <p className="font-extrabold text-tinta-900">{producto.nombre}</p>
        <p className="font-bold text-primario-800">{dinero(producto.precio)}</p>
      </div>
      {!disponible && <Etiqueta tono="neutro">Agotado</Etiqueta>}
      {disponible && cantidad > 0 && <SelectorCantidad cantidad={cantidad} nombre={producto.nombre} onCambiar={(n) => onCambiar(producto.id, n)} />}
      {disponible && cantidad === 0 && (
        <button
          type="button"
          onClick={() => onAgregar(producto)}
          aria-label={`Agregar ${producto.nombre}`}
          className="inline-flex min-h-toque items-center gap-1.5 rounded-full bg-primario-600 px-4 font-bold text-white transition hover:bg-primario-700 active:scale-95"
        >
          <Plus className="h-5 w-5" aria-hidden="true" />
          Agregar
        </button>
      )}
    </li>
  );
}
