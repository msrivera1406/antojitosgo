import { useCallback, useEffect, useState } from 'react';
import { obtenerPuesto } from '../lib/api.js';

/**
 * Carga el detalle (con menú) del puesto `id`. Cancela la petición si cambia el id o se desmonta.
 * Devuelve { detalle, estado: 'cargando' | 'ok' | 'error', error, reintentar }.
 */
export function useDetallePuesto(id) {
  const [detalle, setDetalle] = useState(null);
  const [estado, setEstado] = useState('cargando');
  const [error, setError] = useState(null);
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    const control = new AbortController();
    setEstado('cargando');
    setDetalle(null);
    obtenerPuesto(id, { signal: control.signal })
      .then((datos) => {
        setDetalle(datos);
        setError(null);
        setEstado('ok');
      })
      .catch((e) => {
        if (e.name === 'AbortError') return;
        setError(e.message);
        setEstado('error');
      });
    return () => control.abort();
  }, [id, intento]);

  const reintentar = useCallback(() => setIntento((n) => n + 1), []);
  return { detalle, estado, error, reintentar };
}
