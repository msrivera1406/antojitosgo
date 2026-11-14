import test from 'node:test';
import assert from 'node:assert/strict';
import { puestosMencionados } from './recomendaciones.js';

const PUESTOS = [
  { id: 1, nombre: 'Chilaquiles Doña Chela' },
  { id: 3, nombre: 'Esquites Parque México' },
  { id: 4, nombre: 'Tacos de Canasta Zócalo' },
  { id: 2, nombre: 'Tamales y Atole El Güero' },
  { id: 15, nombre: 'Tamales y Atole Garibaldi' },
  { id: 25, nombre: 'Churros y Chocolate San Ángel' },
  { id: 16, nombre: 'Esquites Parque Hundido' },
];

test('nombre exacto, sin importar acentos ni mayúsculas', () => {
  assert.deepEqual(puestosMencionados('Te recomiendo CHILAQUILES DONA CHELA, están abiertos.', PUESTOS), [1]);
});

test('nombre con palabras de más ("del", artículos)', () => {
  assert.deepEqual(puestosMencionados('Prueba los tacos de canasta del Zócalo, quedan a 300 m.', PUESTOS), [4]);
});

test('por palabras distintivas aunque no repita la comida', () => {
  assert.deepEqual(puestosMencionados('Ve con Doña Chela, abre temprano.', PUESTOS), [1]);
  assert.deepEqual(puestosMencionados('En San Ángel hay unos churros con chocolate.', PUESTOS), [25]);
});

test('dos recomendaciones en el orden en que se mencionan', () => {
  const texto = 'Los esquites del Parque México o los tamales de El Güero son buena opción.';
  assert.deepEqual(puestosMencionados(texto, PUESTOS), [3, 2]);
});

test('no confunde puestos con nombres parecidos', () => {
  assert.deepEqual(puestosMencionados('Los tamales y atole de Garibaldi abren de noche.', PUESTOS), [15]);
  assert.deepEqual(puestosMencionados('Esquites en el Parque Hundido.', PUESTOS), [16]);
});

test('sin falsos positivos con palabras sueltas', () => {
  assert.deepEqual(puestosMencionados('En la Ciudad de México hay muchos tacos y tamales.', PUESTOS), []);
  assert.deepEqual(puestosMencionados('¿Qué se te antoja hoy?', PUESTOS), []);
  assert.deepEqual(puestosMencionados('', PUESTOS), []);
  assert.deepEqual(puestosMencionados(null, PUESTOS), []);
});

test('máximo 2', () => {
  const texto = 'Doña Chela, Parque México y San Ángel.';
  assert.equal(puestosMencionados(texto, PUESTOS).length, 2);
});
