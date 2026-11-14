import { CircleCheck, Clock } from 'lucide-react';
import Boton from '../ui/Boton.jsx';
import ResumenPedido from './ResumenPedido.jsx';

/** Pantalla tras un pedido creado: el código en grande, el resumen y dónde y cuándo recogerlo. */
export default function ConfirmacionPedido({ pedido, puesto }) {
  return (
    <div className="animate-subir space-y-6">
      <div className="space-y-3 text-center">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-verificado-suave text-verificado">
          <CircleCheck className="h-9 w-9" aria-hidden="true" />
        </span>
        <h1 className="text-titulo-1">Tu pedido está en camino a la cocina</h1>
        <p className="text-tinta-600">Muestra este código en el puesto para recoger tu pedido.</p>
      </div>

      <div className="rounded-panel border-2 border-primario-600 bg-primario-50 p-6 text-center">
        <p className="text-etiqueta font-extrabold uppercase tracking-wide text-primario-800">Tu código</p>
        <p className="font-mono text-[3rem] font-black leading-tight tracking-widest text-primario-800 sm:text-[3.5rem]" aria-label={`Código ${pedido.codigo_pickup.split('').join(' ')}`}>
          {pedido.codigo_pickup}
        </p>
      </div>

      <div className="rounded-tarjeta bg-white p-5 shadow-tarjeta">
        <ResumenPedido renglones={pedido.items} subtotal={pedido.subtotal} descuento={pedido.descuento_aplicado} total={pedido.total} />
        {pedido.cupon && <p className="mt-3 text-etiqueta font-bold text-tinta-700">Cupón aplicado: {pedido.cupon.codigo}</p>}
        <p className="mt-4 rounded-suave bg-crema-100 p-3 text-center font-extrabold text-tinta-900">Paga al recoger</p>
      </div>

      <div className="space-y-1 rounded-tarjeta bg-white p-5 shadow-tarjeta">
        <p className="font-extrabold text-tinta-900">{puesto.nombre}</p>
        {puesto.horario && (
          <p className="flex items-center gap-2 text-tinta-700">
            <Clock className="h-5 w-5 text-primario-600" aria-hidden="true" />
            Horario: {puesto.horario}
          </p>
        )}
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <Boton to="/perfil" tamano="grande">
          Ver mis pedidos
        </Boton>
        <Boton to="/" variante="secundario" tamano="grande">
          Volver al mapa
        </Boton>
      </div>
    </div>
  );
}
