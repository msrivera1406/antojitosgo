import { LocateFixed, X } from 'lucide-react';
import Boton from '../ui/Boton.jsx';
import Alerta from '../ui/Alerta.jsx';
import { useUbicacion } from '../../context/UbicacionContext.jsx';

/**
 * Pide la ubicación con una acción explícita (nunca de forma silenciosa) y explica para qué se usa.
 * Si falla o se niega, muestra un aviso breve y no bloqueante.
 */
export default function AvisoUbicacion({ descartado, onDescartar, ocultarInvitacionEnMovil = false }) {
  const { estado, aviso, descartarAviso, solicitar } = useUbicacion();

  if (aviso) {
    return (
      <Alerta
        tipo="aviso"
        accion={
          <button type="button" onClick={descartarAviso} className="inline-flex min-h-toque items-center gap-1.5 font-bold text-primario-800 underline">
            <X className="h-4 w-4" aria-hidden="true" />
            Entendido
          </button>
        }
      >
        {aviso}
      </Alerta>
    );
  }

  if (estado !== 'sin-pedir' || descartado) return null;
  return (
    <div className={`flex flex-col gap-3 rounded-tarjeta bg-primario-50 p-4 ${ocultarInvitacionEnMovil ? 'max-lg:hidden' : ''}`}>
      <div className="flex gap-3">
        <LocateFixed className="mt-0.5 h-6 w-6 shrink-0 text-primario-600" aria-hidden="true" />
        <p className="text-tinta-800">
          <span className="font-extrabold">Encuentra puestos cerca de ti.</span> Usamos tu ubicación solo para mostrarte lo más cercano. No la guardamos.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Boton tamano="chico" onClick={solicitar} icono={LocateFixed}>
          Usar mi ubicación
        </Boton>
        <Boton tamano="chico" variante="terciario" onClick={onDescartar}>
          Ahora no
        </Boton>
      </div>
    </div>
  );
}
