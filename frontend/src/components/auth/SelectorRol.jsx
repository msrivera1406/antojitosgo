import { Store, Utensils } from 'lucide-react';

const OPCIONES = [
  { valor: 'cliente', titulo: 'Soy comensal', texto: 'Quiero descubrir y pedir', icono: Utensils },
  { valor: 'locatario', titulo: 'Tengo un puesto', texto: 'Quiero recibir pedidos', icono: Store },
];

export default function SelectorRol({ valor, onChange, error }) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-base font-bold text-tinta-800">¿Cómo vas a usar AntojitosGo?</legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {OPCIONES.map(({ valor: v, titulo, texto, icono: Icono }) => {
          const activo = valor === v;
          return (
            <label
              key={v}
              className={`flex min-h-[4.25rem] cursor-pointer items-center gap-3 rounded-suave border-2 p-3 transition focus-within:ring-4 focus-within:ring-primario-100 ${
                activo ? 'border-primario-600 bg-primario-50' : 'border-tinta-200 bg-white hover:border-primario-300'
              }`}
            >
              <input type="radio" name="rol" value={v} checked={activo} onChange={() => onChange(v)} className="sr-only" />
              <Icono className={`h-6 w-6 shrink-0 ${activo ? 'text-primario-700' : 'text-tinta-500'}`} aria-hidden="true" />
              <span className="min-w-0">
                <span className="block font-extrabold text-tinta-900">{titulo}</span>
                <span className="block text-etiqueta text-tinta-600">{texto}</span>
              </span>
              <span
                aria-hidden="true"
                className={`ml-auto flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${activo ? 'border-primario-600' : 'border-tinta-300'}`}
              >
                {activo && <span className="h-2.5 w-2.5 rounded-full bg-primario-600" />}
              </span>
            </label>
          );
        })}
      </div>
      {error && <p role="alert" className="text-etiqueta font-bold text-peligro">{error}</p>}
    </fieldset>
  );
}
