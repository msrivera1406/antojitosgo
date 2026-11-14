import { useRef } from 'react';

/** Pestañas accesibles con flechas de teclado. `opciones`: [{ id, etiqueta }] */
export default function Pestanas({ opciones, activa, onChange, etiqueta }) {
  const refs = useRef({});
  const mover = (e, indice) => {
    let destino = null;
    if (e.key === 'ArrowRight') destino = (indice + 1) % opciones.length;
    if (e.key === 'ArrowLeft') destino = (indice - 1 + opciones.length) % opciones.length;
    if (destino !== null) {
      e.preventDefault();
      onChange(opciones[destino].id);
      refs.current[opciones[destino].id]?.focus();
    }
  };
  return (
    <div role="tablist" aria-label={etiqueta} className="grid grid-flow-col auto-cols-fr gap-1 rounded-suave bg-tinta-100 p-1">
      {opciones.map((o, i) => (
        <button
          key={o.id}
          ref={(el) => (refs.current[o.id] = el)}
          role="tab"
          id={`pestana-${o.id}`}
          aria-selected={activa === o.id}
          aria-controls={`panel-${o.id}`}
          tabIndex={activa === o.id ? 0 : -1}
          onClick={() => onChange(o.id)}
          onKeyDown={(e) => mover(e, i)}
          className={`min-h-toque rounded-[0.6rem] px-3 text-base font-bold transition ${
            activa === o.id ? 'bg-white text-primario-700 shadow-tarjeta' : 'text-tinta-600 hover:text-tinta-900'
          }`}
        >
          {o.etiqueta}
        </button>
      ))}
    </div>
  );
}
