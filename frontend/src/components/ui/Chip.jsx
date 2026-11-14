import { Check } from 'lucide-react';

/** Opción de filtro. Lo seleccionado se distingue por color, relleno y una marca (no solo por color). */
export default function Chip({ seleccionado, onClick, icono: Icono, children }) {
  return (
    <button
      type="button"
      aria-pressed={seleccionado}
      onClick={onClick}
      className={`inline-flex min-h-toque shrink-0 items-center gap-2 rounded-full border-2 px-4 text-base font-bold transition active:scale-95 ${
        seleccionado
          ? 'border-primario-600 bg-primario-600 text-white'
          : 'border-tinta-200 bg-white text-tinta-700 hover:border-primario-300 hover:bg-primario-50'
      }`}
    >
      {seleccionado ? <Check className="h-4 w-4" aria-hidden="true" /> : Icono && <Icono className="h-4 w-4" aria-hidden="true" />}
      {children}
    </button>
  );
}
