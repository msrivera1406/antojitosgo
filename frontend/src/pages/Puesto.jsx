import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { SearchX, Clock } from 'lucide-react';
import Pagina from '../components/layout/Pagina.jsx';
import Alerta from '../components/ui/Alerta.jsx';
import Boton from '../components/ui/Boton.jsx';
import Cargando from '../components/ui/Cargando.jsx';
import EstadoVacio from '../components/ui/EstadoVacio.jsx';
import { nombreDeCategoria } from '../components/ui/IconoCategoria.jsx';
import FotoPuesto from '../components/puestos/FotoPuesto.jsx';
import EtiquetaEstatus, { TEXTO_RECOMENDADO } from '../components/puestos/EtiquetaEstatus.jsx';
import ProductoMenu from '../components/pedidos/ProductoMenu.jsx';
import CarritoPedido from '../components/pedidos/CarritoPedido.jsx';
import ConfirmacionPedido from '../components/pedidos/ConfirmacionPedido.jsx';
import BarraPedido from '../components/pedidos/BarraPedido.jsx';
import { puestosApi, pedidosApi, cuponesApi } from '../services/endpoints.js';
import { useCarga } from '../hooks/useCarga.js';
import { useCarrito } from '../hooks/useCarrito.js';
import { useAuth } from '../context/AuthContext.jsx';
import { armarPedido, calcularTotales, totalPiezas } from '../lib/carrito.js';
import { rutaLoginConNext } from '../lib/rutas.js';
import { useTitulo } from '../hooks/useTitulo.js';

export default function Puesto() {
  const { id } = useParams();
  const puestoId = Number(id);
  const navegar = useNavigate();
  const { usuario, refrescar } = useAuth();

  const detalle = useCarga(() => puestosApi.detalle(puestoId), [puestoId]);
  const puesto = detalle.datos;
  useTitulo(puesto?.nombre ?? 'Puesto');

  const { carrito, agregar, cambiar, vaciar } = useCarrito(puestoId);
  const [cuponId, setCuponId] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [errorPedido, setErrorPedido] = useState(null);
  const [pedidoCreado, setPedidoCreado] = useState(null);

  const cupones = useCarga(() => (usuario ? cuponesApi.mios(puestoId) : Promise.resolve([])), [usuario?.id, puestoId]);
  const listaCupones = cupones.datos ?? [];
  const cuponElegido = listaCupones.find((c) => c.id === cuponId) ?? null;
  const totales = useMemo(() => calcularTotales(carrito, cuponElegido), [carrito, cuponElegido]);

  // Si el subtotal baja de la compra mínima del cupón elegido, se quita para no confundir el total.
  useEffect(() => {
    if (cuponElegido && totales.descuento === 0) setCuponId(null);
  }, [cuponElegido, totales.descuento]);

  const cantidadDe = useCallback((productoId) => carrito.find((r) => r.producto_id === productoId)?.cantidad ?? 0, [carrito]);

  const confirmar = async () => {
    if (enviando) return;
    if (!usuario) {
      navegar(rutaLoginConNext(`/puesto/${puestoId}`)); // El carrito queda en sessionStorage.
      return;
    }
    setEnviando(true);
    setErrorPedido(null);
    try {
      const { pedido } = await pedidosApi.crear(armarPedido(puestoId, carrito, totales.descuento > 0 ? cuponElegido : null));
      vaciar();
      setPedidoCreado(pedido);
      refrescar();
    } catch (e) {
      if (e.status === 401) navegar(rutaLoginConNext(`/puesto/${puestoId}`));
      else setErrorPedido(e);
    } finally {
      setEnviando(false);
    }
  };

  if (detalle.cargando) return <Cargando texto="Cargando el puesto" className="flex-1" />;

  if (detalle.error) {
    return (
      <Pagina estrecha>
        <EstadoVacio
          icono={SearchX}
          titulo="Puesto no encontrado"
          accion={<Boton to="/">Volver al mapa</Boton>}
        >
          {detalle.error.status === 404 ? 'No encontramos este puesto. Puede que ya no esté disponible.' : detalle.error.mensaje}
        </EstadoVacio>
      </Pagina>
    );
  }

  if (pedidoCreado) {
    return (
      <Pagina estrecha>
        <ConfirmacionPedido pedido={pedidoCreado} puesto={puesto} />
      </Pagina>
    );
  }

  const verificado = puesto.estatus === 'verificado';
  const piezas = totalPiezas(carrito);

  return (
    <Pagina volverA="/" volverTexto="Volver al mapa">
      <div className="grid gap-6 md:grid-cols-[1fr_22rem] md:items-start lg:grid-cols-[1fr_24rem]">
        <div className="space-y-6">
          <div className="overflow-hidden rounded-panel bg-white shadow-tarjeta">
            <FotoPuesto puesto={puesto} className="h-48 w-full sm:h-64" iconoClase="h-16 w-16" />
            <div className="space-y-3 p-5">
              <div className="flex flex-wrap items-center gap-2">
                <EtiquetaEstatus estatus={puesto.estatus} />
                <span className="rounded-full bg-tinta-100 px-3 py-1 text-etiqueta font-bold text-tinta-700">{nombreDeCategoria(puesto.categoria)}</span>
              </div>
              <h1 className="text-titulo-1">{puesto.nombre}</h1>
              {puesto.horario && (
                <p className="flex items-center gap-2 font-semibold text-tinta-700">
                  <Clock className="h-5 w-5 text-primario-600" aria-hidden="true" />
                  Horario: {puesto.horario}
                </p>
              )}
              {puesto.descripcion && <p className="text-tinta-700">{puesto.descripcion}</p>}
            </div>
          </div>

          {!verificado ? (
            <Alerta tipo="info" titulo={TEXTO_RECOMENDADO}>
              Cuando el equipo lo verifique, podrás ver su menú y pedir para recoger. <Link to="/" className="font-bold text-primario-800 underline">Volver al mapa</Link>
            </Alerta>
          ) : (
            <section aria-labelledby="titulo-menu" className="rounded-panel bg-white p-5 shadow-tarjeta">
              <h2 id="titulo-menu" className="text-titulo-2">
                Menú
              </h2>
              {puesto.productos.length === 0 ? (
                <p className="py-4 text-tinta-600">Este puesto aún no publica su menú.</p>
              ) : (
                <ul className="divide-y divide-tinta-100">
                  {puesto.productos.map((p) => (
                    <ProductoMenu key={p.id} producto={p} cantidad={cantidadDe(p.id)} onAgregar={agregar} onCambiar={cambiar} />
                  ))}
                </ul>
              )}
            </section>
          )}
        </div>

        {verificado && (
          <aside id="pedido" className="scroll-mt-20 md:sticky md:top-20">
            <CarritoPedido
              carrito={carrito}
              totales={totales}
              cupones={listaCupones}
              cuponId={cuponId}
              onElegirCupon={setCuponId}
              onCambiarCantidad={cambiar}
              onConfirmar={confirmar}
              enviando={enviando}
              error={errorPedido}
              onRecargarMenu={() => {
                setErrorPedido(null);
                detalle.recargar();
              }}
            />
          </aside>
        )}
      </div>
      {verificado && piezas > 0 && <div aria-hidden="true" className="h-16 md:hidden" />}
      {verificado && <BarraPedido piezas={piezas} total={totales.total} />}
    </Pagina>
  );
}
