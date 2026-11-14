import { Info } from 'lucide-react';

/** Cómo se ganan puntos. Los puntos solo suben el nivel de insignia. */
export default function ComoSeGanan() {
  return (
    <details className="rounded-tarjeta bg-crema-100 p-4">
      <summary className="flex min-h-toque cursor-pointer list-none items-center gap-2 font-extrabold text-tinta-900">
        <Info className="h-5 w-5 text-primario-600" aria-hidden="true" />
        Cómo se ganan los puntos
      </summary>
      <ul className="mt-3 list-disc space-y-2 pl-6 text-tinta-800">
        <li>Recomienda un puesto que conozcas: ganas 50 puntos.</li>
        <li>Con tus puntos subes de nivel: Explorador de Banqueta, Cazador de Garnachas y Maestro del Antojo.</li>
        <li>Los puntos no se canjean por dinero ni por descuentos.</li>
      </ul>
    </details>
  );
}
