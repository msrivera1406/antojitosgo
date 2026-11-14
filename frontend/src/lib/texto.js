/** Minúsculas, sin acentos y sin espacios sobrantes. Tolera null y undefined. */
export function normalizarTexto(valor) {
  if (valor === null || valor === undefined) return '';
  return String(valor)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}
