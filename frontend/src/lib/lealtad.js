/** Niveles según el contrato compartido (sección 2). Los puntos no se canjean. */
export const NIVELES = [
  { id: 'explorador', nombre: 'Explorador de Banqueta', desde: 0 },
  { id: 'cazador', nombre: 'Cazador de Garnachas', desde: 150 },
  { id: 'maestro', nombre: 'Maestro del Antojo', desde: 500 },
];

export function nivelPorPuntos(puntos) {
  const p = Math.max(0, Number(puntos) || 0);
  let actual = NIVELES[0];
  for (const n of NIVELES) if (p >= n.desde) actual = n;
  return actual;
}

/** { nivel, siguiente, faltan, porcentaje, maximo } */
export function progresoNivel(puntos) {
  const p = Math.max(0, Number(puntos) || 0);
  const nivel = nivelPorPuntos(p);
  const idx = NIVELES.findIndex((n) => n.id === nivel.id);
  const siguiente = NIVELES[idx + 1] ?? null;
  if (!siguiente) return { nivel, siguiente: null, faltan: 0, porcentaje: 100, maximo: true };
  const tramo = siguiente.desde - nivel.desde;
  return {
    nivel,
    siguiente,
    faltan: siguiente.desde - p,
    porcentaje: Math.min(100, Math.round(((p - nivel.desde) / tramo) * 100)),
    maximo: false,
  };
}

export function porcentaje(actual, meta) {
  if (!meta) return 0;
  return Math.min(100, Math.max(0, Math.round((actual / meta) * 100)));
}
