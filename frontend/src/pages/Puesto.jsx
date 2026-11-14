import { useParams, Link } from 'react-router-dom';
import { SearchX, Clock } from 'lucide-react';
import Pagina from '../components/layout/Pagina.jsx';
import Alerta from '../components/ui/Alerta.jsx';
import Boton from '../components/ui/Boton.jsx';
import Cargando from '../components/ui/Cargando.jsx';
import EstadoVacio from '../components/ui/EstadoVacio.jsx';
import { nombreDeCategoria } from '../components/ui/IconoCategoria.jsx';
import FotoPuesto from '../components/puestos/FotoPuesto.jsx';
import ComoLlegar from '../components/puestos/ComoLlegar.jsx';
import MenuPuesto from '../components/puestos/MenuPuesto.jsx';
import EtiquetaEstatus, { TEXTO_RECOMENDADO } from '../components/puestos/EtiquetaEstatus.jsx';
import SeccionResenas from '../components/resenas/SeccionResenas.jsx';
import { puestosApi } from '../services/endpoints.js';
import { useCarga } from '../hooks/useCarga.js';
import { useTitulo } from '../hooks/useTitulo.js';

/** Página pública del puesto: datos, cómo llegar, menú de consulta y reseñas. */
export default function Puesto() {
  const { id } = useParams();
  const puestoId = Number(id);
  const detalle = useCarga(() => puestosApi.detalle(puestoId), [puestoId]);
  const puesto = detalle.datos;
  useTitulo(puesto?.nombre ?? 'Puesto');

  if (detalle.cargando) return <Cargando texto="Cargando el puesto" className="flex-1" />;

  if (detalle.error) {
    return (
      <Pagina estrecha>
        <EstadoVacio icono={SearchX} titulo="Puesto no encontrado" accion={<Boton to="/">Volver al mapa</Boton>}>
          {detalle.error.status === 404 ? 'No encontramos este puesto. Puede que ya no esté disponible.' : detalle.error.mensaje}
        </EstadoVacio>
      </Pagina>
    );
  }

  const verificado = puesto.estatus === 'verificado';

  return (
    <Pagina volverA="/" volverTexto="Volver al mapa">
      <div className="grid gap-6 md:grid-cols-[1fr_24rem] md:items-start">
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
              {Number.isFinite(puesto.latitud) && <ComoLlegar puesto={puesto} />}
            </div>
          </div>

          {verificado ? (
            <MenuPuesto productos={puesto.productos ?? []} />
          ) : (
            <Alerta tipo="info" titulo={TEXTO_RECOMENDADO}>
              Lo sugirió alguien de la comunidad. Cuando el equipo lo verifique, aquí verás su menú. <Link to="/" className="font-bold text-primario-800 underline">Volver al mapa</Link>
            </Alerta>
          )}
        </div>

        <div className="md:sticky md:top-20">
          <SeccionResenas puestoId={puestoId} />
        </div>
      </div>
    </Pagina>
  );
}
