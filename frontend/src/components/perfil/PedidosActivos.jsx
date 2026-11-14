import { CircleCheck, ChefHat } from 'lucide-react';
import Etiqueta from '../ui/Etiqueta.jsx';
import { ESTADOS_PEDIDO } from '../../lib/pedidos.js';
import { dinero } from '../../lib/formato.js';

/** "Códigos activos": el código en grande para mostrarlo en el puesto, y su estado en palabras. */
export default function PedidosActivos({ pedidos }) {
  if (pedidos.length === 0) return null;
  return (
    <section aria-labelledby="titulo-activos" className="space-y-3">
      <h2 id="titulo-activos" className="seccion-titulo">
        Códigos activos
      </h2>
      <ul aria-live="polite" className="grid gap-3 sm:grid-cols-2">
        {pedidos.map((p) => {
          const listo = p.estado === 'listo';
          return (
            <li
              key={p.id}
              className={`space-y-2 rounded-tarjeta border-2 p-4 text-center ${listo ? 'border-verificado bg-verificado-suave' : 'border-primario-300 bg-primario-50'}`}
            >
              <Etiqueta tono={listo ? 'verificado' : 'aviso'} icono={listo ? CircleCheck : ChefHat}>
                {ESTADOS_PEDIDO[p.estado].etiqueta}
              </Etiqueta>
              <p className="font-mono text-[2.5rem] font-black leading-none tracking-widest text-tinta-900">{p.codigo_pickup}</p>
              <p className="font-bold text-tinta-800">{p.puesto.nombre}</p>
              <p className="text-etiqueta text-tinta-700">
                {ESTADOS_PEDIDO[p.estado].descripcion} Total al recoger: {dinero(p.total)}
              </p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
