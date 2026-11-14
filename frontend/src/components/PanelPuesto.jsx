import { useMemo, useState } from 'react';
import { useDetallePuesto } from '../hooks/useDetallePuesto.js';
import { iconoDeCategoria } from '../lib/categorias.js';
import { formatearPrecio } from '../lib/formato.js';
import { formatearDistancia } from '../lib/geo.js';
import { detectarPlataforma, opcionesNavegacion } from '../lib/navegacion.js';

const claseBoton =
  'rounded-full px-4 py-2 text-sm font-medium active:opacity-80 disabled:opacity-40';

/**
 * Panel inferior con el detalle del puesto seleccionado: datos, menú y "Cómo llegar".
 * `puesto` es el resumen de la lista de cercanos; el menú se carga aparte.
 */
export default function PanelPuesto({ puesto, onCerrar }) {
  const { detalle, estado, error, reintentar } = useDetallePuesto(puesto.id);
  const [verOpciones, setVerOpciones] = useState(false);
  const verificado = puesto.estatus === 'verificado';

  const opciones = useMemo(
    () =>
      opcionesNavegacion(
        { lat: puesto.latitud, lng: puesto.longitud, nombre: puesto.nombre },
        detectarPlataforma({
          userAgent: navigator.userAgent,
          maxTouchPoints: navigator.maxTouchPoints,
        }),
      ),
    [puesto.latitud, puesto.longitud, puesto.nombre],
  );

  const compartir = async () => {
    try {
      await navigator.share({
        title: puesto.nombre,
        text: `${puesto.nombre} en Antojito`,
        url: opciones[0].url,
      });
    } catch (e) {
      if (e.name !== 'AbortError') console.warn('No se pudo compartir', e);
    }
  };

  const descripcion = detalle?.descripcion ?? puesto.descripcion;
  const foto = detalle?.foto_url;
  const productos = detalle?.productos ?? [];

  return (
    <section
      aria-label={`Puesto ${puesto.nombre}`}
      className="absolute inset-x-3 bottom-20 z-20 rounded-2xl bg-white shadow-xl"
    >
      <button
        type="button"
        onClick={onCerrar}
        aria-label="Cerrar"
        className="absolute right-3 top-3 z-10 h-8 w-8 rounded-full bg-white text-lg text-gray-500 active:bg-gray-100"
      >
        ×
      </button>
      <div className="max-h-[55dvh] overflow-y-auto p-4">
        <div className="flex items-start gap-3 pr-8">
          <span className="text-3xl" aria-hidden="true">
            {iconoDeCategoria(puesto.categoria)}
          </span>
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-gray-900">{puesto.nombre}</h2>
            <p className="text-sm text-gray-600">
              <span className="capitalize">{puesto.categoria}</span>
              {Number.isFinite(puesto.distancia_m) &&
                ` · a ${formatearDistancia(puesto.distancia_m)}`}
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

        {foto?.startsWith('/') && (
          <img
            src={foto}
            alt={`Foto de ${puesto.nombre}`}
            loading="lazy"
            className="mt-3 h-32 w-full rounded-xl object-cover"
          />
        )}
        {descripcion && <p className="mt-3 text-sm text-gray-700">{descripcion}</p>}

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setVerOpciones((v) => !v)}
            aria-expanded={verOpciones}
            className={`${claseBoton} bg-blue-600 text-white`}
          >
            Cómo llegar
          </button>
          {'share' in navigator && (
            <button type="button" onClick={compartir} className={`${claseBoton} bg-gray-100 text-gray-900`}>
              Compartir
            </button>
          )}
        </div>
        {verOpciones && (
          <ul className="mt-2 divide-y divide-gray-100 rounded-xl border border-gray-200">
            {opciones.map((o) => (
              <li key={o.id}>
                <a
                  href={o.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block px-4 py-3 text-sm font-medium text-blue-700 active:bg-gray-50"
                >
                  {o.etiqueta}
                </a>
              </li>
            ))}
          </ul>
        )}

        <h3 className="mt-4 text-sm font-semibold text-gray-900">Menú</h3>
        {estado === 'cargando' && <p className="mt-1 text-sm text-gray-500">Cargando menú…</p>}
        {estado === 'error' && (
          <p role="alert" className="mt-1 text-sm text-gray-700">
            {error}{' '}
            <button type="button" onClick={reintentar} className="font-semibold text-blue-700">
              Reintentar
            </button>
          </p>
        )}
        {estado === 'ok' && productos.length === 0 && (
          <p className="mt-1 text-sm text-gray-500">
            {verificado
              ? 'Este puesto aún no publica su menú.'
              : 'Es una recomendación de la comunidad, todavía sin menú.'}
          </p>
        )}
        {productos.length > 0 && (
          <ul className="mt-1 divide-y divide-gray-100">
            {productos.map((p) => (
              <li key={p.id} className="flex items-baseline justify-between gap-3 py-2 text-sm">
                <span className={p.disponible ? 'text-gray-900' : 'text-gray-400 line-through'}>
                  {p.nombre}
                  {!p.disponible && <span className="ml-2 no-underline">(agotado)</span>}
                </span>
                <span className="shrink-0 font-medium text-gray-900">{formatearPrecio(p.precio)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
