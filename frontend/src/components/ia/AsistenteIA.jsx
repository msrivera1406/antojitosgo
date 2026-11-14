import { useEffect, useState } from 'react';
import BotonAsistente from './BotonAsistente.jsx';
import PanelAsistente from './PanelAsistente.jsx';
import { useAsistenteDummy } from '../../hooks/useAsistenteDummy.js';

/**
 * Vive dentro de #zona-ia (esquina inferior derecha, sobre la navegación). La spec 03 sustituye
 * useAsistenteDummy por el hook real de Gemini Live sin cambiar nada más.
 * `oculto` lo usa la página para quitarlo de en medio en móvil cuando un panel necesita ese espacio.
 */
export default function AsistenteIA({ puestos = [], oculto = false }) {
  const [abierto, setAbierto] = useState(false);
  const asistente = useAsistenteDummy();
  const { detener } = asistente;

  // La sesión se cierra al ocultar la pestaña, como pide la spec 03.
  useEffect(() => {
    const alOcultar = () => document.visibilityState === 'hidden' && detener();
    document.addEventListener('visibilitychange', alOcultar);
    return () => document.removeEventListener('visibilitychange', alOcultar);
  }, [detener]);

  const cerrar = () => {
    detener();
    setAbierto(false);
  };

  return (
    <div
      id="zona-ia"
      className={`fixed bottom-sobre-nav right-4 z-30 flex flex-col items-end gap-3 md:bottom-6 ${oculto ? 'max-lg:hidden' : ''}`}
    >
      {abierto && <PanelAsistente asistente={asistente} puestos={puestos} onCerrar={cerrar} />}
      <BotonAsistente estado={asistente.estado} abierto={abierto} onClick={() => (abierto ? cerrar() : setAbierto(true))} />
    </div>
  );
}
