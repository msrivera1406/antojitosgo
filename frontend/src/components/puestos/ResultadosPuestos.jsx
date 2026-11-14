import { SearchX, WifiOff } from 'lucide-react';
import Boton from '../ui/Boton.jsx';
import Alerta from '../ui/Alerta.jsx';
import EstadoVacio from '../ui/EstadoVacio.jsx';
import { Esqueleto } from '../ui/Cargando.jsx';
import ListaPuestos from './ListaPuestos.jsx';

/** Resuelve los cuatro estados de la lista: cargando, error con reintento, vacío y con resultados. */
export default function ResultadosPuestos({ cargando, error, puestos, hayFiltros, seleccionadoId, onElegir, onReintentar, onLimpiar }) {
  if (cargando) {
    return (
      <div role="status" aria-label="Cargando puestos" className="space-y-3">
        {[0, 1, 2].map((i) => (
          <Esqueleto key={i} className="h-[8.25rem]" />
        ))}
      </div>
    );
  }
  if (error) {
    return (
      <Alerta
        tipo="error"
        titulo="No pudimos cargar los puestos"
        accion={
          <Boton variante="secundario" tamano="chico" onClick={onReintentar} icono={WifiOff}>
            Reintentar
          </Boton>
        }
      >
        {error.mensaje ?? 'Sin conexión. Inténtalo de nuevo.'}
      </Alerta>
    );
  }
  if (puestos.length === 0) {
    return (
      <EstadoVacio
        icono={SearchX}
        titulo="No encontramos puestos con esos filtros"
        accion={hayFiltros ? <Boton variante="secundario" onClick={onLimpiar}>Limpiar filtros</Boton> : null}
      >
        Prueba con otra categoría o busca con otras palabras.
      </EstadoVacio>
    );
  }
  return <ListaPuestos puestos={puestos} seleccionadoId={seleccionadoId} onElegir={onElegir} />;
}
