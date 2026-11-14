import { CircleCheck, Info, TriangleAlert, OctagonAlert } from 'lucide-react';

const TIPOS = {
  info: { clases: 'border-comunidad/30 bg-comunidad-suave text-tinta-800', icono: Info, color: 'text-comunidad', rol: 'status' },
  exito: { clases: 'border-verificado/30 bg-verificado-suave text-tinta-800', icono: CircleCheck, color: 'text-verificado', rol: 'status' },
  aviso: { clases: 'border-aviso/30 bg-aviso-suave text-tinta-800', icono: TriangleAlert, color: 'text-aviso', rol: 'status' },
  error: { clases: 'border-peligro/30 bg-peligro-suave text-tinta-800', icono: OctagonAlert, color: 'text-peligro', rol: 'alert' },
};

/** Mensaje de estado. Icono y texto transmiten el tipo, no solo el color. */
export default function Alerta({ tipo = 'info', titulo, children, accion, className = '' }) {
  const { clases, icono: Icono, color, rol } = TIPOS[tipo];
  return (
    <div role={rol} className={`flex gap-3 rounded-suave border p-4 ${clases} ${className}`}>
      <Icono className={`mt-0.5 h-6 w-6 shrink-0 ${color}`} aria-hidden="true" />
      <div className="min-w-0 flex-1 space-y-2">
        {titulo && <p className="font-extrabold text-tinta-900">{titulo}</p>}
        {children && <div className="text-base">{children}</div>}
        {accion}
      </div>
    </div>
  );
}
