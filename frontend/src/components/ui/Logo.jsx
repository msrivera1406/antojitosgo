/** Marca de AntojitosGo: un pin de mapa con un plato dentro. */
export function MarcaPin({ className = 'h-9 w-9' }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true" focusable="false">
      <rect width="64" height="64" rx="18" className="fill-primario-600" />
      <path
        d="M32 11c-9 0-15.500 6.600-15.500 15.200C16.500 37.500 32 53 32 53s15.500-15.500 15.500-26.800C47.500 17.600 41 11 32 11Z"
        className="fill-crema-100"
      />
      <path d="M24.500 25.500h15a7.500 7.500 0 0 1-15 0Z" className="fill-primario-600" />
      <path d="M23 24h18" className="stroke-primario-600" strokeWidth="3" strokeLinecap="round" fill="none" />
    </svg>
  );
}

export default function Logo({ className = '' }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <MarcaPin />
      <span className="text-titulo-3 font-black tracking-tight text-primario-800">
        Antojitos<span className="text-primario-600">Go</span>
      </span>
    </span>
  );
}
