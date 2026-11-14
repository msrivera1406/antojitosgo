/** Botón solo de icono. La etiqueta accesible es obligatoria. */
export default function IconoBoton({ icono: Icono, etiqueta, className = '', ...resto }) {
  return (
    <button
      type="button"
      aria-label={etiqueta}
      title={etiqueta}
      className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-tinta-700 transition hover:bg-tinta-100 active:scale-95 ${className}`}
      {...resto}
    >
      <Icono className="h-6 w-6" aria-hidden="true" />
    </button>
  );
}
