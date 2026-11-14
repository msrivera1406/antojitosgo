import { Minus, Plus } from 'lucide-react';
import { MAX_CANTIDAD } from '../../lib/carrito.js';

export default function SelectorCantidad({ cantidad, onCambiar, nombre }) {
  const boton = 'flex h-11 w-11 items-center justify-center rounded-full text-primario-700 transition hover:bg-primario-100 active:scale-90 disabled:text-tinta-400 disabled:hover:bg-transparent';
  return (
    <div role="group" aria-label={`Cantidad de ${nombre}`} className="inline-flex items-center rounded-full bg-primario-50">
      <button type="button" className={boton} onClick={() => onCambiar(cantidad - 1)} aria-label={`Quitar uno de ${nombre}`}>
        <Minus className="h-5 w-5" aria-hidden="true" />
      </button>
      <span aria-live="polite" className="w-8 text-center text-subtitulo font-extrabold text-tinta-900">
        {cantidad}
      </span>
      <button
        type="button"
        className={boton}
        onClick={() => onCambiar(cantidad + 1)}
        disabled={cantidad >= MAX_CANTIDAD}
        aria-label={`Agregar uno de ${nombre}`}
      >
        <Plus className="h-5 w-5" aria-hidden="true" />
      </button>
    </div>
  );
}
