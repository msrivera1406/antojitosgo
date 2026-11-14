export default function EstadoVacio({ icono: Icono, titulo, children, accion }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-tarjeta border-2 border-dashed border-tinta-200 bg-white px-6 py-10 text-center">
      {Icono && (
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primario-50 text-primario-600">
          <Icono className="h-7 w-7" aria-hidden="true" />
        </span>
      )}
      <h2 className="text-titulo-3">{titulo}</h2>
      {children && <p className="max-w-sm text-tinta-600">{children}</p>}
      {accion}
    </div>
  );
}
