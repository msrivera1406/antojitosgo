import { normalizarTexto } from './texto.js';

export const ESTATUS_FILTRO = [
  { valor: 'todos', etiqueta: 'Todos' },
  { valor: 'verificados', etiqueta: 'Verificados' },
  { valor: 'recomendados', etiqueta: 'Recomendados' },
];

const TRADUCCION_ESTATUS = { verificados: 'verificado', recomendados: 'recomendado' };

/**
 * Filtra en el cliente sobre la lista ya cargada. No muta el arreglo original.
 * El texto se compara con nombre, descripción y categoría.
 */
export function filtrarPuestos(puestos, { categoria = null, estatus = 'todos', texto = '' } = {}) {
  const lista = Array.isArray(puestos) ? puestos : [];
  const buscado = normalizarTexto(texto);
  const estatusReal = TRADUCCION_ESTATUS[estatus] ?? null;

  return lista.filter((p) => {
    if (categoria && p.categoria !== categoria) return false;
    if (estatusReal && p.estatus !== estatusReal) return false;
    if (buscado) {
      const pajar = normalizarTexto(`${p.nombre} ${p.descripcion ?? ''} ${p.categoria}`);
      if (!pajar.includes(buscado)) return false;
    }
    return true;
  });
}

export function hayFiltrosActivos({ categoria, estatus, texto }) {
  return Boolean(categoria) || (estatus && estatus !== 'todos') || normalizarTexto(texto) !== '';
}
