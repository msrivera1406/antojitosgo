import { Bot, ChevronRight, X } from 'lucide-react';
import IconoCategoria, { nombreDeCategoria } from '../ui/IconoCategoria.jsx';

/**
 * Tarjeta flotante sobre el mapa con los puestos que recomendó el asistente.
 * Tocar un puesto abre su panel de detalle. Se anuncia a lectores de pantalla.
 */
export default function TarjetaRecomendacionIA({ puestos, onElegir, onCerrar }) {
  if (puestos.length === 0) return null;
  return (
    <section
      aria-label="Recomendación del asistente"
      className="animate-subir absolute inset-x-3 top-3 z-20 rounded-tarjeta border-2 border-aviso bg-white p-2.5 shadow-elevada md:inset-x-auto md:left-14 md:w-[22rem] md:p-3"
    >
      <div className="-mt-1 flex items-center justify-between gap-2">
        <p role="status" className="flex items-center gap-2 text-etiqueta font-extrabold text-aviso">
          <Bot className="h-5 w-5" aria-hidden="true" />
          {puestos.length === 1 ? 'El asistente te recomienda' : 'Te recomienda estos puestos'}
        </p>
        <button
          type="button"
          onClick={onCerrar}
          aria-label="Quitar la recomendación del mapa"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-tinta-600 hover:bg-tinta-100"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>
      <ul className="space-y-1 md:space-y-1.5">
        {puestos.map((p) => (
          <li key={p.id}>
            <button
              type="button"
              onClick={() => onElegir(p.id)}
              className="flex min-h-toque w-full items-center gap-3 rounded-suave bg-aviso-suave px-3 py-1.5 text-left md:py-2 transition hover:bg-crema-200 active:scale-[0.99]"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-aviso">
                <IconoCategoria categoria={p.categoria} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-extrabold leading-tight text-tinta-900">{p.nombre}</span>
                <span className="hidden text-etiqueta text-tinta-700 md:block">
                  {nombreDeCategoria(p.categoria)}
                  {p.horario ? ` · ${p.horario}` : ''}
                </span>
              </span>
              <ChevronRight className="h-5 w-5 shrink-0 text-aviso" aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
