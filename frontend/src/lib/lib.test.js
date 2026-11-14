import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizarTexto } from './texto.js';
import { filtrarPuestos } from './filtros.js';
import { esRutaInternaSegura, destinoTrasLogin } from './rutas.js';
import { validarRecomendacion, validarAcceso, validarProducto } from './validaciones.js';
import { nivelPorPuntos, progresoNivel } from './lealtad.js';
import { fotoSegura } from './fotos.js';

const PUESTOS = [
  { id: 1, nombre: 'Esquites Doña Lupe', descripcion: 'Con mayonesa y chile', categoria: 'esquites', estatus: 'verificado' },
  { id: 2, nombre: 'Tacos El Güero', descripcion: 'Al pastor', categoria: 'tacos', estatus: 'verificado' },
  { id: 3, nombre: 'Tamales Oaxaqueños', descripcion: 'Mole y rajas', categoria: 'tamales', estatus: 'recomendado' },
];

test('normalizarTexto quita acentos, mayúsculas y espacios', () => {
  assert.equal(normalizarTexto('  Chilaquilés '), 'chilaquiles');
  assert.equal(normalizarTexto(null), '');
  assert.equal(normalizarTexto(undefined), '');
});

test('filtrarPuestos combina filtros sin mutar la lista', () => {
  const copia = JSON.stringify(PUESTOS);
  assert.equal(filtrarPuestos(PUESTOS, {}).length, 3);
  assert.equal(filtrarPuestos(PUESTOS, { categoria: 'tacos' }).length, 1);
  assert.equal(filtrarPuestos(PUESTOS, { estatus: 'recomendados' })[0].id, 3);
  assert.equal(filtrarPuestos(PUESTOS, { texto: 'guero' })[0].id, 2);
  assert.equal(filtrarPuestos(PUESTOS, { texto: 'MOLE' })[0].id, 3);
  assert.equal(filtrarPuestos(PUESTOS, { categoria: 'tacos', estatus: 'recomendados' }).length, 0);
  assert.deepEqual(filtrarPuestos(null, {}), []);
  assert.equal(JSON.stringify(PUESTOS), copia);
});

test('esRutaInternaSegura rechaza redirecciones abiertas', () => {
  assert.equal(esRutaInternaSegura('/perfil'), true);
  for (const mala of ['//evil.com', 'https://evil.com', 'javascript:alert(1)', '/\\evil.com', '', null, 'perfil']) {
    assert.equal(esRutaInternaSegura(mala), false, String(mala));
  }
});

test('destinoTrasLogin', () => {
  assert.equal(destinoTrasLogin({ rol: 'cliente' }, '/perfil'), '/perfil');
  assert.equal(destinoTrasLogin({ rol: 'cliente' }, '//evil.com'), '/');
  assert.equal(destinoTrasLogin({ rol: 'locatario' }, null), '/locatario');
});

test('validarRecomendacion', () => {
  const base = { nombre: 'Puesto', categoria: 'tacos', latitud: 19.4, longitud: -99.1, descripcion: '' };
  assert.equal(validarRecomendacion(base).ok, true);
  assert.ok(validarRecomendacion({ ...base, nombre: ' ' }).errores.nombre);
  assert.ok(validarRecomendacion({ ...base, nombre: 'x'.repeat(121) }).errores.nombre);
  assert.ok(validarRecomendacion({ ...base, categoria: '' }).errores.categoria);
  assert.ok(validarRecomendacion({ ...base, latitud: null }).errores.ubicacion);
  assert.ok(validarRecomendacion({ ...base, descripcion: 'x'.repeat(501) }).errores.descripcion);
  assert.ok(validarRecomendacion({ ...base, foto: { type: 'image/gif', size: 10 } }).errores.foto);
  assert.ok(validarRecomendacion({ ...base, foto: { type: 'image/png', size: 6 * 1024 * 1024 } }).errores.foto);
  assert.equal(validarRecomendacion({ ...base, foto: { type: 'image/webp', size: 1000 } }).ok, true);
});

test('validarAcceso', () => {
  assert.ok(validarAcceso({ email: 'mal', password: '12345678' }).errores.email);
  assert.ok(validarAcceso({ email: 'a@b.co', password: '123' }).errores.password);
  assert.ok(validarAcceso({ email: 'a@b.co', password: '12345678', nombre: '', rol: 'cliente' }, 'registro').errores.nombre);
  assert.equal(validarAcceso({ email: 'a@b.co', password: '12345678', nombre: 'Ana', rol: 'cliente' }, 'registro').ok, true);
  assert.equal(validarAcceso({ email: 'a@b.co', password: '12345678' }).ok, true);
});

test('validarProducto', () => {
  assert.ok(validarProducto({ nombre: '', precio: 10 }).errores.nombre);
  assert.ok(validarProducto({ nombre: 'Taco', precio: 0 }).errores.precio);
  assert.equal(validarProducto({ nombre: 'Taco', precio: '18.5' }).ok, true);
});

test('niveles de insignia según el contrato', () => {
  assert.equal(nivelPorPuntos(0).id, 'explorador');
  assert.equal(nivelPorPuntos(149).id, 'explorador');
  assert.equal(nivelPorPuntos(150).id, 'cazador');
  assert.equal(nivelPorPuntos(500).id, 'maestro');
  const p = progresoNivel(120);
  assert.equal(p.faltan, 30);
  assert.equal(p.siguiente.id, 'cazador');
  assert.equal(progresoNivel(900).maximo, true);
});

test('fotoSegura solo acepta uploads propios', () => {
  assert.equal(fotoSegura('/static/uploads/a.jpg'), '/static/uploads/a.jpg');
  assert.equal(fotoSegura('https://evil.com/a.jpg'), null);
  assert.equal(fotoSegura('/static/uploads/../secreto'), null);
  assert.equal(fotoSegura(null), null);
});
