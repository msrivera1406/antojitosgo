import { Info } from 'lucide-react';

/** Explicación breve de las reglas, tal como las define el contrato compartido. */
export default function ComoSeGanan() {
  return (
    <details className="group rounded-tarjeta bg-crema-100 p-4">
      <summary className="flex min-h-toque cursor-pointer list-none items-center gap-2 font-extrabold text-tinta-900">
        <Info className="h-5 w-5 text-primario-600" aria-hidden="true" />
        Cómo se ganan los cupones
      </summary>
      <ul className="mt-3 list-disc space-y-2 pl-6 text-tinta-800">
        <li>Recomienda puestos: por cada 5 recomendaciones ganas un cupón de $15. Cuentan máximo 3 recomendaciones por día.</li>
        <li>Pide en el mismo puesto: por cada 5 pedidos entregados de al menos $50 ganas un cupón de $20 para ese puesto.</li>
        <li>Cada cupón vale 30 días, se usa uno por pedido y pide una compra mínima de 3 veces su valor.</li>
        <li>Tus puntos suben tu nivel de insignia. No se canjean por descuentos.</li>
      </ul>
    </details>
  );
}
