const TONOS = {
  verificado: 'bg-verificado-suave text-verificado',
  comunidad: 'bg-comunidad-suave text-comunidad',
  aviso: 'bg-aviso-suave text-aviso',
  peligro: 'bg-peligro-suave text-peligro',
  primario: 'bg-primario-100 text-primario-800',
  neutro: 'bg-tinta-100 text-tinta-700',
};

/** Etiqueta corta de estado. Siempre lleva texto, y un icono opcional refuerza el significado. */
export default function Etiqueta({ tono = 'neutro', icono: Icono, children, className = '' }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-etiqueta font-bold ${TONOS[tono]} ${className}`}>
      {Icono && <Icono className="h-4 w-4" aria-hidden="true" />}
      {children}
    </span>
  );
}
