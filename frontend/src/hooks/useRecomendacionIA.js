import { useCallback, useEffect, useRef, useState } from 'react';
import { EVENTO_RESPUESTA_IA } from '../lib/iaEventos.js';
import { puestosMencionados } from '../lib/recomendaciones.js';

/**
 * Escucha las respuestas del asistente y devuelve los ids de los puestos que recomendó.
 * Una respuesta sin puestos (por ejemplo "¿qué se te antoja?") no borra la recomendación anterior.
 */
export function useRecomendacionIA(puestos) {
  const [ids, setIds] = useState([]);
  const [vez, setVez] = useState(0); // cambia en cada recomendación nueva, aunque repita puestos
  const puestosRef = useRef(puestos);
  puestosRef.current = puestos;

  useEffect(() => {
    const alResponder = (e) => {
      const { texto, ids: dados } = e.detail ?? {};
      const conocidos = new Set(puestosRef.current.map((p) => p.id));
      const encontrados = (Array.isArray(dados) ? dados : puestosMencionados(texto, puestosRef.current)).filter((id) => conocidos.has(id));
      if (encontrados.length > 0) {
        setIds(encontrados);
        setVez((n) => n + 1);
      }
    };
    globalThis.addEventListener(EVENTO_RESPUESTA_IA, alResponder);
    return () => globalThis.removeEventListener(EVENTO_RESPUESTA_IA, alResponder);
  }, []);

  const limpiar = useCallback(() => setIds([]), []);
  return { ids, vez, limpiar };
}
