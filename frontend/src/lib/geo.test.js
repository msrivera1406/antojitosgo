import test from 'node:test';
import assert from 'node:assert/strict';
import {
  distanciaMetros,
  dentroDelArea,
  aceptarLectura,
  normalizarRumbo,
  circuloGeoJSON,
  estadoDesdeError,
} from './geo.js';

const AREA = { lat: [19.0, 19.9], lng: [-99.45, -98.75] };

test('distanciaMetros: mismo punto es 0', () => {
  const p = { lat: 19.4326, lng: -99.1332 };
  assert.equal(distanciaMetros(p, p), 0);
});

test('distanciaMetros: Zócalo a Ángel de la Independencia ronda 4 km', () => {
  const zocalo = { lat: 19.4326, lng: -99.1332 };
  const angel = { lat: 19.4270, lng: -99.1677 };
  const d = distanciaMetros(zocalo, angel);
  assert.ok(d > 3500 && d < 4200, `distancia inesperada: ${d}`);
});

test('dentroDelArea: CDMX sí, Monterrey no, valores inválidos no', () => {
  assert.equal(dentroDelArea({ lat: 19.4326, lng: -99.1332 }, AREA), true);
  assert.equal(dentroDelArea({ lat: 25.6866, lng: -100.3161 }, AREA), false);
  assert.equal(dentroDelArea({ lat: NaN, lng: -99.1 }, AREA), false);
  assert.equal(dentroDelArea(null, AREA), false);
});

test('dentroDelArea: incluye Texcoco (Edomex)', () => {
  assert.equal(dentroDelArea({ lat: 19.5161, lng: -98.8828 }, AREA), true);
});

test('aceptarLectura: la primera siempre se acepta', () => {
  assert.equal(aceptarLectura(null, { precision: 5000 }, 100), true);
});

test('aceptarLectura: lectura precisa reemplaza, imprecisa que empeora se descarta', () => {
  const anterior = { precision: 20 };
  assert.equal(aceptarLectura(anterior, { precision: 50 }, 100), true);
  assert.equal(aceptarLectura(anterior, { precision: 300 }, 100), false);
});

test('aceptarLectura: imprecisa que mejora a la anterior se acepta', () => {
  assert.equal(aceptarLectura({ precision: 800 }, { precision: 300 }, 100), true);
});

test('normalizarRumbo', () => {
  assert.equal(normalizarRumbo(370), 10);
  assert.equal(normalizarRumbo(-90), 270);
  assert.equal(normalizarRumbo(0), 0);
  assert.equal(normalizarRumbo(null), null);
  assert.equal(normalizarRumbo(NaN), null);
});

test('circuloGeoJSON: anillo cerrado cuyos puntos están al radio pedido', () => {
  const centro = { lat: 19.4326, lng: -99.1332 };
  const poligono = circuloGeoJSON(centro, 50);
  const anillo = poligono.geometry.coordinates[0];
  assert.deepEqual(anillo[0], anillo[anillo.length - 1]);
  for (const [lng, lat] of anillo) {
    const d = distanciaMetros(centro, { lat, lng });
    assert.ok(Math.abs(d - 50) < 0.5, `radio inesperado: ${d}`);
  }
});

test('estadoDesdeError', () => {
  assert.equal(estadoDesdeError(1), 'denegado');
  assert.equal(estadoDesdeError(2), 'no_disponible');
  assert.equal(estadoDesdeError(3), 'timeout');
  assert.equal(estadoDesdeError(undefined), 'no_disponible');
});
