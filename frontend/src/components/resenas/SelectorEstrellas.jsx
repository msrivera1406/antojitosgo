import { Star } from 'lucide-react';

const TEXTOS = ['', 'Malo', 'Regular', 'Bueno', 'Muy bueno', 'Excelente'];

/**
 * Elegir de 1 a 5 estrellas. Es un grupo de radios nativos: funciona con teclado (flechas) y lector
 * de pantalla, y cada opción tiene texto, no solo la estrella.
 */
export default function SelectorEstrellas({ valor, onChange, error }) {
  return (
    <fieldset className="space-y-2">
      <legend className="font-bold text-tinta-800">Tu calificación</legend>
      <div className="flex flex-wrap items-center gap-1">
        {[1, 2, 3, 4, 5].map((n) => {
          const activa = n <= valor;
          return (
            <label key={n} className="cursor-pointer rounded-full focus-within:ring-4 focus-within:ring-primario-100">
              <input type="radio" name="calificacion" value={n} checked={valor === n} onChange={() => onChange(n)} className="sr-only" />
              <span className="sr-only">{`${n} ${n === 1 ? 'estrella' : 'estrellas'}, ${TEXTOS[n]}`}</span>
              <Star
                aria-hidden="true"
                className={`h-11 w-11 p-1.5 transition active:scale-90 ${activa ? 'fill-aviso text-aviso' : 'fill-transparent text-tinta-300 hover:text-aviso'}`}
              />
            </label>
          );
        })}
        <span aria-hidden="true" className="ml-2 font-bold text-tinta-700">{TEXTOS[valor] ?? ''}</span>
      </div>
      {error && <p role="alert" className="text-etiqueta font-bold text-peligro">{error}</p>}
    </fieldset>
  );
}
