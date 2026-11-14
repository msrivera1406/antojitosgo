// Prueba de integración del cliente de voz, sin navegador. Dueño: Integrante 3 (spec 03).
//
// Usa el MISMO SDK de Gemini (el archivo de static/vendor) y las MISMAS funciones puras de audio_utils.js que
// el navegador, contra el servidor real (token efímero) y la API real de Gemini. Comprueba:
//   1. conexión normal y respuesta de voz con transcripción
//   2. salto al modelo de respaldo cuando el principal "está saturado" (se simula con un 503)
//   3. el audio del micrófono (tono de 48 kHz remuestreado a 16 kHz) lo acepta el servicio sin cerrar la sesión
//
// Uso:  docker compose run --rm -d -p 5001:5000 --name antojito-web-live web   (con GEMINI_* en .env)
//       node scripts/ia_smoke_js.mjs [http://localhost:5001]
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const U = require('../static/js/audio_utils.js');
const { GoogleGenAI, Modality } = await import('../static/vendor/genai-3.3.0.mjs');

const BASE = process.argv[2] || process.env.BASE_URL || 'http://localhost:5001';
const UBICACION = { lat: 19.414, lng: -99.165 };
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
let fallos = 0;
const comprobar = (condicion, texto) => {
  console.log(`  ${condicion ? 'OK ' : 'FALLO'} ${texto}`);
  if (!condicion) fallos++;
};

async function pedirToken(excluir) {
  const params = new URLSearchParams({ lat: UBICACION.lat, lng: UBICACION.lng });
  if (excluir.length) params.set('excluir', excluir.join(','));
  let res;
  try { res = await fetch(`${BASE}/api/ia/token?${params}`); } catch { throw { message: 'Failed to fetch' }; }
  const cuerpo = await res.json().catch(() => ({}));
  if (!res.ok) throw { status: res.status, codigo: cuerpo.codigo, message: cuerpo.error };
  return cuerpo;
}

/** Igual que conectarSDK de gemini_live.js, con un gancho para el manejador de mensajes. */
function conectar(datos, alMensaje, alCerrar) {
  return new Promise((resolver, rechazar) => {
    let abierto = false;
    const limite = setTimeout(() => rechazar({ message: 'TIMEOUT al conectar' }), 10000);
    const ai = new GoogleGenAI({ apiKey: datos.token, httpOptions: { apiVersion: 'v1beta' } });
    ai.live
      .connect({
        model: datos.model,
        config: U.construirConfigConexion(Modality),
        callbacks: {
          onopen: () => {},
          onmessage: (m) => alMensaje(m),
          onerror: (e) => { if (!abierto) { clearTimeout(limite); rechazar({ message: e.message }); } },
          onclose: (e) => { if (!abierto) { clearTimeout(limite); rechazar({ closeCode: e.code, message: e.reason }); } else alCerrar && alCerrar(e); },
        },
      })
      .then((s) => { abierto = true; clearTimeout(limite); resolver(s); })
      .catch((e) => { clearTimeout(limite); rechazar(e); });
  });
}

function nuevoRegistro() {
  return { audioBytes: 0, entrada: '', salida: '', turnoCompleto: false, mensajes: 0 };
}
function acumular(reg) {
  return (msg) => {
    const r = U.procesarMensajeServidor(msg);
    reg.mensajes++;
    reg.audioBytes += r.audios.reduce((n, a) => n + U.base64AInt16(a).length * 2, 0);
    reg.entrada += r.textoEntrada;
    reg.salida += r.textoSalida;
    if (r.turnoCompleto) reg.turnoCompleto = true;
  };
}
async function esperar(condicion, ms) {
  const fin = Date.now() + ms;
  while (Date.now() < fin && !condicion()) await dormir(100);
  return condicion();
}

// ------------------------------------------------------------------ 1. camino normal
console.log('\n1) Conexión normal y respuesta de voz');
{
  const reg = nuevoRegistro();
  const r = await U.orquestarConexion({
    pedirToken, dormir, reloj: Date.now,
    conectar: (d) => conectar(d, acumular(reg)),
  });
  comprobar(r.ok, `conectó con ${r.modelo}`);
  if (r.ok) {
    r.sesion.sendClientContent({ turns: [{ role: 'user', parts: [{ text: 'Tengo frío y hambre, ¿qué me recomiendas?' }] }], turnComplete: true });
    comprobar(await esperar(() => reg.turnoCompleto, 30000), 'el turno terminó');
    comprobar(reg.audioBytes > 10000, `llegó audio (${reg.audioBytes} bytes)`);
    comprobar(reg.salida.length > 10, `llegó transcripción: "${reg.salida.slice(0, 90)}…"`);
    r.sesion.close();
  }
}

// ------------------------------------------------------------------ 2. respaldo
console.log('\n2) Modelo principal "saturado": debe pasar al respaldo');
{
  const reg = nuevoRegistro();
  const esperas = [];
  const intentos = [];
  const r = await U.orquestarConexion({
    pedirToken, reloj: Date.now,
    dormir: async (ms) => { esperas.push(ms); await dormir(ms); },
    conectar: async (d) => {
      intentos.push(d.model);
      if (intentos.length <= 3) throw { status: 503, message: 'The service is currently unavailable (simulado)' };
      return conectar(d, acumular(reg));
    },
  });
  comprobar(r.ok, 'terminó conectado');
  comprobar(intentos.slice(0, 3).every((m) => m === intentos[0]), `3 intentos con el principal (${intentos[0]})`);
  comprobar(r.ok && r.modelo !== intentos[0], `luego usó el respaldo (${r.modelo})`);
  comprobar(esperas.length === 2 && esperas[0] >= 750 && esperas[1] >= 1500, `esperas crecientes (${esperas.join(' ms, ')} ms)`);
  comprobar(r.ok && r.excluir.includes(intentos[0]), 'el principal quedó excluido');
  if (r.ok) {
    r.sesion.sendClientContent({ turns: [{ role: 'user', parts: [{ text: 'Hola, ¿me escuchas?' }] }], turnComplete: true });
    comprobar(await esperar(() => reg.turnoCompleto, 30000) && reg.audioBytes > 0, 'el respaldo responde con audio');
    r.sesion.close();
  }
}

// ------------------------------------------------------------------ 3. audio del micrófono
console.log('\n3) Audio de micrófono (tono de 48 kHz -> 16 kHz PCM) aceptado por el servicio');
{
  const reg = nuevoRegistro();
  let cierre = null;
  const r = await U.orquestarConexion({
    pedirToken, dormir, reloj: Date.now,
    conectar: (d) => conectar(d, acumular(reg), (e) => { cierre = e; }),
  });
  comprobar(r.ok, `conectó con ${r.modelo}`);
  if (r.ok) {
    const tasa = 48000;
    for (let bloque = 0; bloque < 10; bloque++) { // 10 bloques de 100 ms
      const f32 = new Float32Array(tasa / 10);
      for (let i = 0; i < f32.length; i++) f32[i] = 0.4 * Math.sin((2 * Math.PI * 440 * (bloque * f32.length + i)) / tasa);
      const pcm = U.float32AInt16(U.remuestrear(f32, tasa, U.TASA_ENTRADA));
      r.sesion.sendRealtimeInput({ audio: { data: U.int16ABase64(pcm), mimeType: 'audio/pcm;rate=16000' } });
      await dormir(100);
    }
    r.sesion.sendRealtimeInput({ audioStreamEnd: true });
    await dormir(3000);
    comprobar(cierre === null, `la sesión sigue abierta tras enviar el audio${cierre ? ` (cerró: ${cierre.code} ${cierre.reason})` : ''}`);
    r.sesion.close();
  }
}

console.log(fallos === 0 ? '\nTODO OK' : `\n${fallos} comprobación(es) fallaron`);
process.exit(fallos === 0 ? 0 : 1);
