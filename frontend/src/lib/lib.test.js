import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizarTexto } from './texto.js';
import { filtrarPuestos } from './filtros.js';
import { esRutaInternaSegura, destinoTrasLogin } from './rutas.js';
import { validarRecomendacion, validarAcceso, validarProducto } from './validaciones.js';
import { agregarProducto, cambiarCantidad, subtotal, calcularTotales, armarPedido, sanearCarrito } from './carrito.js';
import { nivelPorPuntos, progresoNivel } from './lealtad.js';
import { coincideCodigo, accionSiguiente } from './pedidos.js';
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

test('carrito: agregar, cantidades y totales sin errores de coma flotante', () => {
  let c = [];
  c = agregarProducto(c, { id: 1, nombre: 'Esquite', precio: 0.1 });
  c = agregarProducto(c, { id: 1, nombre: 'Esquite', precio: 0.1 });
  c = agregarProducto(c, { id: 1, nombre: 'Esquite', precio: 0.1 });
  assert.equal(c[0].cantidad, 3);
  assert.equal(subtotal(c), 0.3);
  c = cambiarCantidad(c, 1, 99);
  assert.equal(c[0].cantidad, 20);
  c = cambiarCantidad(c, 1, 0);
  assert.equal(c.length, 0);
});

test('calcularTotales aplica el cupón solo con compra mínima', () => {
  const carrito = [{ producto_id: 1, nombre: 'a', precio: 40, cantidad: 1 }];
  const cupon = { id: 4, monto: 15 };
  assert.deepEqual(calcularTotales(carrito, cupon), { subtotal: 40, descuento: 0, total: 40 });
  const mas = [{ producto_id: 1, nombre: 'a', precio: 40, cantidad: 2 }];
  assert.deepEqual(calcularTotales(mas, cupon), { subtotal: 80, descuento: 15, total: 65 });
  assert.deepEqual(calcularTotales(mas, null), { subtotal: 80, descuento: 0, total: 80 });
});

test('armarPedido no envía precios ni totales', () => {
  const cuerpo = armarPedido(3, [{ producto_id: 9, nombre: 'x', precio: 35, cantidad: 2 }], { id: 4 });
  assert.deepEqual(cuerpo, { puesto_id: 3, items: [{ producto_id: 9, cantidad: 2 }], cupon_id: 4 });
  assert.equal('cupon_id' in armarPedido(3, [], null), false);
});

test('sanearCarrito descarta datos corruptos', () => {
  assert.deepEqual(sanearCarrito('x'), []);
  const limpio = sanearCarrito([{ producto_id: 1, nombre: 'a', precio: 10, cantidad: 500 }, { foo: 1 }]);
  assert.equal(limpio.length, 1);
  assert.equal(limpio[0].cantidad, 20);
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

test('pedidos: código y acciones', () => {
  assert.equal(coincideCodigo({ codigo_pickup: 'ANT-482' }, 'ant 482'), true);
  assert.equal(coincideCodigo({ codigo_pickup: 'ANT-482' }, '999'), false);
  assert.equal(accionSiguiente('pendiente').estado, 'listo');
  assert.equal(accionSiguiente('entregado'), null);
});

test('fotoSegura solo acepta uploads propios', () => {
  assert.equal(fotoSegura('/static/uploads/a.jpg'), '/static/uploads/a.jpg');
  assert.equal(fotoSegura('https://evil.com/a.jpg'), null);
  assert.equal(fotoSegura('/static/uploads/../secreto'), null);
  assert.equal(fotoSegura(null), null);
});
