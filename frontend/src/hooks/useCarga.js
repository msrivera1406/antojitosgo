import { useCallback, useEffect, useRef, useState } from 'react';

/** Ejecuta una función asíncrona al montar y expone { datos, cargando, error, recargar }. */
export function useCarga(funcion, dependencias = []) {
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const vivo = useRef(true);

  const ejecutar = useCallback(async ({ silencioso = false } = {}) => {
    if (!silencioso) setCargando(true);
    try {
      const resultado = await funcion();
      if (vivo.current) {
        setDatos(resultado);
        setError(null);
      }
    } catch (e) {
      if (vivo.current) setError(e);
    } finally {
      if (vivo.current && !silencioso) setCargando(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencias);

  useEffect(() => {
    vivo.current = true;
    ejecutar();
    return () => {
      vivo.current = false;
    };
  }, [ejecutar]);

  return { datos, setDatos, cargando, error, recargar: ejecutar };
}
