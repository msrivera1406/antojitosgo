import { ShieldCheck, Users } from 'lucide-react';
import Etiqueta from '../ui/Etiqueta.jsx';

export const TEXTO_RECOMENDADO = 'Recomendación de la comunidad. Pendiente de verificación';

/** Verificado y recomendado se distinguen por color, icono y texto. */
export default function EtiquetaEstatus({ estatus, completa = false }) {
  if (estatus === 'verificado') {
    return (
      <Etiqueta tono="verificado" icono={ShieldCheck}>
        Verificado
      </Etiqueta>
    );
  }
  return (
    <Etiqueta tono="comunidad" icono={Users}>
      {completa ? TEXTO_RECOMENDADO : 'Recomendado'}
    </Etiqueta>
  );
}
