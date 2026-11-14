import { useState } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { ESTATUS_FILTRO } from '../../lib/filtros.js';
import Chip from '../ui/Chip.jsx';
import { iconoDeCategoria, nombreDeCategoria } from '../ui/IconoCategoria.jsx';
import BarraBusqueda from './BarraBusqueda.jsx';

/** Búsqueda, chips de categoría y selector de estatus. El filtrado ocurre en el cliente. */
export default function FiltrosPuestos({ filtros, categorias, onCambiar }) {
  // En móvil el selector de estatus se muestra bajo demanda para dejar espacio al mapa.
  const [masFiltros, setMasFiltros] = useState(filtros.estatus !== 'todos');
  return (
    <div className="space-y-3">
      <BarraBusqueda valor={filtros.texto} onChange={(texto) => onCambiar({ texto })} />

      <div role="group" aria-label="Categoría" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
        <Chip seleccionado={!filtros.categoria} onClick={() => onCambiar({ categoria: null })}>
          Todas
        </Chip>
        {categorias.map((c) => (
          <Chip key={c} icono={iconoDeCategoria(c)} seleccionado={filtros.categoria === c} onClick={() => onCambiar({ categoria: c })}>
            {nombreDeCategoria(c)}
          </Chip>
        ))}
      </div>

      <button
        type="button"
        aria-expanded={masFiltros}
        aria-controls="filtro-estatus"
        onClick={() => setMasFiltros((v) => !v)}
        className="inline-flex min-h-toque items-center gap-2 rounded-suave font-bold text-primario-700 lg:hidden"
      >
        <SlidersHorizontal className="h-5 w-5" aria-hidden="true" />
        {masFiltros ? 'Ocultar filtros' : 'Más filtros'}
      </button>

      <div
        id="filtro-estatus"
        role="radiogroup"
        aria-label="Estatus del puesto"
        className={`grid-cols-3 gap-1 rounded-suave bg-tinta-100 p-1 lg:grid ${masFiltros ? 'grid' : 'hidden'}`}
      >
        {ESTATUS_FILTRO.map((e) => (
          <button
            key={e.valor}
            type="button"
            role="radio"
            aria-checked={filtros.estatus === e.valor}
            onClick={() => onCambiar({ estatus: e.valor })}
            className={`min-h-toque rounded-[0.6rem] px-1 text-etiqueta font-bold transition ${
              filtros.estatus === e.valor ? 'bg-white text-primario-700 shadow-tarjeta' : 'text-tinta-600 hover:text-tinta-900'
            }`}
          >
            {e.etiqueta}
          </button>
        ))}
      </div>
    </div>
  );
}
