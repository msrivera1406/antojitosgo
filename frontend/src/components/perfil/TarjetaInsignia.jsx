import { Award, PartyPopper } from 'lucide-react';
import BarraProgreso from '../ui/BarraProgreso.jsx';
import { progresoNivel } from '../../lib/lealtad.js';

/** Nombre, puntos, insignia actual y avance hacia la siguiente. En el nivel máximo, una felicitación. */
export default function TarjetaInsignia({ nombre, puntos }) {
  const p = progresoNivel(puntos);
  return (
    <section aria-label="Tu nivel" className="space-y-4 rounded-panel bg-primario-800 p-5 text-white shadow-elevada">
      <div className="flex items-center gap-4">
        <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-white text-primario-700">
          <Award className="h-9 w-9" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-etiqueta font-bold text-primario-100">Hola, {nombre}</p>
          <p className="text-titulo-2 font-black leading-tight">{p.nivel.nombre}</p>
          <p className="font-bold text-primario-100">{puntos} puntos Antojito</p>
        </div>
      </div>

      {p.maximo ? (
        <p className="flex items-center gap-2 rounded-suave bg-white/15 p-3 font-bold">
          <PartyPopper className="h-5 w-5 shrink-0" aria-hidden="true" />
          Llegaste al nivel más alto. Gracias por ser parte de la comunidad.
        </p>
      ) : (
        <div className="rounded-suave bg-white p-3 text-tinta-900">
          <BarraProgreso
            etiqueta={`Camino a ${p.siguiente.nombre}`}
            valor={p.porcentaje}
            maximo={100}
            detalle={`Te faltan ${p.faltan} puntos`}
          />
        </div>
      )}
    </section>
  );
}
