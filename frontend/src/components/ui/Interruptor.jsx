export default function Interruptor({ activo, onChange, etiqueta, textoActivo = 'Disponible', textoInactivo = 'Agotado', disabled }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={activo}
      aria-label={etiqueta}
      disabled={disabled}
      onClick={() => onChange(!activo)}
      className="inline-flex min-h-toque items-center gap-3 rounded-full pr-1 disabled:opacity-60"
    >
      <span className={`relative h-8 w-14 rounded-full transition-colors ${activo ? 'bg-verificado' : 'bg-tinta-300'}`}>
        <span
          className={`absolute left-1 top-1 h-6 w-6 rounded-full bg-white shadow-tarjeta transition-transform ${activo ? 'translate-x-6' : ''}`}
        />
      </span>
      <span className="text-etiqueta font-bold text-tinta-700">{activo ? textoActivo : textoInactivo}</span>
    </button>
  );
}
