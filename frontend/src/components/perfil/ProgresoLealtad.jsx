import BarraProgreso from '../ui/BarraProgreso.jsx';

/** "Tu progreso": una barra por hito. El avance siempre se escribe con números, no solo con la barra. */
export default function ProgresoLealtad({ progreso }) {
  const reco = progreso?.recomendaciones;
  const consumo = progreso?.consumo ?? [];
  return (
    <section aria-labelledby="titulo-progreso" className="space-y-4 rounded-tarjeta bg-white p-5 shadow-tarjeta">
      <h2 id="titulo-progreso" className="seccion-titulo">
        Tu progreso
      </h2>
      {reco && (
        <div className="space-y-1">
          <BarraProgreso etiqueta="Recomendaciones para tu próximo cupón" valor={reco.actual} maximo={reco.meta} />
          <p className="text-etiqueta text-tinta-600">
            {reco.contables_hoy_restantes > 0
              ? `Hoy todavía te cuentan ${reco.contables_hoy_restantes} ${reco.contables_hoy_restantes === 1 ? 'recomendación' : 'recomendaciones'}.`
              : 'Hoy ya no te cuentan más recomendaciones para el cupón. Mañana vuelves a sumar.'}
          </p>
        </div>
      )}
      {consumo.map((c) => (
        <BarraProgreso key={c.puesto_id} etiqueta={c.puesto_nombre} valor={c.actual} maximo={c.meta} detalle={`${c.actual} de ${c.meta} pedidos`} tono="verificado" />
      ))}
      {!reco && consumo.length === 0 && <p className="text-tinta-600">Haz tu primer pedido o recomienda un puesto para empezar a avanzar.</p>}
    </section>
  );
}
