import { useEffect, useState } from 'react';
import { ClipboardList, Store, ShieldAlert } from 'lucide-react';
import Pagina from '../components/layout/Pagina.jsx';
import Pestanas from '../components/ui/Pestanas.jsx';
import Chip from '../components/ui/Chip.jsx';
import Cargando from '../components/ui/Cargando.jsx';
import Alerta from '../components/ui/Alerta.jsx';
import EstadoVacio from '../components/ui/EstadoVacio.jsx';
import Boton from '../components/ui/Boton.jsx';
import SeccionResenas from '../components/resenas/SeccionResenas.jsx';
import EditorMenu from '../components/locatario/EditorMenu.jsx';
import FormularioPuesto from '../components/locatario/FormularioPuesto.jsx';
import RutaProtegida from '../components/auth/RutaProtegida.jsx';
import { puestosApi } from '../services/endpoints.js';
import { useCarga } from '../hooks/useCarga.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useTitulo } from '../hooks/useTitulo.js';

const PESTANAS = [
  { id: 'menu', etiqueta: 'Menú' },
  { id: 'resenas', etiqueta: 'Reseñas' },
  { id: 'puesto', etiqueta: 'Mi puesto' },
];

function PanelPuesto({ puesto, categorias, onActualizado }) {
  const [pestana, setPestana] = useState('menu');
  const detalle = useCarga(() => puestosApi.detalle(puesto.id), [puesto.id]);
  const [productos, setProductos] = useState([]);

  useEffect(() => {
    if (detalle.datos) setProductos(detalle.datos.productos ?? []);
  }, [detalle.datos]);

  return (
    <div className="space-y-5">
      <Pestanas opciones={PESTANAS} activa={pestana} onChange={setPestana} etiqueta="Secciones de tu puesto" />
      <div role="tabpanel" id={`panel-${pestana}`} aria-labelledby={`pestana-${pestana}`}>
        {pestana === 'resenas' && <SeccionResenas puestoId={puesto.id} esDueno soloLectura />}
        {pestana === 'menu' && (detalle.cargando ? <Cargando texto="Cargando tu menú" /> : <EditorMenu puestoId={puesto.id} productos={productos} onCambio={setProductos} />)}
        {pestana === 'puesto' && (
          <div className="rounded-panel bg-white p-5 shadow-tarjeta sm:p-6">
            <FormularioPuesto
              categorias={categorias}
              inicial={puesto}
              textoBoton="Guardar cambios"
              onGuardar={async (cuerpo) => onActualizado(await puestosApi.editar(puesto.id, cuerpo))}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function ContenidoLocatario() {
  const { usuario } = useAuth();
  const mios = useCarga(() => puestosApi.mios(), []);
  const categorias = useCarga(() => puestosApi.categorias(), []);
  const [elegidoId, setElegidoId] = useState(null);

  if (usuario.rol === 'cliente') {
    return (
      <Pagina estrecha>
        <EstadoVacio icono={ShieldAlert} titulo="Esta sección es para dueños de puestos" accion={<Boton to="/">Volver al mapa</Boton>}>
          Si tienes un puesto, crea una cuenta de tipo "Tengo un puesto" para administrarlo.
        </EstadoVacio>
      </Pagina>
    );
  }

  if (mios.cargando || categorias.cargando) return <Cargando texto="Cargando tu puesto" className="flex-1" />;
  if (mios.error) {
    return (
      <Pagina estrecha>
        <Alerta tipo="error" titulo="No pudimos cargar tus puestos">
          {mios.error.mensaje}
        </Alerta>
      </Pagina>
    );
  }

  const lista = mios.datos ?? [];
  const puesto = lista.find((p) => p.id === elegidoId) ?? lista[0] ?? null;

  if (!puesto) {
    return (
      <Pagina estrecha titulo="Registra tu puesto" subtitulo="Cuéntanos dónde te instalas para que la gente pueda encontrarte y consultar tu menú.">
        <div className="rounded-panel bg-white p-5 shadow-tarjeta sm:p-6">
          <FormularioPuesto
            categorias={categorias.datos ?? []}
            textoBoton="Crear mi puesto"
            onGuardar={async (cuerpo) => {
              const creado = await puestosApi.crear(cuerpo);
              await mios.recargar();
              setElegidoId(creado.id);
            }}
          />
        </div>
      </Pagina>
    );
  }

  return (
    <Pagina titulo="Mi puesto" subtitulo="Administra tu menú, revisa tus reseñas y mantén tus datos al día.">
      {lista.length > 1 && (
        <div role="group" aria-label="Elige un puesto" className="flex flex-wrap gap-2">
          {lista.map((p) => (
            <Chip key={p.id} icono={Store} seleccionado={p.id === puesto.id} onClick={() => setElegidoId(p.id)}>
              {p.nombre}
            </Chip>
          ))}
        </div>
      )}
      <p className="flex items-center gap-2 text-titulo-3 font-extrabold">
        <ClipboardList className="h-6 w-6 text-primario-600" aria-hidden="true" />
        {puesto.nombre}
      </p>
      <PanelPuesto key={puesto.id} puesto={puesto} categorias={categorias.datos ?? []} onActualizado={() => mios.recargar({ silencioso: true })} />
    </Pagina>
  );
}

export default function Locatario() {
  useTitulo('Mi puesto');
  return (
    <RutaProtegida>
      <ContenidoLocatario />
    </RutaProtegida>
  );
}

