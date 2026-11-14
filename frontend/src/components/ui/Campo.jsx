import { useId } from 'react';
import { TriangleAlert } from 'lucide-react';

const CLASES_CONTROL =
  'block min-h-toque w-full rounded-suave border-2 bg-white px-4 py-2.5 text-base text-tinta-900 placeholder:text-tinta-500 ' +
  'transition focus:border-primario-600 focus:outline-none focus:ring-4 focus:ring-primario-100 disabled:bg-tinta-50 disabled:text-tinta-500';

/**
 * Etiqueta + control + ayuda + error. El error no depende solo del color: lleva icono y texto,
 * y se enlaza al control con aria-describedby.
 * `hijo` recibe las props que debe poner en el control: ({ id, className, ...aria }) => elemento
 */
export default function Campo({ etiqueta, error, ayuda, opcional = false, hijo }) {
  const id = useId();
  const idAyuda = `${id}-ayuda`;
  const idError = `${id}-error`;
  const describe = [ayuda && idAyuda, error && idError].filter(Boolean).join(' ') || undefined;
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-base font-bold text-tinta-800">
        {etiqueta}
        {opcional && <span className="ml-1.5 text-etiqueta font-semibold text-tinta-600">(opcional)</span>}
      </label>
      {ayuda && (
        <p id={idAyuda} className="text-etiqueta text-tinta-600">
          {ayuda}
        </p>
      )}
      {hijo({
        id,
        'aria-describedby': describe,
        'aria-invalid': error ? true : undefined,
        className: `${CLASES_CONTROL} ${error ? 'border-peligro' : 'border-tinta-300'}`,
      })}
      {error && (
        <p id={idError} role="alert" className="flex items-start gap-1.5 text-etiqueta font-bold text-peligro">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}

export { CLASES_CONTROL };
