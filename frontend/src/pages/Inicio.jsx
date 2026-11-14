import { useCallback, useEffect, useMemo, useState } from 'react';
import { USAR_DUMMY } from '../services/config.js';
import { List, Map } from 'lucide-react';
import { usePuestos } from '../hooks/usePuestos.js';
import { useUbicacion } from '../context/UbicacionContext.jsx';
import { hayFiltrosActivos } from '../lib/filtros.js';
import { useTitulo } from '../hooks/useTitulo.js';
import FiltrosPuestos from '../components/puestos/FiltrosPuestos.jsx';
import ResultadosPuestos from '../components/puestos/ResultadosPuestos.jsx';
import DetallePuesto from '../components/puestos/DetallePuesto.jsx';
import MapaPuestos from '../components/mapa/MapaPuestosCarga.jsx';
import AvisoUbicacion from '../components/mapa/AvisoUbicacion.jsx';
import PanelInferior from '../components/ui/PanelInferior.jsx';
import AsistenteIA from '../components/ia/AsistenteIA.jsx';
import TarjetaRecomendacionIA from '../components/ia/TarjetaRecomendacionIA.jsx';
import { useRecomendacionIA } from '../hooks/useRecomendacionIA.js';

const VISTAS = [
  { id: 'mapa', etiqueta: 'Mapa', icono: Map },
  { id: 'lista', etiqueta: 'Lista', icono: List },
];

/**
 * Inicio y descubrimiento. Escritorio: lista a la izquierda y mapa a la derecha.
 * Móvil: buscador arriba y cambio entre Mapa y Lista. El mapa ocupa el espacio protagonista.
 */
export default function Inicio() {
  useTitulo('');
  const { filtrados, todos, categorias, cargando, error, recargar, filtros, cambiarFiltros, limpiarFiltros } = usePuestos();
  const { ubicacion, precision, rumbo, estado, solicitar } = useUbicacion();
  const [vista, setVista] = useState('mapa');
  const [seleccionadoId, setSeleccionadoId] = useState(null);
  const [avisoDescartado, setAvisoDescartado] = useState(false);

  const seleccionado = todos.find((p) => p.id === seleccionadoId) ?? null;

  // Puestos que recomendó el asistente: se muestran en el mapa aunque los filtros los oculten.
  const recomendacion = useRecomendacionIA(todos);
  const recomendados = recomendacion.ids.map((id) => todos.find((p) => p.id === id)).filter(Boolean);
  const puestosMapa = useMemo(() => {
    const ids = new Set(filtrados.map((p) => p.id));
    return [...filtrados, ...recomendados.filter((p) => !ids.has(p.id))];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtrados, recomendacion.ids, todos]);

  // Con cada recomendación nueva se muestra el mapa para que se vea el pin que brilla.
  useEffect(() => {
    if (recomendacion.vez > 0) {
      setVista('mapa');
      setSeleccionadoId(null);
    }
  }, [recomendacion.vez]);
  const cerrarPanel = useCallback(() => setSeleccionadoId(null), []);
  const hayFiltros = hayFiltrosActivos(filtros);

  // Con el panel del puesto abierto en el mapa, el asistente se oculta en móvil para no taparlo (ver index.css).
  const panelAbierto = Boolean(seleccionado) && vista === 'mapa';
  useEffect(() => {
    if (panelAbierto) document.body.dataset.panelAbierto = '';
    else delete document.body.dataset.panelAbierto;
    return () => delete document.body.dataset.panelAbierto;
  }, [panelAbierto]);

  const elegirDesdeLista = (id) => {
    setSeleccionadoId(id);
    setVista('mapa');
  };

  return (
    <div className="flex flex-1 flex-col lg:h-[calc(100dvh-4rem)] lg:flex-none lg:flex-row lg:overflow-hidden">
      {/* Columna de búsqueda y resultados */}
      <div className="flex flex-col lg:w-[26rem] lg:shrink-0 lg:overflow-y-auto lg:border-r lg:border-tinta-100 lg:bg-crema-50">
        <div className="flex flex-col gap-3 px-4 pb-3 pt-4 lg:gap-4 lg:pt-5">
          <div className={`space-y-1 ${vista === 'mapa' ? 'hidden lg:block' : ''}`}>
            <h1 className="text-titulo-2">¿Qué se te antoja hoy?</h1>
            <p className="text-tinta-600">Encuentra puestos de comida callejera en la Ciudad de México.</p>
          </div>
          <FiltrosPuestos filtros={filtros} categorias={categorias} onCambiar={cambiarFiltros} />
          {/* En móvil, con el mapa a la vista, la invitación se omite para dejarle espacio: el botón "Mi ubicación" del mapa es la acción explícita. Los avisos de error siempre se ven. */}
          <AvisoUbicacion descartado={avisoDescartado} onDescartar={() => setAvisoDescartado(true)} ocultarInvitacionEnMovil={vista === 'mapa'} />

          <div className="flex items-center justify-between gap-3">
            <p aria-live="polite" className="font-bold text-tinta-700">
              {cargando ? 'Buscando...' : `${filtrados.length} ${filtrados.length === 1 ? 'puesto' : 'puestos'}`}
            </p>
            <div role="group" aria-label="Vista" className="flex gap-1 rounded-full bg-tinta-100 p-1 lg:hidden">
              {VISTAS.map(({ id, etiqueta, icono: Icono }) => (
                <button
                  key={id}
                  type="button"
                  aria-pressed={vista === id}
                  onClick={() => setVista(id)}
                  className={`flex min-h-toque items-center gap-1.5 rounded-full px-4 font-bold transition ${
                    vista === id ? 'bg-white text-primario-700 shadow-tarjeta' : 'text-tinta-600'
                  }`}
                >
                  <Icono className="h-5 w-5" aria-hidden="true" />
                  {etiqueta}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className={`px-4 pb-6 lg:block ${vista === 'lista' ? 'block' : 'hidden'}`}>
          <ResultadosPuestos
            cargando={cargando}
            error={error}
            puestos={filtrados}
            hayFiltros={hayFiltros}
            seleccionadoId={seleccionadoId}
            onElegir={elegirDesdeLista}
            onReintentar={recargar}
            onLimpiar={limpiarFiltros}
          />
        </div>
      </div>

      {/* Mapa (espacio reservado) */}
      <section aria-label="Mapa de puestos" className={`relative min-h-[24rem] flex-1 flex-col lg:flex ${vista === 'mapa' ? 'flex' : 'hidden'}`}>
        <MapaPuestos
          puestos={puestosMapa}
          destacadosIds={recomendacion.ids}
          vezDestacados={recomendacion.vez}
          seleccionadoId={seleccionadoId}
          onSeleccionar={setSeleccionadoId}
          ubicacion={ubicacion}
          precision={precision}
          rumbo={rumbo}
          estadoUbicacion={estado}
          onCentrar={solicitar}
        >
          {!seleccionado && (
            <TarjetaRecomendacionIA puestos={recomendados} onElegir={setSeleccionadoId} onCerrar={recomendacion.limpiar} />
          )}
          <PanelInferior
            abierto={Boolean(seleccionado)}
            onCerrar={cerrarPanel}
            titulo={seleccionado?.nombre ?? ''}
            className="fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] max-h-[65dvh] md:absolute md:inset-x-auto md:bottom-10 md:left-4 md:max-h-[calc(100%-3.5rem)] md:w-[24rem]"
          >
            {seleccionado && <DetallePuesto puesto={seleccionado} />}
          </PanelInferior>
        </MapaPuestos>
      </section>

      {USAR_DUMMY && <AsistenteIA puestos={todos} oculto={panelAbierto} />}
    </div>
  );
}
