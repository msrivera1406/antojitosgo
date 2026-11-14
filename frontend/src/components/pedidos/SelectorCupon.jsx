import { Ticket } from 'lucide-react';
import { dinero } from '../../lib/formato.js';
import { compraMinimaCupon, cuponUtilizable } from '../../lib/carrito.js';

/**
 * Permite elegir un cupón (o ninguno). Si el subtotal no alcanza la compra mínima, el cupón se
 * deshabilita y se explica por qué, con texto y no solo con color.
 */
export default function SelectorCupon({ cupones, seleccionadoId, subtotal, onElegir }) {
  if (cupones.length === 0) return null;
  const opcion = (activo, deshabilitado) =>
    `flex min-h-[3.25rem] cursor-pointer items-center gap-3 rounded-suave border-2 p-3 transition focus-within:ring-4 focus-within:ring-primario-100 ${
      deshabilitado ? 'cursor-not-allowed border-tinta-100 bg-tinta-50 text-tinta-600' : activo ? 'border-primario-600 bg-primario-50' : 'border-tinta-200 bg-white hover:border-primario-300'
    }`;

  return (
    <fieldset className="space-y-2">
      <legend className="flex items-center gap-2 font-extrabold text-tinta-900">
        <Ticket className="h-5 w-5 text-primario-600" aria-hidden="true" />
        Usar un cupón
      </legend>
      <label className={opcion(seleccionadoId === null, false)}>
        <input type="radio" name="cupon" className="h-5 w-5 accent-primario-600" checked={seleccionadoId === null} onChange={() => onElegir(null)} />
        <span className="font-bold">Sin cupón</span>
      </label>
      {cupones.map((c) => {
        const utilizable = cuponUtilizable(c, subtotal);
        return (
          <label key={c.id} className={opcion(seleccionadoId === c.id, !utilizable)}>
            <input
              type="radio"
              name="cupon"
              className="h-5 w-5 accent-primario-600"
              disabled={!utilizable}
              checked={seleccionadoId === c.id}
              onChange={() => onElegir(c.id)}
            />
            <span className="min-w-0">
              <span className="block font-bold">
                {dinero(c.monto)} de descuento <span className="font-mono text-etiqueta">({c.codigo})</span>
              </span>
              <span className="block text-etiqueta">
                {utilizable ? (c.puesto ? `Solo en ${c.puesto.nombre}` : 'Cualquier puesto verificado') : `Compra mínima de ${dinero(compraMinimaCupon(c))}`}
              </span>
            </span>
          </label>
        );
      })}
    </fieldset>
  );
}
