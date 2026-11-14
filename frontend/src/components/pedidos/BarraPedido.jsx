import { ShoppingBag } from 'lucide-react';
import { dinero } from '../../lib/formato.js';

/** Barra fija en móvil con el total y un salto al resumen del pedido. */
export default function BarraPedido({ piezas, total, destino = '#pedido' }) {
  if (piezas === 0) return null;
  return (
    <div className="fixed inset-x-0 z-30 px-4 pb-3 md:hidden" style={{ bottom: 'calc(4.5rem + env(safe-area-inset-bottom))' }}>
      <a
        href={destino}
        className="flex min-h-[3.25rem] items-center justify-between gap-3 rounded-full bg-primario-600 px-5 font-extrabold text-white shadow-elevada transition active:scale-[0.98]"
      >
        <span className="flex items-center gap-2">
          <ShoppingBag className="h-5 w-5" aria-hidden="true" />
          Ver mi pedido ({piezas})
        </span>
        <span>{dinero(total)}</span>
      </a>
    </div>
  );
}
