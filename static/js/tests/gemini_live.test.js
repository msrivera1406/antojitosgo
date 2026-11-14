// Pruebas de static/js/audio_utils.js. Dueño: Integrante 3 (spec 03).
// Ejecutar: node --test static/js/tests/
const test = require('node:test');
const assert = require('node:assert/strict');
const U = require('../audio_utils.js');

// ---------------------------------------------------------------- audio

test('float32AInt16: silencio, extremos y saturación', () => {
  const r = U.float32AInt16(Float32Array.from([0, 1, -1, 2, -2, 0.5]));
  assert.deepEqual(Array.from(r), [0, 32767, -32768, 32767, -32768, 16384]);
});

test('int16AFloat32 y float32AInt16 son casi inversas', () => {
  const original = Float32Array.from([0, 0.25, -0.25, 0.9, -0.9]);
  const ida = U.int16AFloat32(U.float32AInt16(original));
  original.forEach((v, i) => assert.ok(Math.abs(v - ida[i]) < 1e-3));
});

test('base64: ida y vuelta conservan las muestras, incluidos los extremos', () => {
  const muestras = Int16Array.from([0, 1, -1, 32767, -32768, 12345, -12345]);
  assert.deepEqual(Array.from(U.base64AInt16(U.int16ABase64(muestras))), Array.from(muestras));
});

test('base64: es little-endian (1 -> bytes 01 00)', () => {
  assert.equal(U.int16ABase64(Int16Array.from([1])), Buffer.from([1, 0]).toString('base64'));
});

test('base64: un audio grande no desborda la pila', () => {
  const grande = new Int16Array(300000).fill(1000);
  assert.equal(U.base64AInt16(U.int16ABase64(grande)).length, 300000);
});

test('base64AInt16 descarta un byte suelto', () => {
  assert.equal(U.base64AInt16(Buffer.from([1, 0, 9]).toString('base64')).length, 1);
});

test('remuestrear: 48 kHz a 16 kHz da un tercio de muestras y promedia', () => {
  const entrada = new Float32Array(4800).fill(0.5);
  const salida = U.remuestrear(entrada, 48000, 16000);
  assert.equal(salida.length, 1600);
  assert.ok(salida.every((v) => Math.abs(v - 0.5) < 1e-6));
});

test('remuestrear: 44.1 kHz a 16 kHz da la longitud esperada', () => {
  assert.equal(U.remuestrear(new Float32Array(4410), 44100, 16000).length, 1600);
});

test('remuestrear: 16 kHz a 24 kHz interpola', () => {
  const salida = U.remuestrear(Float32Array.from([0, 1, 0, 1]), 16000, 24000);
  assert.equal(salida.length, 6);
  assert.equal(salida[0], 0);
  assert.ok(Math.abs(salida[1] - 0.6667) < 1e-3);
});

test('remuestrear: misma tasa o entrada vacía no cambian nada', () => {
  const x = Float32Array.from([1, 2, 3]);
  assert.equal(U.remuestrear(x, 16000, 16000), x);
  assert.equal(U.remuestrear(new Float32Array(0), 48000, 16000).length, 0);
});

// ---------------------------------------------------------------- mensajes del servidor

test('procesarMensajeServidor: audio, transcripciones y fin de turno en un mismo evento', () => {
  const r = U.procesarMensajeServidor({
    serverContent: {
      modelTurn: { parts: [{ inlineData: { data: 'AAA', mimeType: 'audio/pcm;rate=24000' } }, { inlineData: { data: 'BBB', mimeType: 'audio/pcm' } }] },
      outputTranscription: { text: 'Hola' },
      inputTranscription: { text: 'quiero' },
      turnComplete: true,
    },
  });
  assert.deepEqual(r.audios, ['AAA', 'BBB']);
  assert.equal(r.textoSalida, 'Hola');
  assert.equal(r.textoEntrada, 'quiero');
  assert.equal(r.turnoCompleto, true);
  assert.equal(r.interrumpido, false);
});

test('procesarMensajeServidor: interrupción, goAway y mensajes vacíos', () => {
  assert.equal(U.procesarMensajeServidor({ serverContent: { interrupted: true } }).interrumpido, true);
  assert.equal(U.procesarMensajeServidor({ goAway: { timeLeft: '10s' } }).goAway, true);
  assert.deepEqual(U.procesarMensajeServidor(null).audios, []);
  assert.deepEqual(U.procesarMensajeServidor({}).audios, []);
});

test('procesarMensajeServidor: ignora partes que no son audio', () => {
  const r = U.procesarMensajeServidor({ serverContent: { modelTurn: { parts: [{ text: 'hola' }, { inlineData: { data: 'X', mimeType: 'image/png' } }] } } });
  assert.deepEqual(r.audios, []);
});

test('construirConfigConexion solo pide audio (las instrucciones van en el token)', () => {
  assert.deepEqual(U.construirConfigConexion({ AUDIO: 'AUDIO' }), { responseModalities: ['AUDIO'] });
});

// ---------------------------------------------------------------- clasificarError

test('clasificarError: saturación y red son reintentables', () => {
  for (const e of [
    { status: 503 }, { status: 429 }, { status: 500 }, { closeCode: 1011, message: 'Internal error' },
    { closeCode: 1006 }, { message: 'The service is currently UNAVAILABLE' }, { message: 'RESOURCE_EXHAUSTED' },
    { message: 'model is overloaded' }, { message: 'TIMEOUT al conectar' }, { message: 'Failed to fetch' }, null, undefined, {},
  ]) {
    assert.equal(U.clasificarError(e), 'reintentable', JSON.stringify(e));
  }
});

test('clasificarError: modelo no disponible cambia de modelo', () => {
  for (const e of [{ status: 404 }, { message: 'models/x is NOT_FOUND' }, { message: 'This model is no longer available to new users' }]) {
    assert.equal(U.clasificarError(e), 'cambiar_modelo', JSON.stringify(e));
  }
});

test('clasificarError: permisos, clave y petición inválida son fatales', () => {
  for (const e of [
    { status: 401 }, { status: 403 }, { status: 400 }, { closeCode: 1007 }, { message: 'PERMISSION_DENIED' },
    { message: 'API key not valid' }, { name: 'NotAllowedError' }, { name: 'NotFoundError', message: 'Requested device not found' },
  ]) {
    assert.equal(U.clasificarError(e), 'fatal', JSON.stringify(e));
  }
});

// ---------------------------------------------------------------- calcularEspera

test('calcularEspera: 1 s, 2 s, 4 s con el azar al centro', () => {
  assert.equal(U.calcularEspera(1, () => 0.5), 1000);
  assert.equal(U.calcularEspera(2, () => 0.5), 2000);
  assert.equal(U.calcularEspera(3, () => 0.5), 4000);
});

test('calcularEspera: variación de ±25 % y tope de 8 s', () => {
  assert.equal(U.calcularEspera(1, () => 0), 750);
  assert.equal(U.calcularEspera(1, () => 1), 1250);
  assert.equal(U.calcularEspera(10, () => 0.5), 8000);
  assert.ok(U.calcularEspera(10, () => 1) <= 10000);
});

// ---------------------------------------------------------------- orquestarConexion

/** Entorno simulado: reloj que avanza al "dormir", y guion de resultados por intento. */
function entorno({ tokens, conexiones, maxIntentosPorModelo, tiempoTotalMs, cancelarEn } = {}) {
  let ahora = 0;
  const registro = { esperas: [], excluidos: [], conectados: [], estados: [] };
  const colaTokens = (tokens || []).slice();
  const colaConexiones = (conexiones || []).slice();
  return {
    registro,
    opciones: {
      reloj: () => ahora,
      dormir: async (ms) => { registro.esperas.push(ms); ahora += ms; },
      aleatorio: () => 0.5,
      alEstado: (e) => registro.estados.push(e),
      maxIntentosPorModelo, tiempoTotalMs,
      cancelado: () => (cancelarEn != null ? registro.conectados.length >= cancelarEn : false),
      pedirToken: async (excluir) => {
        registro.excluidos.push(excluir);
        const paso = colaTokens.length ? colaTokens.shift() : null;
        if (paso instanceof Error || (paso && paso.fallo)) throw paso.fallo || paso;
        if (paso) return paso;
        // por defecto: primer modelo no excluido de la lista de ejemplo
        const modelo = ['m1', 'm2', 'm3'].find((m) => !excluir.includes(m));
        if (!modelo) throw { codigo: 'modelos_agotados', status: 503 };
        return { token: 't-' + modelo, model: modelo };
      },
      conectar: async (datos) => {
        registro.conectados.push(datos.model);
        const paso = colaConexiones.length ? colaConexiones.shift() : 'ok';
        if (paso !== 'ok') throw paso;
        return { sesion: datos.model };
      },
    },
  };
}

test('orquestar: éxito a la primera con el modelo principal', async () => {
  const { opciones, registro } = entorno();
  const r = await U.orquestarConexion(opciones);
  assert.equal(r.ok, true);
  assert.equal(r.modelo, 'm1');
  assert.deepEqual(registro.esperas, []);
});

test('orquestar: reintenta el mismo modelo con esperas de 1 s y 2 s y luego conecta', async () => {
  const { opciones, registro } = entorno({ conexiones: [{ status: 503 }, { status: 503 }] });
  const r = await U.orquestarConexion(opciones);
  assert.equal(r.ok, true);
  assert.equal(r.modelo, 'm1');
  assert.deepEqual(registro.esperas, [1000, 2000]);
  assert.deepEqual(registro.conectados, ['m1', 'm1', 'm1']);
});

test('orquestar: tras 3 fallos cambia al siguiente modelo y excluye el que falló', async () => {
  const { opciones, registro } = entorno({ conexiones: [{ status: 503 }, { status: 503 }, { status: 503 }] });
  const r = await U.orquestarConexion(opciones);
  assert.equal(r.ok, true);
  assert.equal(r.modelo, 'm2');
  assert.deepEqual(registro.conectados, ['m1', 'm1', 'm1', 'm2']);
  assert.deepEqual(registro.esperas, [1000, 2000]); // al cambiar de modelo no se espera
  assert.deepEqual(registro.excluidos[registro.excluidos.length - 1], ['m1']);
  assert.deepEqual(r.excluir, ['m1']);
});

test('orquestar: "cambiar_modelo" salta de inmediato, sin esperar ni reintentar', async () => {
  const { opciones, registro } = entorno({ conexiones: [{ status: 404 }] });
  const r = await U.orquestarConexion(opciones);
  assert.equal(r.modelo, 'm2');
  assert.deepEqual(registro.esperas, []);
  assert.deepEqual(registro.conectados, ['m1', 'm2']);
});

test('orquestar: un fallo fatal no se reintenta', async () => {
  const { opciones, registro } = entorno({ conexiones: [{ status: 403 }] });
  const r = await U.orquestarConexion(opciones);
  assert.equal(r.ok, false);
  assert.equal(r.motivo, 'fatal');
  assert.deepEqual(registro.conectados, ['m1']);
});

test('orquestar: si todos los modelos fallan termina con "modelos_agotados" (nunca bucle infinito)', async () => {
  const fallos = Array(9).fill({ status: 503 });
  const { opciones, registro } = entorno({ conexiones: fallos, tiempoTotalMs: 10 * 60 * 1000 });
  const r = await U.orquestarConexion(opciones);
  assert.equal(r.ok, false);
  assert.equal(r.motivo, 'modelos_agotados');
  assert.deepEqual(r.excluir, ['m1', 'm2', 'm3']);
  assert.equal(registro.conectados.length, 9); // 3 intentos x 3 modelos
});

test('orquestar: respeta el tiempo total (30 s)', async () => {
  const fallos = Array(50).fill({ status: 503 });
  const { opciones } = entorno({ conexiones: fallos, maxIntentosPorModelo: 100 });
  const r = await U.orquestarConexion(opciones);
  assert.equal(r.ok, false);
  assert.equal(r.motivo, 'tiempo_agotado');
});

test('orquestar: el usuario puede cancelar en medio de la reconexión', async () => {
  const { opciones } = entorno({ conexiones: Array(10).fill({ status: 503 }), cancelarEn: 2 });
  const r = await U.orquestarConexion(opciones);
  assert.equal(r.motivo, 'cancelado');
});

test('orquestar: el servidor sin configurar o sin modelos se informa tal cual', async () => {
  let r = await U.orquestarConexion(entorno({ tokens: [{ fallo: { codigo: 'no_configurado', status: 503 } }] }).opciones);
  assert.equal(r.motivo, 'no_configurado');
  r = await U.orquestarConexion(entorno({ tokens: [{ fallo: { codigo: 'modelos_agotados', status: 503 } }] }).opciones);
  assert.equal(r.motivo, 'modelos_agotados');
});

test('orquestar: si el servidor no responde al pedir token se rinde tras 3 intentos', async () => {
  const caido = { fallo: { message: 'Failed to fetch' } };
  const { opciones, registro } = entorno({ tokens: [caido, caido, caido] });
  const r = await U.orquestarConexion(opciones);
  assert.equal(r.motivo, 'servidor_no_responde');
  assert.deepEqual(registro.esperas, [1000, 2000]);
  assert.deepEqual(registro.conectados, []);
});

test('orquestar: un token que falla una vez y luego funciona', async () => {
  const { opciones } = entorno({ tokens: [{ fallo: { status: 502 } }] });
  const r = await U.orquestarConexion(opciones);
  assert.equal(r.ok, true);
});

test('orquestar: respeta la lista inicial de modelos excluidos (reconexión a mitad de sesión)', async () => {
  const { opciones } = entorno();
  const r = await U.orquestarConexion({ ...opciones, excluir: ['m1'] });
  assert.equal(r.modelo, 'm2');
});

test('orquestar: avisa el estado "reconectando" en cada reintento y cambio de modelo', async () => {
  const { opciones, registro } = entorno({ conexiones: [{ status: 503 }, { status: 503 }, { status: 503 }] });
  await U.orquestarConexion(opciones);
  assert.equal(registro.estados.filter((e) => e.estado === 'reconectando').length, 3);
  assert.ok(registro.estados.some((e) => e.cambioModelo === true));
});

// ---------------------------------------------------------------- siguienteEstado

test('siguienteEstado: camino feliz', () => {
  let s = 'inactivo';
  for (const [evento, esperado] of [['tocar', 'conectando'], ['conectado', 'escuchando'], ['audio_modelo', 'hablando'],
    ['turno_completo', 'escuchando'], ['audio_modelo', 'hablando'], ['interrumpido', 'escuchando'], ['tocar', 'inactivo']]) {
    s = U.siguienteEstado(s, evento);
    assert.equal(s, esperado, evento);
  }
});

test('siguienteEstado: reconexión y error', () => {
  assert.equal(U.siguienteEstado('escuchando', 'reconectar'), 'reconectando');
  assert.equal(U.siguienteEstado('hablando', 'reconectar'), 'reconectando');
  assert.equal(U.siguienteEstado('conectando', 'reconectar'), 'reconectando'); // reintento durante la conexión inicial
  assert.equal(U.siguienteEstado('reconectando', 'conectado'), 'escuchando');
  assert.equal(U.siguienteEstado('reconectando', 'tocar'), 'inactivo'); // cancelar
  assert.equal(U.siguienteEstado('conectando', 'error'), 'error');
  assert.equal(U.siguienteEstado('error', 'tocar'), 'conectando'); // reintentar con un toque
});

test('siguienteEstado: eventos inválidos no cambian el estado', () => {
  assert.equal(U.siguienteEstado('inactivo', 'audio_modelo'), 'inactivo');
  assert.equal(U.siguienteEstado('inactivo', 'conectado'), 'inactivo');
  assert.equal(U.siguienteEstado('conectando', 'turno_completo'), 'conectando');
  assert.equal(U.siguienteEstado('estado-raro', 'tocar'), 'estado-raro');
});

test('todos los estados tienen etiqueta accesible', () => {
  for (const e of U.ESTADOS) assert.ok(U.ETIQUETAS[e], e);
});

// ---------------------------------------------------------------- soporte y mensajes

test('evaluarSoporte: explica qué falta', () => {
  const completo = { isSecureContext: true, getUserMedia: true, AudioContext: true, WebSocket: true };
  assert.equal(U.evaluarSoporte(completo).ok, true);
  assert.match(U.evaluarSoporte({ ...completo, isSecureContext: false }).motivo, /HTTPS/);
  assert.match(U.evaluarSoporte({ ...completo, getUserMedia: false }).motivo, /micrófono/);
  assert.equal(U.evaluarSoporte({ ...completo, AudioContext: false }).ok, false);
  assert.equal(U.evaluarSoporte({ ...completo, WebSocket: false }).ok, false);
});

test('mensajes de fallo y de micrófono', () => {
  assert.match(U.mensajeDeFallo('modelos_agotados'), /muy ocupado/);
  assert.match(U.mensajeDeFallo('no_configurado'), /no está disponible/);
  assert.ok(U.mensajeDeFallo('algo-desconocido').length > 0);
  assert.match(U.mensajeDeMicrofono({ name: 'NotAllowedError' }), /Permite el micrófono/);
  assert.match(U.mensajeDeMicrofono({ name: 'NotFoundError' }), /No encontramos un micrófono/);
  assert.match(U.mensajeDeMicrofono(new Error('x')), /No pudimos usar el micrófono/);
});

// ---------------------------------------------------------------- chat

test('validarMensajeChat', () => {
  assert.deepEqual(U.validarMensajeChat('  hola  '), { ok: true, texto: 'hola', error: '' });
  assert.equal(U.validarMensajeChat('   ').ok, false);
  assert.equal(U.validarMensajeChat(null).ok, false);
  assert.equal(U.validarMensajeChat('a'.repeat(500)).ok, true);
  assert.equal(U.validarMensajeChat('a'.repeat(501)).ok, false);
});

test('agregarAlHistorial no muta y conserva los últimos 10', () => {
  const base = [{ rol: 'usuario', texto: 'a' }];
  const nuevo = U.agregarAlHistorial(base, 'asistente', 'b');
  assert.equal(base.length, 1);
  assert.equal(nuevo.length, 2);
  let h = [];
  for (let i = 0; i < 15; i++) h = U.agregarAlHistorial(h, 'usuario', String(i));
  assert.equal(h.length, 10);
  assert.equal(h[0].texto, '5');
});

test('mensajeDeErrorChat', () => {
  assert.match(U.mensajeDeErrorChat(0), /Sin conexión/);
  assert.match(U.mensajeDeErrorChat(429), /Espera un momento/);
  assert.match(U.mensajeDeErrorChat(503, 'ocupado'), /ocupado/);
  assert.match(U.mensajeDeErrorChat(503, 'no_configurado'), /no está disponible/);
  assert.equal(U.mensajeDeErrorChat(400, null, 'Escribe un mensaje'), 'Escribe un mensaje');
  assert.match(U.mensajeDeErrorChat(500), /No pudimos responderte/);
});

test('parsearUbicacionManual', () => {
  assert.deepEqual(U.parsearUbicacionManual('19.4125,-99.169'), { lat: 19.4125, lng: -99.169 });
  assert.deepEqual(U.parsearUbicacionManual(' 19.4 , -99.1 '), { lat: 19.4, lng: -99.1 });
  for (const malo of [null, undefined, '', 'abc', '19.4', '19.4,', ',-99', '91,0', '0,181', 'NaN,0', '1,2,3', 'Infinity,0']) {
    assert.equal(U.parsearUbicacionManual(malo), null, String(malo));
  }
});
