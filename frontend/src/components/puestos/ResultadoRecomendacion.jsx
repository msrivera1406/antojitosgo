import { PartyPopper, Sparkles } from 'lucide-react';
import Boton from '../ui/Boton.jsx';
import BarraProgreso from '../ui/BarraProgreso.jsx';
import CuponCard from '../perfil/CuponCard.jsx';

/** Pantalla de éxito tras recomendar: puntos ganados y, si aplica, el cupón o el avance hacia el siguiente. */
export default function ResultadoRecomendacion({ resultado, progreso }) {
  const { puntos_ganados: ganados, puntos_totales: totales, cupon_ganado: cupon } = resultado;
  return (
    <div className="animate-subir space-y-6 text-center">
      <div className="space-y-3">
        <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primario-100 text-primario-700">
          {cupon ? <PartyPopper className="h-10 w-10" aria-hidden="true" /> : <Sparkles className="h-10 w-10" aria-hidden="true" />}
        </span>
        <h1 className="text-titulo-1">¡Ganaste {ganados} puntos Antojito!</h1>
        <p className="text-subtitulo text-tinta-600">Ahora tienes {totales} puntos. Tu recomendación ya aparece en el mapa como recomendada.</p>
      </div>

      {cupon ? (
        <div className="space-y-3 text-left">
          <p className="text-center font-extrabold text-primario-800">Completaste 5 recomendaciones. Ganaste un cupón.</p>
          <CuponCard cupon={cupon} mostrarAccion={false} destacado />
        </div>
      ) : (
        progreso && (
          <div className="rounded-tarjeta bg-white p-4 text-left shadow-tarjeta">
            <BarraProgreso
              etiqueta="Camino a tu próximo cupón"
              valor={progreso.actual}
              maximo={progreso.meta}
              detalle={`Llevas ${progreso.actual} de ${progreso.meta} recomendaciones`}
            />
          </div>
        )
      )}

      <Boton to="/" tamano="grande" className="w-full">
        Volver al mapa
      </Boton>
    </div>
  );
}
