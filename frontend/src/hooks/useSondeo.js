import { useEffect, useRef } from 'react';

/** Llama a `funcion` cada `ms` mientras la pestaña esté visible. Se pausa cuando se oculta. */
export function useSondeo(funcion, ms, activo = true) {
  const ref = useRef(funcion);
  ref.current = funcion;

  useEffect(() => {
    if (!activo) return undefined;
    let id = null;
    const iniciar = () => {
      if (id === null) id = setInterval(() => ref.current(), ms);
    };
    const detener = () => {
      if (id !== null) {
        clearInterval(id);
        id = null;
      }
    };
    const alCambiar = () => {
      if (document.visibilityState === 'visible') {
        ref.current();
        iniciar();
      } else {
        detener();
      }
    };
    if (document.visibilityState === 'visible') iniciar();
    document.addEventListener('visibilitychange', alCambiar);
    return () => {
      detener();
      document.removeEventListener('visibilitychange', alCambiar);
    };
  }, [ms, activo]);
}
