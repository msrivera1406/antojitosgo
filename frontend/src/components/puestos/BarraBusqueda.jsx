import { Search, X } from 'lucide-react';

export default function BarraBusqueda({ valor, onChange }) {
  return (
    <div role="search" className="relative">
      <label htmlFor="busqueda-puestos" className="sr-only">
        Buscar por nombre, descripción o categoría
      </label>
      <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-tinta-500" aria-hidden="true" />
      <input
        id="busqueda-puestos"
        type="search"
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Busca tacos, esquites, tamales..."
        autoComplete="off"
        className="block min-h-[3.25rem] w-full rounded-full border-2 border-tinta-200 bg-white pl-12 pr-12 text-base text-tinta-900 shadow-tarjeta placeholder:text-tinta-500 focus:border-primario-600 focus:outline-none focus:ring-4 focus:ring-primario-100 [&::-webkit-search-cancel-button]:hidden"
      />
      {valor && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Borrar búsqueda"
          className="absolute right-1.5 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full text-tinta-600 hover:bg-tinta-100"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
