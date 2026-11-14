import { Link, useLocation } from 'react-router-dom';
import { LogIn } from 'lucide-react';
import Alerta from '../ui/Alerta.jsx';
import Boton from '../ui/Boton.jsx';
import { Esqueleto } from '../ui/Cargando.jsx';
import ResumenCalificacion from './ResumenCalificacion.jsx';
import FormularioResena from './FormularioResena.jsx';
import ListaResenas from './ListaResenas.jsx';
import { resenasApi } from '../../services/endpoints.js';
import { useCarga } from '../../hooks/useCarga.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { rutaLoginConNext } from '../../lib/rutas.js';

/**
 * Promedio, formulario (si hay sesión y no es el dueño) y lista de reseñas de un puesto.
 * `soloLectura` lo usa el panel del locatario para ver lo que opinan de su puesto.
 */
export default function SeccionResenas({ puestoId, esDueno = false, soloLectura = false }) {
  const { usuario } = useAuth();
  const { pathname } = useLocation();
  const { datos, setDatos, cargando, error, recargar } = useCarga(() => resenasApi.listar(puestoId), [puestoId, usuario?.id]);

  const guardar = async (cuerpo) => {
    const r = await resenasApi.guardar(puestoId, cuerpo);
    setDatos((d) => {
      const otras = (d?.resenas ?? []).filter((x) => x.id !== r.resena.id);
      return { total: r.total, promedio: r.promedio, resenas: [r.resena, ...otras], mia: r.resena };
    });
  };

  return (
    <section aria-labelledby="titulo-resenas" className="space-y-4 rounded-panel bg-white p-5 shadow-tarjeta">
      <h2 id="titulo-resenas" className="text-titulo-2">
        Reseñas
      </h2>

      {cargando && <Esqueleto className="h-24" />}
      {error && (
        <Alerta tipo="error" accion={<Boton variante="secundario" tamano="chico" onClick={() => recargar()}>Reintentar</Boton>}>
          No pudimos cargar las reseñas.
        </Alerta>
      )}

      {datos && (
        <>
          <ResumenCalificacion promedio={datos.promedio} total={datos.total} />

          {!soloLectura && (
            <div className="rounded-tarjeta bg-crema-100 p-4">
              {!usuario && (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="font-semibold text-tinta-800">Entra para dejar tu reseña.</p>
                  <Boton to={rutaLoginConNext(pathname)} variante="secundario" tamano="chico" icono={LogIn}>
                    Entrar
                  </Boton>
                </div>
              )}
              {usuario && esDueno && <p className="font-semibold text-tinta-700">No puedes reseñar tu propio puesto.</p>}
              {usuario && !esDueno && (
                <>
                  <h3 className="mb-3 text-titulo-3">{datos.mia ? 'Tu reseña' : 'Deja tu reseña'}</h3>
                  <FormularioResena key={datos.mia?.id ?? 'nueva'} inicial={datos.mia} onGuardar={guardar} />
                </>
              )}
            </div>
          )}

          <ListaResenas resenas={datos.resenas} />
        </>
      )}
      {soloLectura && (
        <p className="text-etiqueta text-tinta-600">
          Las reseñas las escriben las personas que visitan tu puesto. <Link to={`/puesto/${puestoId}`} className="font-bold text-primario-800 underline">Ver página pública</Link>
        </p>
      )}
    </section>
  );
}
