import { iconoDeCategoria } from '../lib/categorias.js';
import { formatearDistancia } from '../lib/geo.js';

/** Resumen del puesto seleccionado. El detalle completo (menú, cómo llegar) llega en la fase 3. */
export default function TarjetaPuesto({ puesto, onCerrar }) {
  const verificado = puesto.estatus === 'verificado';
  return (
    <section
      aria-label={`Puesto ${puesto.nombre}`}
      className="absolute inset-x-3 bottom-20 rounded-2xl bg-white p-4 shadow-xl"
    >
      <button
        type="button"
        onClick={onCerrar}
        aria-label="Cerrar"
        className="absolute right-3 top-3 h-8 w-8 rounded-full text-lg text-gray-500 active:bg-gray-100"
      >
        ×
      </button>
      <div className="flex items-start gap-3 pr-8">
        <span className="text-3xl" aria-hidden="true">
          {iconoDeCategoria(puesto.categoria)}
        </span>
        <div className="min-w-0">
          <h2 className="truncate text-base font-semibold text-gray-900">{puesto.nombre}</h2>
          <p className="text-sm text-gray-600">
            <span className="capitalize">{puesto.categoria}</span>
            {Number.isFinite(puesto.distancia_m) && ` · a ${formatearDistancia(puesto.distancia_m)}`}
          </p>
          {puesto.horario && <p className="text-sm text-gray-600">{puesto.horario}</p>}
          <p
            className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
              verificado ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'
            }`}
          >
            {verificado
              ? 'Verificado'
              : 'Recomendación de la comunidad · Pendiente de verificación'}
          </p>
        </div>
      </div>
    </section>
  );
}
