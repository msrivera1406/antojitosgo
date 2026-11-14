import { dinero } from '../../lib/formato.js';

/** Renglones, subtotal, descuento y total. Se usa en el carrito y en la confirmación. */
export default function ResumenPedido({ renglones, subtotal, descuento = 0, total, etiquetaTotal = 'Total a pagar al recoger' }) {
  return (
    <div className="space-y-3">
      <ul className="divide-y divide-tinta-100">
        {renglones.map((r) => (
          <li key={r.producto_id} className="flex items-start justify-between gap-3 py-2">
            <span className="min-w-0">
              <span className="font-bold text-tinta-900">{r.cantidad} x </span>
              {r.nombre}
            </span>
            <span className="shrink-0 font-bold text-tinta-800">{dinero(r.subtotal ?? r.precio * r.cantidad)}</span>
          </li>
        ))}
      </ul>
      <dl className="space-y-1.5 border-t border-tinta-200 pt-3">
        <div className="flex justify-between text-tinta-700">
          <dt>Subtotal</dt>
          <dd className="font-bold">{dinero(subtotal)}</dd>
        </div>
        {descuento > 0 && (
          <div className="flex justify-between font-bold text-verificado">
            <dt>Descuento del cupón</dt>
            <dd>- {dinero(descuento)}</dd>
          </div>
        )}
        <div className="flex justify-between text-subtitulo font-black text-tinta-900">
          <dt>{etiquetaTotal}</dt>
          <dd>{dinero(total)}</dd>
        </div>
      </dl>
    </div>
  );
}
