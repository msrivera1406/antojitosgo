import { Clock, User } from 'lucide-react';
import Boton from '../ui/Boton.jsx';
import Etiqueta from '../ui/Etiqueta.jsx';
import { accionSiguiente } from '../../lib/pedidos.js';
import { dinero, hora } from '../../lib/formato.js';

/** Pedido en el tablero: código, cliente, renglones, total, hora y la acción siguiente. */
export default function TarjetaPedido({ pedido, nuevo = false, onAvanzar, avanzando }) {
  const accion = accionSiguiente(pedido.estado);
  return (
    <article
      className={`space-y-3 rounded-tarjeta border-2 bg-white p-4 shadow-tarjeta transition ${nuevo ? 'animate-subir border-primario-600' : 'border-transparent'}`}
    >
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-titulo-2 font-black tracking-wider text-primario-800">{pedido.codigo_pickup}</p>
          <p className="flex items-center gap-1.5 text-etiqueta font-semibold text-tinta-700">
            <User className="h-4 w-4" aria-hidden="true" />
            {pedido.cliente?.nombre ?? 'Cliente'}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          {nuevo && <Etiqueta tono="primario">Nuevo</Etiqueta>}
          <p className="flex items-center gap-1.5 text-etiqueta font-semibold text-tinta-700">
            <Clock className="h-4 w-4" aria-hidden="true" />
            {hora(pedido.creado_en)}
          </p>
        </div>
      </header>

      <ul className="space-y-0.5 border-t border-tinta-100 pt-3">
        {pedido.items.map((it) => (
          <li key={it.producto_id} className="flex justify-between gap-3 text-tinta-800">
            <span>
              <span className="font-bold">{it.cantidad} x </span>
              {it.nombre}
            </span>
          </li>
        ))}
      </ul>

      <p className="flex justify-between border-t border-tinta-100 pt-3 text-subtitulo font-black text-tinta-900">
        <span>Total</span>
        <span>{dinero(pedido.total)}</span>
      </p>

      {accion && (
        <Boton
          className="w-full"
          variante={pedido.estado === 'pendiente' ? 'primario' : 'secundario'}
          cargando={avanzando}
          onClick={() => onAvanzar(pedido, accion.estado)}
        >
          {accion.etiqueta}
        </Boton>
      )}
    </article>
  );
}
