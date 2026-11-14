import { Ticket } from 'lucide-react';
import Boton from '../ui/Boton.jsx';
import { dinero, fechaCorta, diasRestantes } from '../../lib/formato.js';
import { compraMinimaCupon } from '../../lib/carrito.js';

/** Cupón con código, monto, alcance, vigencia y compra mínima. `accion` es opcional ("Usar en un pedido"). */
export default function CuponCard({ cupon, mostrarAccion = true, destacado = false }) {
  const destino = cupon.puesto ? `/puesto/${cupon.puesto.id}` : '/';
  const dias = diasRestantes(cupon.vence_en);
  return (
    <article
      className={`relative overflow-hidden rounded-tarjeta border-2 border-dashed bg-white p-4 ${
        destacado ? 'border-primario-600 bg-primario-50' : 'border-primario-300'
      }`}
    >
      <div className="flex items-start gap-3">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primario-600 text-white">
          <Ticket className="h-6 w-6" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-titulo-2 font-black text-primario-800">{dinero(cupon.monto)} de descuento</p>
          <p className="font-mono text-subtitulo font-bold tracking-wider text-tinta-900">{cupon.codigo}</p>
          <p className="text-etiqueta text-tinta-700">
            {cupon.puesto ? `Solo en ${cupon.puesto.nombre}` : 'Cualquier puesto verificado'}
          </p>
          <p className="text-etiqueta text-tinta-700">Compra mínima de {dinero(compraMinimaCupon(cupon))}</p>
          <p className="text-etiqueta font-bold text-tinta-700">
            Vence el {fechaCorta(cupon.vence_en)} ({dias === 1 ? 'queda 1 día' : `quedan ${dias} días`})
          </p>
        </div>
      </div>
      {mostrarAccion && (
        <Boton to={destino} variante="secundario" tamano="chico" className="mt-3 w-full">
          Usar en un pedido
        </Boton>
      )}
    </article>
  );
}
