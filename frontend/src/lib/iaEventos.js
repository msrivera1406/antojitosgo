/** Evento que emite el asistente (real o simulado) al terminar una respuesta. */
export const EVENTO_RESPUESTA_IA = 'antojito:ia-respuesta';

/** `ids` es opcional: la simulación ya sabe qué puestos recomendó; el asistente real solo manda texto. */
export function emitirRespuestaIA(texto, ids) {
  globalThis.dispatchEvent(new CustomEvent(EVENTO_RESPUESTA_IA, { detail: { texto, ids } }));
}
