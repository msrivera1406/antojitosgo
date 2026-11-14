/** Barras animadas mientras el asistente habla. En movimiento reducido quedan estáticas. */
export default function IndicadorVoz({ className = '' }) {
  return (
    <span aria-hidden="true" className={`flex h-6 items-center gap-1 ${className}`}>
      {[0, 1, 2, 3].map((i) => (
        <span key={i} className="h-full w-1 origin-center animate-barra rounded-full bg-current" style={{ animationDelay: `${i * 130}ms` }} />
      ))}
    </span>
  );
}
