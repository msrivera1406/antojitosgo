import { Sparkles } from 'lucide-react';
import Boton from '../ui/Boton.jsx';

/** Pantalla de éxito tras recomendar: puntos ganados y regreso al mapa. */
export default function ResultadoRecomendacion({ resultado }) {
  const { puntos_ganados: ganados, puntos_totales: totales, puesto } = resultado;
  return (
    <div className="animate-subir space-y-6 text-center">
      <div className="space-y-3">
        <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primario-100 text-primario-700">
          <Sparkles className="h-10 w-10" aria-hidden="true" />
        </span>
        <h1 className="text-titulo-1">¡Ganaste {ganados} puntos Antojito!</h1>
        <p className="text-subtitulo text-tinta-600">
          {Number.isFinite(totales) ? `Ahora tienes ${totales} puntos. ` : ''}Tu recomendación ya aparece en el mapa como recomendada, pendiente de verificación.
        </p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <Boton to="/" tamano="grande">Volver al mapa</Boton>
        {puesto?.id && (
          <Boton to={`/puesto/${puesto.id}`} variante="secundario" tamano="grande">
            Ver el puesto
          </Boton>
        )}
      </div>
    </div>
  );
}
