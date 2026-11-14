import { Mic, LoaderCircle, TriangleAlert } from 'lucide-react';
import IndicadorVoz from './IndicadorVoz.jsx';
import { ESTADOS_ASISTENTE } from './EstadoAsistente.js';

/**
 * Botón flotante de al menos 56 px con cinco estados distintos. El estado se anuncia con aria-live
 * y se ve también por icono y animación, no solo por color.
 */
export default function BotonAsistente({ estado, abierto, onClick }) {
  const info = ESTADOS_ASISTENTE[estado];
  const activo = estado === 'escuchando';
  const color =
    estado === 'error' ? 'bg-peligro text-white' : activo || estado === 'hablando' ? 'bg-primario-800 text-white' : 'bg-primario-600 text-white hover:bg-primario-700';

  return (
    <div className="relative">
      {activo && <span aria-hidden="true" className="absolute inset-0 animate-onda rounded-full bg-primario-500" />}
      <button
        type="button"
        onClick={onClick}
        aria-expanded={abierto}
        aria-controls="panel-asistente"
        aria-label={abierto ? 'Cerrar asistente' : `Abrir asistente de voz. Estado: ${info.corto}`}
        className={`relative flex h-16 w-16 items-center justify-center rounded-full shadow-elevada transition active:scale-95 ${color}`}
      >
        {estado === 'conectando' && <LoaderCircle className="h-7 w-7 animate-spin" aria-hidden="true" />}
        {estado === 'hablando' && <IndicadorVoz />}
        {estado === 'error' && <TriangleAlert className="h-7 w-7" aria-hidden="true" />}
        {(estado === 'inactivo' || estado === 'escuchando') && <Mic className="h-7 w-7" aria-hidden="true" />}
      </button>
      <span className="sr-only" role="status" aria-live="polite">
        {info.largo}
      </span>
    </div>
  );
}
