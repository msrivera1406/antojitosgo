import { normalizarTexto } from './texto.js';

/**
 * Detecta qué puestos menciona por nombre una respuesta del asistente.
 * La IA no siempre repite el nombre exacto ("los tacos de canasta del Zócalo" por
 * "Tacos de Canasta Zócalo"), así que se compara por palabras completas:
 *   a) aparecen todas las palabras significativas del nombre, o
 *   b) aparecen al menos 2 palabras distintivas (las que no son de comida) y todas ellas, o
 *   c) aparecen todas las distintivas y al menos una palabra de comida del nombre ("los tamales de El Güero").
 * Devuelve hasta `maximo` ids en el orden en que se mencionan.
 */
const VACIAS = new Set(['de', 'del', 'la', 'las', 'el', 'los', 'y', 'e', 'en', 'a', 'al', 'con']);
const COMIDA = new Set([
  'tacos', 'taco', 'tamales', 'tamal', 'tortas', 'torta', 'esquites', 'esquite', 'elotes', 'elote', 'chilaquiles',
  'churros', 'churro', 'atole', 'aguas', 'agua', 'frescas', 'jugos', 'nieves', 'pan', 'dulce', 'raspados', 'helados',
  'chocolate', 'tostadas', 'canasta', 'guisado', 'postres', 'bebidas',
]);

export function palabras(texto) {
  return normalizarTexto(texto).replace(/[^a-z0-9ñ]+/g, ' ').trim().split(' ').filter(Boolean);
}

function posicionDeCoincidencia(nombre, indice) {
  const significativas = palabras(nombre).filter((p) => !VACIAS.has(p));
  if (significativas.length === 0) return -1;
  const distintivas = significativas.filter((p) => !COMIDA.has(p));
  const todas = significativas.every((p) => indice.has(p));
  const comida = significativas.filter((p) => COMIDA.has(p) && indice.has(p));
  const distintivasPresentes = distintivas.length > 0 && distintivas.every((p) => indice.has(p));
  const porDistintivas = distintivasPresentes && (distintivas.length >= 2 || comida.length > 0);
  if (!todas && !porDistintivas) return -1;
  const usadas = todas ? significativas : [...distintivas, ...comida];
  return Math.min(...usadas.map((p) => indice.get(p)));
}

export function puestosMencionados(texto, puestos, maximo = 2) {
  if (!texto || !Array.isArray(puestos)) return [];
  const indice = new Map();
  palabras(texto).forEach((p, i) => {
    if (!indice.has(p)) indice.set(p, i);
  });
  return puestos
    .map((p) => ({ id: p.id, pos: posicionDeCoincidencia(p.nombre, indice) }))
    .filter((c) => c.pos >= 0)
    .sort((a, b) => a.pos - b.pos)
    .slice(0, maximo)
    .map((c) => c.id);
}
