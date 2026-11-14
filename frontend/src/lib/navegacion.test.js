import test from 'node:test';
import assert from 'node:assert/strict';
import { detectarPlataforma, opcionesNavegacion } from './navegacion.js';
import { formatearPrecio } from './formato.js';

const destino = { lat: 19.4326, lng: -99.1332, nombre: 'Esquites Doña Lupe' };
const ids = (opciones) => opciones.map((o) => o.id);

test('detectarPlataforma', () => {
  assert.equal(detectarPlataforma({ userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8)' }), 'android');
  assert.equal(detectarPlataforma({ userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)' }), 'ios');
  assert.equal(detectarPlataforma({ userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15)', maxTouchPoints: 5 }), 'ios');
  assert.equal(detectarPlataforma({ userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15)', maxTouchPoints: 0 }), 'otro');
  assert.equal(detectarPlataforma({ userAgent: 'Mozilla/5.0 (X11; Linux x86_64)' }), 'otro');
  assert.equal(detectarPlataforma(), 'otro');
});

test('opciones base: Google Maps y Waze con las coordenadas', () => {
  const opciones = opcionesNavegacion(destino);
  assert.deepEqual(ids(opciones), ['google', 'waze']);
  assert.equal(opciones[0].url, 'https://www.google.com/maps/dir/?api=1&destination=19.4326,-99.1332');
  assert.equal(opciones[1].url, 'https://waze.com/ul?ll=19.4326,-99.1332&navigate=yes');
});

test('iOS suma Apple Maps y Android suma el selector del sistema', () => {
  assert.deepEqual(ids(opcionesNavegacion(destino, 'ios')), ['google', 'waze', 'apple']);
  const android = opcionesNavegacion(destino, 'android');
  assert.deepEqual(ids(android), ['google', 'waze', 'otra']);
  assert.equal(
    android[2].url,
    'geo:19.4326,-99.1332?q=19.4326,-99.1332(Esquites%20Do%C3%B1a%20Lupe)',
  );
});

test('geo: el nombre no puede romper el URI (paréntesis y caracteres especiales)', () => {
  const [, , otra] = opcionesNavegacion({ ...destino, nombre: 'Tacos (el "güero") & más?' }, 'android');
  assert.ok(!/\(.*[()].*\)/.test(otra.url.replace(/^[^(]*\(/, '(')), otra.url);
  assert.equal(otra.url.match(/\(/g).length, 1);
  assert.equal(otra.url.match(/\)/g).length, 1);
  assert.ok(!otra.url.includes('&'));
});

test('geo: sin nombre usa solo las coordenadas', () => {
  const [, , otra] = opcionesNavegacion({ lat: 19.4, lng: -99.1 }, 'android');
  assert.equal(otra.url, 'geo:19.4,-99.1?q=19.4,-99.1');
});

test('coordenadas inválidas lanzan error', () => {
  assert.throws(() => opcionesNavegacion({ lat: '19.4', lng: -99.1 }));
  assert.throws(() => opcionesNavegacion({ lat: NaN, lng: -99.1 }));
  assert.throws(() => opcionesNavegacion({ lat: 19.4 }));
});

test('formatearPrecio', () => {
  assert.equal(formatearPrecio(35), '$35.00');
  assert.equal(formatearPrecio(1250.5), '$1,250.50');
  assert.equal(formatearPrecio(undefined), '');
  assert.equal(formatearPrecio(null), '');
});
