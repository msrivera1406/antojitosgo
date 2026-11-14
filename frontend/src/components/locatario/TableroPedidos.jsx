import { useEffect, useRef, useState } from 'react';
import { Bell, BellOff, Search, Inbox, RefreshCw } from 'lucide-react';
import Alerta from '../ui/Alerta.jsx';
import EstadoVacio from '../ui/EstadoVacio.jsx';
import Boton from '../ui/Boton.jsx';
import { Esqueleto } from '../ui/Cargando.jsx';
import ColumnaPedidos from './ColumnaPedidos.jsx';
import { pedidosApi } from '../../services/endpoints.js';
import { useCarga } from '../../hooks/useCarga.js';
import { useSondeo } from '../../hooks/useSondeo.js';
import { coincideCodigo } from '../../lib/pedidos.js';

const INTERVALO_MS = 10000;

function pitido() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const ganancia = ctx.createGain();
    osc.frequency.value = 880;
    ganancia.gain.value = 0.08;
    osc.connect(ganancia).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.18);
    osc.onended = () => ctx.close();
  } catch {
    /* sin audio disponible: el aviso visual es suficiente */
  }
}

/** Tablero con "Pendientes" y "Listos". Se actualiza solo cada 10 s mientras la pestaña esté visible. */
export default function TableroPedidos({ puestoId }) {
  const { datos, setDatos, cargando, error, recargar } = useCarga(() => pedidosApi.delPuesto(puestoId), [puestoId]);
  const [consulta, setConsulta] = useState('');
  const [sonido, setSonido] = useState(false);
  const [avanzandoId, setAvanzandoId] = useState(null);
  const [errorAccion, setErrorAccion] = useState('');
  const [nuevos, setNuevos] = useState([]);
  const vistos = useRef(null);

  useSondeo(() => recargar({ silencioso: true }), INTERVALO_MS, true);

  // Detecta pedidos que no estaban en la lectura anterior para avisar con color, texto y sonido opcional.
  useEffect(() => {
    if (!datos) return;
    const ids = new Set(datos.map((p) => p.id));
    if (vistos.current) {
      const llegados = datos.filter((p) => !vistos.current.has(p.id)).map((p) => p.id);
      if (llegados.length > 0) {
        setNuevos((n) => [...new Set([...n, ...llegados])]);
        if (sonido) pitido();
      }
    }
    vistos.current = ids;
  }, [datos, sonido]);

  const avanzar = async (pedido, estado) => {
    setAvanzandoId(pedido.id);
    setErrorAccion('');
    try {
      await pedidosApi.cambiarEstado(pedido.id, estado);
      setNuevos((n) => n.filter((id) => id !== pedido.id));
      await recargar({ silencioso: true });
    } catch (e) {
      setErrorAccion(e.mensaje);
    } finally {
      setAvanzandoId(null);
    }
  };

  const visibles = (datos ?? []).filter((p) => coincideCodigo(p, consulta));
  const pendientes = visibles.filter((p) => p.estado === 'pendiente');
  const listos = visibles.filter((p) => p.estado === 'listo');

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div role="search" className="relative flex-1">
          <label htmlFor="buscar-codigo" className="sr-only">
            Buscar un código de pedido
          </label>
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-tinta-500" aria-hidden="true" />
          <input
            id="buscar-codigo"
            value={consulta}
            onChange={(e) => setConsulta(e.target.value)}
            placeholder="Buscar código, por ejemplo ANT-482"
            className="block min-h-toque w-full rounded-full border-2 border-tinta-200 bg-white pl-12 pr-4 text-base placeholder:text-tinta-500 focus:border-primario-600 focus:outline-none focus:ring-4 focus:ring-primario-100"
          />
        </div>
        <div className="flex gap-2">
          <Boton variante="secundario" icono={sonido ? Bell : BellOff} aria-pressed={sonido} onClick={() => setSonido((s) => !s)}>
            {sonido ? 'Sonido activado' : 'Sonido apagado'}
          </Boton>
          <Boton variante="terciario" icono={RefreshCw} onClick={() => recargar({ silencioso: true })} aria-label="Actualizar pedidos">
            <span className="sr-only">Actualizar</span>
          </Boton>
        </div>
      </div>

      <div aria-live="polite" className="space-y-3">
        {nuevos.length > 0 && (
          <Alerta tipo="info" titulo={nuevos.length === 1 ? 'Llegó un pedido nuevo' : `Llegaron ${nuevos.length} pedidos nuevos`}>
            Están marcados como "Nuevo" en el tablero.
          </Alerta>
        )}
        {errorAccion && <Alerta tipo="error">{errorAccion}</Alerta>}
      </div>

      {cargando && (
        <div role="status" aria-label="Cargando pedidos" className="grid gap-4 md:grid-cols-2">
          <Esqueleto className="h-48" />
          <Esqueleto className="h-48" />
        </div>
      )}
      {error && !datos && <Alerta tipo="error" titulo="No pudimos cargar los pedidos">{error.mensaje}</Alerta>}

      {datos && datos.length === 0 && (
        <EstadoVacio icono={Inbox} titulo="Aún no tienes pedidos">
          Cuando alguien pida, aparecerá aquí. Esta pantalla se actualiza sola.
        </EstadoVacio>
      )}
      {datos && datos.length > 0 && (
        <div className="grid items-start gap-6 md:grid-cols-2">
          <ColumnaPedidos titulo="Pendientes" lista={pendientes} vacio="No hay pedidos pendientes." nuevos={nuevos} avanzandoId={avanzandoId} onAvanzar={avanzar} />
          <ColumnaPedidos titulo="Listos" lista={listos} vacio="Ningún pedido está listo todavía." nuevos={nuevos} avanzandoId={avanzandoId} onAvanzar={avanzar} />
        </div>
      )}
    </div>
  );
}
