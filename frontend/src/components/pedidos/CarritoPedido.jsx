import { ShoppingBag } from 'lucide-react';
import Boton from '../ui/Boton.jsx';
import Alerta from '../ui/Alerta.jsx';
import EstadoVacio from '../ui/EstadoVacio.jsx';
import SelectorCupon from './SelectorCupon.jsx';
import SelectorCantidad from './SelectorCantidad.jsx';
import ResumenPedido from './ResumenPedido.jsx';

/** Carrito de un solo puesto: cantidades, cupón, totales en vivo y botón de confirmar. */
export default function CarritoPedido({
  carrito, totales, cupones, cuponId, onElegirCupon, onCambiarCantidad, onConfirmar, enviando, error, onRecargarMenu,
}) {
  if (carrito.length === 0) {
    return (
      <EstadoVacio icono={ShoppingBag} titulo="Tu pedido está vacío">
        Agrega productos del menú para armar tu pedido. Lo recoges en el puesto y pagas ahí.
      </EstadoVacio>
    );
  }
  return (
    <div className="space-y-5 rounded-panel bg-white p-5 shadow-tarjeta">
      <h2 className="text-titulo-3">Tu pedido</h2>

      <ul className="divide-y divide-tinta-100">
        {carrito.map((r) => (
          <li key={r.producto_id} className="flex items-center justify-between gap-3 py-2.5">
            <span className="min-w-0 font-bold text-tinta-900">{r.nombre}</span>
            <SelectorCantidad cantidad={r.cantidad} nombre={r.nombre} onCambiar={(n) => onCambiarCantidad(r.producto_id, n)} />
          </li>
        ))}
      </ul>

      <SelectorCupon cupones={cupones} seleccionadoId={cuponId} subtotal={totales.subtotal} onElegir={onElegirCupon} />

      <ResumenPedido renglones={carrito} subtotal={totales.subtotal} descuento={totales.descuento} total={totales.total} />

      <p className="rounded-suave bg-crema-100 p-3 text-center font-bold text-tinta-800">Paga al recoger</p>

      {error && (
        <Alerta
          tipo="error"
          accion={
            error.status === 400 && onRecargarMenu ? (
              <Boton variante="secundario" tamano="chico" onClick={onRecargarMenu}>
                Recargar el menú
              </Boton>
            ) : null
          }
        >
          {error.mensaje}
        </Alerta>
      )}

      <Boton tamano="grande" className="w-full" cargando={enviando} onClick={onConfirmar}>
        Confirmar pedido
      </Boton>
    </div>
  );
}
