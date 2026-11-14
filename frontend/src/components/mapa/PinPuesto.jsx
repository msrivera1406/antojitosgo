import { ShieldCheck, CircleHelp } from 'lucide-react';

/**
 * Pin visual. Verificado: círculo verde con escudo. Recomendado: rombo azul con signo de pregunta.
 * Se distinguen por forma e icono, no solo por color. El mapa real puede reutilizar estas clases.
 */
export default function PinPuesto({ estatus, seleccionado = false, nombre, onClick, style }) {
  const verificado = estatus === 'verificado';
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={seleccionado}
      aria-label={`${nombre}, ${verificado ? 'verificado' : 'recomendación de la comunidad'}`}
      style={style}
      className="group absolute flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center"
    >
      <span
        className={`flex items-center justify-center border-2 border-white text-white shadow-elevada transition-transform duration-150 group-active:scale-90 ${
          verificado ? 'rounded-full bg-verificado' : 'rotate-45 rounded-[0.6rem] bg-comunidad'
        } ${seleccionado ? 'h-11 w-11 ring-4 ring-primario-300' : 'h-9 w-9 group-hover:scale-110'}`}
      >
        <span className={verificado ? '' : '-rotate-45'}>
          {verificado ? <ShieldCheck className="h-5 w-5" aria-hidden="true" /> : <CircleHelp className="h-5 w-5" aria-hidden="true" />}
        </span>
      </span>
    </button>
  );
}
