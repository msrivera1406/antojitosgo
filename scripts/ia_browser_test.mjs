// Prueba de extremo a extremo en un Chrome real (sin ventana), con micrófono falso. Dueño: Integrante 3 (spec 03).
//
// Controla Chrome por el protocolo de depuración (CDP), sin dependencias. Comprueba en la página real:
//   A. chat de texto: abrir, enviar y recibir respuesta
//   B. voz: conexión, estado "escuchando", respuesta hablada (estado "hablando" y vuelta a "escuchando")
//   C. caída de la sesión: reconexión automática y aviso "Se reinició la conversación"
//   D. tocar de nuevo: termina la sesión y suelta el micrófono
//   E. servidor sin modelos de voz (503 simulado): mensaje de error y apertura del chat
//
// Requisitos: Google Chrome instalado, la app corriendo y GEMINI_* configurados.
//   docker compose run --rm -d --no-deps -p 5001:5000 --name antojito-web-live web
//   node scripts/ia_browser_test.mjs [http://localhost:5001]
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const BASE = process.argv[2] || process.env.BASE_URL || 'http://localhost:5001';
const CHROME = process.env.CHROME_BIN || '/usr/bin/google-chrome';
const PUERTO = 9333;
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
let fallos = 0;
const comprobar = (ok, texto) => { console.log(`  ${ok ? 'OK ' : 'FALLO'} ${texto}`); if (!ok) fallos++; };

const perfil = mkdtempSync(join(tmpdir(), 'chrome-ia-'));
const chrome = spawn(CHROME, [
  '--headless=new', '--no-sandbox', '--disable-gpu', `--remote-debugging-port=${PUERTO}`, `--user-data-dir=${perfil}`,
  '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--autoplay-policy=no-user-gesture-required',
  '--no-first-run', '--disable-extensions', 'about:blank',
], { stdio: 'ignore' });

function terminar(codigo) {
  try { chrome.kill('SIGKILL'); } catch { /* ya cerrado */ }
  try { rmSync(perfil, { recursive: true, force: true }); } catch { /* nada */ }
  process.exit(codigo);
}
setTimeout(() => { console.error('Tiempo máximo excedido'); terminar(2); }, 240000);

// ------------------------------------------------------------------ cliente CDP mínimo
async function conectarCDP() {
  let objetivo;
  for (let i = 0; i < 50 && !objetivo; i++) {
    try {
      const lista = await (await fetch(`http://127.0.0.1:${PUERTO}/json/list`)).json();
      objetivo = lista.find((t) => t.type === 'page');
    } catch { /* Chrome aún arrancando */ }
    if (!objetivo) await dormir(200);
  }
  if (!objetivo) throw new Error('No se pudo conectar con Chrome');
  const ws = new WebSocket(objetivo.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  let id = 0;
  const pendientes = new Map();
  const manejadores = new Map();
  ws.onmessage = (e) => {
    const m = JSON.parse(e.data);
    if (m.id && pendientes.has(m.id)) { pendientes.get(m.id)(m); pendientes.delete(m.id); }
    else if (m.method && manejadores.has(m.method)) manejadores.get(m.method)(m.params);
  };
  const enviar = (method, params = {}) => new Promise((res) => { const n = ++id; pendientes.set(n, res); ws.send(JSON.stringify({ id: n, method, params })); });
  return { enviar, alEvento: (m, f) => manejadores.set(m, f) };
}

const cdp = await conectarCDP();
const consola = [];
cdp.alEvento('Runtime.consoleAPICalled', (p) => consola.push(`${p.type}: ${p.args.map((a) => a.value ?? a.description ?? '').join(' ')}`));
cdp.alEvento('Runtime.exceptionThrown', (p) => consola.push(`EXCEPCIÓN: ${p.exceptionDetails.text} ${p.exceptionDetails.exception?.description || ''}`));
await cdp.enviar('Page.enable');
await cdp.enviar('Runtime.enable');

async function ev(expresion) {
  const r = await cdp.enviar('Runtime.evaluate', { expression: expresion, awaitPromise: true, returnByValue: true });
  if (r.result?.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description || 'error en la página');
  return r.result?.result?.value;
}
async function esperarPagina(expresion, ms, texto) {
  const fin = Date.now() + ms;
  while (Date.now() < fin) {
    try { if (await ev(expresion)) return true; } catch { /* la página puede estar cargando */ }
    await dormir(150);
  }
  console.log(`    (tiempo agotado esperando: ${texto || expresion})`);
  return false;
}
async function cargar() {
  await cdp.enviar('Page.navigate', { url: BASE + '/' });
  await esperarPagina("document.readyState === 'complete' && !!window.AntojitoIA", 15000, 'carga de la página');
}
const estado = () => ev("document.getElementById('btn-ia').dataset.estado");
const clic = (id) => ev(`document.getElementById('${id}').click()`);

// ------------------------------------------------------------------ A. chat
console.log('\nA) Chat de texto');
await cargar();
comprobar(await ev("typeof window.AntojitoIA === 'object' && !!document.getElementById('btn-ia')"), 'el módulo cargó y el botón existe');
comprobar(await ev("document.getElementById('panel-chat').hidden === true"), 'el chat empieza cerrado');
await clic('btn-chat');
comprobar(await ev("document.getElementById('panel-chat').hidden === false"), 'el botón abre el chat');
comprobar(await ev("document.getElementById('btn-chat').getAttribute('aria-expanded')") === 'true', 'aria-expanded = true');
await ev(`(() => { const i = document.getElementById('chat-entrada'); i.value = 'Tengo mucho frío, ¿qué me recomiendas?'; document.getElementById('chat-form').requestSubmit(); })()`);
comprobar(await esperarPagina("document.querySelectorAll('.ia-msg-asistente').length >= 2", 40000, 'respuesta del chat'), 'llegó la respuesta del asistente');
const respuestas = await ev("[...document.querySelectorAll('.ia-msg-asistente')].map(p => p.textContent)");
console.log(`    respuesta: "${(respuestas[1] || '').slice(0, 110)}…"`);
comprobar((respuestas[1] || '').length > 20, 'la respuesta tiene contenido');
comprobar(await ev("!document.getElementById('chat-entrada').disabled"), 'el formulario se desbloquea tras responder');
await ev("document.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape'}))");
comprobar(await ev("document.getElementById('panel-chat').hidden === true"), 'Escape cierra el chat');

// ------------------------------------------------------------------ B. voz
console.log('\nB) Voz');
await cargar();
await clic('btn-ia');
comprobar(await esperarPagina("document.getElementById('btn-ia').dataset.estado === 'escuchando'", 25000, 'estado escuchando'), 'conectó y pasó a "escuchando"');
const modelo = await ev("document.getElementById('btn-ia').dataset.modelo");
comprobar(!!modelo, `data-modelo = ${modelo}`);
comprobar(await ev("document.getElementById('btn-ia').getAttribute('aria-pressed')") === 'true', 'aria-pressed = true');
await ev("window.AntojitoIA._enviarTexto('Hola, tengo frío, ¿qué me recomiendas?')");
comprobar(await esperarPagina("document.getElementById('btn-ia').dataset.estado === 'hablando'", 30000, 'estado hablando'), 'al llegar el audio pasó a "hablando"');
comprobar(await esperarPagina("document.getElementById('ia-transcripcion').textContent.length > 10", 30000, 'transcripción'), 'se muestra la transcripción');
console.log(`    transcripción: "${(await ev("document.getElementById('ia-transcripcion').textContent")).slice(0, 100)}…"`);
comprobar(await esperarPagina("document.getElementById('btn-ia').dataset.estado === 'escuchando'", 60000, 'vuelta a escuchando'), 'al terminar de hablar volvió a "escuchando"');

// ------------------------------------------------------------------ C. caída de sesión
console.log('\nC) Caída de la sesión a mitad de la conversación');
await ev("window.AntojitoIA._sesion().close()");
comprobar(await esperarPagina("document.getElementById('btn-ia').dataset.estado === 'reconectando'", 8000, 'estado reconectando'), 'detectó la caída y pasó a "reconectando"');
comprobar(await esperarPagina("document.getElementById('btn-ia').dataset.estado === 'escuchando'", 30000, 'reconexión'), 'se reconectó solo y volvió a "escuchando"');
comprobar(await ev("document.getElementById('ia-aviso').textContent.includes('Se reinició la conversación')"), 'avisó que la conversación se reinició');
await ev("window.AntojitoIA._enviarTexto('¿Me escuchas?')");
comprobar(await esperarPagina("document.getElementById('btn-ia').dataset.estado === 'hablando'", 30000, 'hablando tras reconectar'), 'la sesión nueva responde con voz');

// ------------------------------------------------------------------ D. terminar
console.log('\nD) Terminar la sesión');
await clic('btn-ia');
comprobar(await estado() === 'inactivo', 'un toque la termina ("inactivo")');
comprobar(await ev("window.AntojitoIA._sesion() === null"), 'la sesión quedó cerrada');
await dormir(500);
comprobar(await estado() === 'inactivo', 'sigue inactivo (no se reconecta sola tras cerrarla)');

// ------------------------------------------------------------------ E. sin modelos de voz
console.log('\nE) Servidor sin modelos de voz disponibles (503 simulado)');
await cargar();
await cdp.enviar('Fetch.enable', { patterns: [{ urlPattern: '*/api/ia/token*' }] });
cdp.alEvento('Fetch.requestPaused', (p) => {
  const cuerpo = Buffer.from(JSON.stringify({ error: 'El asistente de voz está muy ocupado. Prueba el chat de texto', codigo: 'modelos_agotados' })).toString('base64');
  cdp.enviar('Fetch.fulfillRequest', { requestId: p.requestId, responseCode: 503, responseHeaders: [{ name: 'Content-Type', value: 'application/json' }], body: cuerpo });
});
await clic('btn-ia');
comprobar(await esperarPagina("document.getElementById('btn-ia').dataset.estado === 'error'", 15000, 'estado error'), 'pasó a "error"');
comprobar(await ev("document.getElementById('ia-aviso').textContent.includes('muy ocupado')"), 'mostró el mensaje de que está muy ocupado');
comprobar(await ev("document.getElementById('panel-chat').hidden === false"), 'abrió el chat de texto automáticamente');
await cdp.enviar('Fetch.disable');

const errores = consola.filter((l) => l.startsWith('EXCEPCIÓN') || l.startsWith('error'));
if (errores.length) { console.log('\nMensajes de error de la consola del navegador:'); errores.slice(0, 8).forEach((l) => console.log('  ' + l.slice(0, 200))); }
comprobar(!consola.some((l) => l.startsWith('EXCEPCIÓN')), 'no hubo excepciones sin controlar en la página');

console.log(fallos === 0 ? '\nTODO OK' : `\n${fallos} comprobación(es) fallaron`);
terminar(fallos === 0 ? 0 : 1);
