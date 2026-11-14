import { Receipt } from 'lucide-react';
import Etiqueta from '../ui/Etiqueta.jsx';
import EstadoVacio from '../ui/EstadoVacio.jsx';
import Boton from '../ui/Boton.jsx';
import { etiquetaEstado } from '../../lib/pedidos.js';
import { dinero, fechaCorta } from '../../lib/formato.js';

export default function HistorialPedidos({ pedidos }) {
  return (
    <section aria-labelledby="titulo-pedidos" className="space-y-3">
      <h2 id="titulo-pedidos" className="seccion-titulo">
        Mis pedidos
      </h2>
      {pedidos.length === 0 ? (
        <EstadoVacio icono={Receipt} titulo="Aún no has pedido" accion={<Boton to="/">Explorar el mapa</Boton>}>
          Cuando hagas tu primer pedido para recoger, aparecerá aquí.
        </EstadoVacio>
      ) : (
        <ul className="divide-y divide-tinta-100 overflow-hidden rounded-tarjeta bg-white shadow-tarjeta">
          {pedidos.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <p className="font-extrabold text-tinta-900">{p.puesto.nombre}</p>
                <p className="text-etiqueta text-tinta-600">
                  <span className="font-mono font-bold">{p.codigo_pickup}</span> · {fechaCorta(p.creado_en)}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <span className="font-black text-tinta-900">{dinero(p.total)}</span>
                <Etiqueta tono={p.estado === 'entregado' ? 'neutro' : p.estado === 'listo' ? 'verificado' : 'aviso'}>{etiquetaEstado(p.estado)}</Etiqueta>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
