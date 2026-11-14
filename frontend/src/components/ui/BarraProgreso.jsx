/**
 * Barra con el valor siempre escrito en texto (por ejemplo "2 de 5"), para no depender del color.
 */
export default function BarraProgreso({ valor, maximo, etiqueta, detalle, tono = 'primario' }) {
  const pct = maximo ? Math.min(100, Math.round((valor / maximo) * 100)) : 0;
  const relleno = tono === 'verificado' ? 'bg-verificado' : 'bg-primario-600';
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-bold text-tinta-800">{etiqueta}</span>
        <span className="shrink-0 text-etiqueta font-bold text-tinta-700">{detalle ?? `${valor} de ${maximo}`}</span>
      </div>
      <div
        role="progressbar"
        aria-label={etiqueta}
        aria-valuemin={0}
        aria-valuemax={maximo}
        aria-valuenow={valor}
        aria-valuetext={detalle ?? `${valor} de ${maximo}`}
        className="h-3 overflow-hidden rounded-full bg-tinta-100"
      >
        <div className={`h-full rounded-full transition-[width] duration-500 ${relleno}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
