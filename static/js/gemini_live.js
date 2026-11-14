/* Asistente de voz (Gemini Live) y chat de texto. Dueño: Integrante 3 (spec 03).
 *
 * Módulo ES. Flujo de voz:
 *   toque -> micrófono -> ubicación -> token efímero (servidor) -> SDK `ai.live.connect` -> audio en ambos sentidos.
 * El token ya trae bloqueados el modelo y las instrucciones, así que aquí solo se pide audio.
 * Si un modelo está saturado, `orquestarConexion` (audio_utils.js) reintenta y pasa a los modelos de respaldo.
 * Si la voz no se puede usar, se abre el chat de texto.
 */
import './audio_utils.js';

const U = globalThis.AntojitoAudio;

// El SDK vive en el repositorio para no depender de un CDN en la demo; el CDN es solo respaldo.
const SDK_LOCAL = new URL('../vendor/genai-3.3.0.mjs', import.meta.url).href;
const SDK_CDN = 'https://esm.sh/@google/genai@3.3.0';

const TIEMPO_CONEXION_MS = 10000;
const DURACION_MAX_MS = 5 * 60 * 1000;
const MUESTRAS_POR_ENVIO_S = 0.1; // se envían bloques de ~100 ms

const $ = (id) => document.getElementById(id);
const dormir = (ms) => new Promise((resolver) => setTimeout(resolver, ms));

let sdkPromesa = null;
function cargarSDK() {
  if (!sdkPromesa) {
    sdkPromesa = import(SDK_LOCAL).catch(() => import(SDK_CDN));
    sdkPromesa.catch(() => { sdkPromesa = null; }); // permite reintentar si ambas fuentes fallaron
  }
  return sdkPromesa;
}

// ------------------------------------------------------------------ estado

const app = {
  estado: 'inactivo',
  gen: 0, // identifica la conexión vigente; los eventos de conexiones anteriores se ignoran
  corrida: 0, // identifica el intento de inicio de voz vigente (evita carreras si se cancela y se vuelve a tocar)
  sesion: null,
  modelo: null,
  excluir: [],
  cancelar: false,
  cerrando: false,
  reconectando: false,
  stream: null,
  ctxEntrada: null,
  ctxSalida: null,
  nodoCaptura: null,
  buffer: [],
  bufferMuestras: 0,
  fuentes: new Set(),
  proximo: 0,
  turnoCompleto: false,
  nuevoTurno: true,
  textoEntrada: '',
  textoSalida: '',
  temporizadorMax: null,
  ubicacion: null,
};

// ------------------------------------------------------------------ interfaz

function setEstado(evento) {
  const nuevo = U.siguienteEstado(app.estado, evento);
  if (nuevo === app.estado) return nuevo;
  app.estado = nuevo;
  pintar();
  return nuevo;
}

function pintar(textoEstado) {
  const boton = $('btn-ia');
  if (!boton) return;
  boton.dataset.estado = app.estado;
  boton.setAttribute('aria-label', U.ETIQUETAS[app.estado]);
  boton.setAttribute('aria-pressed', String(['escuchando', 'hablando'].includes(app.estado)));
  if (app.modelo) boton.dataset.modelo = app.modelo;
  else delete boton.dataset.modelo;
  $('ia-estado').textContent = textoEstado != null ? textoEstado : U.TEXTOS_ESTADO[app.estado];
}

let temporizadorAviso = null;
function mostrarAviso(texto, tipo = 'info', ms = 0) {
  const aviso = $('ia-aviso');
  if (!aviso) return;
  clearTimeout(temporizadorAviso);
  aviso.textContent = texto;
  aviso.dataset.tipo = tipo;
  aviso.hidden = false;
  if (ms) temporizadorAviso = setTimeout(limpiarAviso, ms);
}

function limpiarAviso() {
  const aviso = $('ia-aviso');
  if (aviso) { aviso.hidden = true; aviso.textContent = ''; }
}

function pintarTranscripcion() {
  const burbuja = $('ia-burbuja');
  if (!burbuja) return;
  $('ia-entrada').textContent = app.textoEntrada ? 'Tú: ' + app.textoEntrada : '';
  $('ia-transcripcion').textContent = app.textoSalida;
  burbuja.hidden = !(app.textoEntrada || app.textoSalida);
}

function limpiarTranscripcion() {
  app.textoEntrada = '';
  app.textoSalida = '';
  app.nuevoTurno = true;
  pintarTranscripcion();
}

// ------------------------------------------------------------------ ubicación

function obtenerUbicacion() {
  if (globalThis.AntojitoUbicacion && Number.isFinite(globalThis.AntojitoUbicacion.lat)) {
    return Promise.resolve({ lat: globalThis.AntojitoUbicacion.lat, lng: globalThis.AntojitoUbicacion.lng });
  }
  if (!navigator.geolocation) return Promise.resolve(null);
  return new Promise((resolver) => {
    navigator.geolocation.getCurrentPosition(
      (p) => resolver({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => resolver(null),
      { timeout: 4000, maximumAge: 300000 },
    );
  });
}

// ------------------------------------------------------------------ token y conexión

async function pedirToken(excluir) {
  const params = new URLSearchParams();
  if (app.ubicacion) {
    params.set('lat', app.ubicacion.lat);
    params.set('lng', app.ubicacion.lng);
  }
  if (excluir.length) params.set('excluir', excluir.join(','));
  let respuesta;
  try {
    respuesta = await fetch('/api/ia/token?' + params, { credentials: 'same-origin' });
  } catch (e) {
    throw { message: 'Failed to fetch' };
  }
  const cuerpo = await respuesta.json().catch(() => ({}));
  if (!respuesta.ok) throw { status: respuesta.status, codigo: cuerpo.codigo, message: cuerpo.error || 'Error del servidor' };
  return cuerpo;
}

/** Unifica los distintos tipos de error (CloseEvent, ErrorEvent, ApiError, Error) en un objeto clasificable. */
function normalizarError(e) {
  if (!e) return { message: 'error desconocido' };
  if (typeof e.code === 'number' && 'reason' in e) return { closeCode: e.code, message: e.reason || '' };
  if (e.status != null || e instanceof Error) return e;
  return { message: String(e.message != null ? e.message : e.type || e) };
}

function conectarSDK(datos) {
  const miGen = ++app.gen;
  return new Promise((resolver, rechazar) => {
    let abierto = false;
    let terminado = false;
    const fallar = (e) => {
      if (terminado) return;
      terminado = true;
      clearTimeout(limite);
      rechazar(normalizarError(e));
    };
    const limite = setTimeout(() => fallar({ message: 'TIMEOUT al conectar' }), TIEMPO_CONEXION_MS);

    cargarSDK()
      .then(async ({ GoogleGenAI, Modality }) => {
        const ai = new GoogleGenAI({ apiKey: datos.token, httpOptions: { apiVersion: 'v1beta' } });
        const sesion = await ai.live.connect({
          model: datos.model,
          config: U.construirConfigConexion(Modality),
          callbacks: {
            onopen: () => {},
            onmessage: (m) => { if (miGen === app.gen) manejarMensaje(m); },
            onerror: (e) => { if (!abierto) fallar(e); else if (miGen === app.gen) alPerderSesion(e); },
            onclose: (e) => { if (!abierto) fallar(e); else if (miGen === app.gen) alPerderSesion(e); },
          },
        });
        if (terminado) { // ya se declaró fallida por tiempo: se cierra la conexión tardía
          try { sesion.close(); } catch (_) { /* nada */ }
          return;
        }
        abierto = true;
        terminado = true;
        clearTimeout(limite);
        resolver(sesion);
      })
      .catch(fallar);
  });
}

function opcionesDeConexion(extra) {
  return {
    pedirToken,
    conectar: conectarSDK,
    dormir,
    reloj: () => Date.now(),
    alEstado: alReintento,
    cancelado: () => app.cancelar,
    ...extra,
  };
}

function alReintento(info) {
  setEstado('reconectar');
  if (info.cambioModelo) pintar('Probando otra conexión…');
  else if (info.intento) pintar(`Reconectando… (intento ${info.intento})`);
}

// ------------------------------------------------------------------ mensajes del servidor y reproducción

function manejarMensaje(msg) {
  const r = U.procesarMensajeServidor(msg);

  if (r.interrumpido) {
    vaciarReproduccion();
    app.turnoCompleto = false;
    setEstado('interrumpido');
  }
  if (r.textoEntrada || r.textoSalida) {
    if (app.nuevoTurno) { app.textoEntrada = ''; app.textoSalida = ''; app.nuevoTurno = false; }
    app.textoEntrada += r.textoEntrada;
    app.textoSalida += r.textoSalida;
    pintarTranscripcion();
  }
  if (r.audios.length) {
    app.turnoCompleto = false;
    r.audios.forEach(reproducir);
    setEstado('audio_modelo');
  }
  if (r.turnoCompleto) {
    app.turnoCompleto = true;
    app.nuevoTurno = true;
    if (app.fuentes.size === 0) setEstado('turno_completo');
  }
}

function reproducir(base64) {
  const ctx = app.ctxSalida;
  if (!ctx) return;
  const pcm = U.int16AFloat32(U.base64AInt16(base64));
  if (!pcm.length) return;
  const buffer = ctx.createBuffer(1, pcm.length, U.TASA_SALIDA); // el navegador adapta la tasa al reproducir
  buffer.copyToChannel(pcm, 0);
  const fuente = ctx.createBufferSource();
  fuente.buffer = buffer;
  fuente.connect(ctx.destination);
  const inicio = Math.max(ctx.currentTime + 0.02, app.proximo); // en cola, sin cortes ni solapes
  fuente.start(inicio);
  app.proximo = inicio + buffer.duration;
  app.fuentes.add(fuente);
  fuente.onended = () => {
    app.fuentes.delete(fuente);
    if (app.fuentes.size === 0 && app.turnoCompleto) {
      app.turnoCompleto = false;
      setEstado('turno_completo');
    }
  };
}

function vaciarReproduccion() {
  app.fuentes.forEach((f) => {
    f.onended = null;
    try { f.stop(); } catch (_) { /* ya terminó */ }
  });
  app.fuentes.clear();
  app.proximo = 0;
}

// ------------------------------------------------------------------ micrófono

async function iniciarCaptura() {
  const Ctx = globalThis.AudioContext || globalThis.webkitAudioContext;
  const ctx = new Ctx();
  app.ctxEntrada = ctx;
  await ctx.resume().catch(() => {});
  const fuente = ctx.createMediaStreamSource(app.stream);
  const silencio = ctx.createGain(); // el nodo debe llegar al destino para que el navegador lo procese
  silencio.gain.value = 0;
  silencio.connect(ctx.destination);

  if (ctx.audioWorklet && typeof AudioWorkletNode !== 'undefined') {
    const codigo =
      "class CapturaPCM extends AudioWorkletProcessor { process(e) { const c = e[0] && e[0][0]; if (c) this.port.postMessage(c.slice(0)); return true; } } registerProcessor('captura-pcm', CapturaPCM);";
    const url = URL.createObjectURL(new Blob([codigo], { type: 'application/javascript' }));
    try { await ctx.audioWorklet.addModule(url); } finally { URL.revokeObjectURL(url); }
    const nodo = new AudioWorkletNode(ctx, 'captura-pcm');
    nodo.port.onmessage = (e) => recibirMuestras(e.data, ctx.sampleRate);
    fuente.connect(nodo);
    nodo.connect(silencio);
    app.nodoCaptura = nodo;
  } else {
    const procesador = ctx.createScriptProcessor(4096, 1, 1); // respaldo para navegadores sin AudioWorklet
    procesador.onaudioprocess = (e) => recibirMuestras(new Float32Array(e.inputBuffer.getChannelData(0)), ctx.sampleRate);
    fuente.connect(procesador);
    procesador.connect(silencio);
    app.nodoCaptura = procesador;
  }
}

function recibirMuestras(f32, tasa) {
  if (!app.sesion || !['escuchando', 'hablando'].includes(app.estado)) return; // sin sesión no se acumula
  app.buffer.push(f32);
  app.bufferMuestras += f32.length;
  if (app.bufferMuestras < tasa * MUESTRAS_POR_ENVIO_S) return;

  const junto = new Float32Array(app.bufferMuestras);
  let pos = 0;
  for (const bloque of app.buffer) { junto.set(bloque, pos); pos += bloque.length; }
  app.buffer = [];
  app.bufferMuestras = 0;

  const pcm = U.float32AInt16(U.remuestrear(junto, tasa, U.TASA_ENTRADA));
  try {
    app.sesion.sendRealtimeInput({ audio: { data: U.int16ABase64(pcm), mimeType: 'audio/pcm;rate=' + U.TASA_ENTRADA } });
  } catch (_) {
    /* la sesión se cerró justo ahora: onclose iniciará la reconexión */
  }
}

// ------------------------------------------------------------------ ciclo de vida de la sesión de voz

function soporte() {
  return U.evaluarSoporte({
    isSecureContext: !!globalThis.isSecureContext,
    getUserMedia: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
    AudioContext: !!(globalThis.AudioContext || globalThis.webkitAudioContext),
    WebSocket: typeof WebSocket !== 'undefined',
  });
}

async function alternarVoz() {
  if (app.estado === 'inactivo' || app.estado === 'error') return iniciarVoz();
  return detener();
}

async function iniciarVoz() {
  const apoyo = soporte();
  if (!apoyo.ok) {
    mostrarAviso(apoyo.motivo, 'error');
    abrirChat(false);
    return;
  }
  limpiarAviso();
  limpiarTranscripcion();
  app.cancelar = false;
  app.cerrando = false;
  app.reconectando = false;
  app.excluir = [];
  app.modelo = null;
  const miCorrida = ++app.corrida;
  const vigente = () => miCorrida === app.corrida && !app.cancelar;
  setEstado('tocar'); // -> conectando

  // Los contextos de audio se crean dentro del gesto del usuario (obligatorio en iOS Safari).
  try {
    const Ctx = globalThis.AudioContext || globalThis.webkitAudioContext;
    app.ctxSalida = new Ctx();
    await app.ctxSalida.resume();
  } catch (_) { /* si falla, la reproducción lo reportará al intentar */ }

  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 },
    });
  } catch (e) {
    if (vigente()) falloDeVoz(U.mensajeDeMicrofono(e));
    return;
  }
  if (!vigente()) { // el usuario canceló mientras aparecía el permiso: se suelta el micrófono
    stream.getTracks().forEach((t) => t.stop());
    return;
  }
  app.stream = stream;

  app.ubicacion = await obtenerUbicacion();
  if (!vigente()) return;

  const resultado = await U.orquestarConexion(opcionesDeConexion({ excluir: [], cancelado: () => !vigente() }));
  if (!vigente() || resultado.motivo === 'cancelado') {
    if (resultado.ok) { try { resultado.sesion.close(); } catch (_) { /* nada */ } }
    return;
  }
  if (!resultado.ok) {
    console.warn('IA: no se pudo conectar la voz:', resultado.motivo, resultado.error || '');
    falloDeVoz(U.mensajeDeFallo(resultado.motivo));
    return;
  }

  app.sesion = resultado.sesion;
  app.excluir = resultado.excluir;
  app.modelo = resultado.modelo;
  console.info('IA: voz conectada con el modelo', resultado.modelo);
  try {
    await iniciarCaptura();
  } catch (e) {
    console.warn('IA: no se pudo iniciar la captura de audio', e);
    if (vigente()) falloDeVoz(U.mensajeDeMicrofono(e));
    return;
  }
  if (!vigente()) return;
  setEstado('conectado');
  limpiarAviso();
  app.temporizadorMax = setTimeout(() => {
    detener();
    mostrarAviso('Terminamos la sesión de voz (máximo 5 minutos). Toca el micrófono para seguir.', 'info', 8000);
  }, DURACION_MAX_MS);
}

/** Se perdió la sesión a mitad de la conversación. La reanudación no conservó el contexto con tokens efímeros
 *  (verificado), así que se abre una sesión nueva avisando al usuario. Se prefiere el mismo modelo. */
async function alPerderSesion(info) {
  if (app.cerrando || app.cancelar || app.reconectando) return;
  if (!['escuchando', 'hablando', 'conectando', 'reconectando'].includes(app.estado)) return;
  console.warn('IA: se perdió la sesión de voz', normalizarError(info));
  app.reconectando = true;
  app.gen++; // ignora los eventos de la sesión vieja
  const vieja = app.sesion;
  app.sesion = null;
  try { vieja && vieja.close(); } catch (_) { /* ya cerrada */ }
  vaciarReproduccion();
  setEstado('reconectar');
  mostrarAviso('Se perdió la conexión. Reconectando…');

  const resultado = await U.orquestarConexion(opcionesDeConexion({ excluir: app.excluir, maxIntentosPorModelo: 2 }));
  app.reconectando = false;
  if (app.cancelar || app.cerrando || resultado.motivo === 'cancelado') return;
  if (!resultado.ok) {
    falloDeVoz(U.mensajeDeFallo(resultado.motivo));
    return;
  }
  app.sesion = resultado.sesion;
  app.excluir = resultado.excluir;
  app.modelo = resultado.modelo;
  console.info('IA: voz reconectada con el modelo', resultado.modelo);
  limpiarTranscripcion();
  setEstado('conectado');
  mostrarAviso('Se reinició la conversación. Cuéntame otra vez qué se te antoja.', 'info', 6000);
}

function falloDeVoz(mensaje) {
  liberarRecursos();
  app.estado = 'error';
  pintar('');
  mostrarAviso(mensaje, 'error');
  abrirChat(false);
}

function detener() {
  app.cancelar = true;
  app.cerrando = true;
  app.corrida++;
  liberarRecursos();
  setEstado('cerrar');
  pintar();
  limpiarTranscripcion();
}

/** Idempotente: se puede llamar varias veces sin efectos secundarios. */
function liberarRecursos() {
  clearTimeout(app.temporizadorMax);
  app.temporizadorMax = null;
  app.gen++;
  const sesion = app.sesion;
  app.sesion = null;
  try { sesion && sesion.close(); } catch (_) { /* ya cerrada */ }
  if (app.stream) { app.stream.getTracks().forEach((t) => t.stop()); app.stream = null; }
  if (app.nodoCaptura) {
    try { app.nodoCaptura.disconnect(); } catch (_) { /* nada */ }
    if (app.nodoCaptura.port) app.nodoCaptura.port.onmessage = null;
    app.nodoCaptura = null;
  }
  app.buffer = [];
  app.bufferMuestras = 0;
  vaciarReproduccion();
  for (const clave of ['ctxEntrada', 'ctxSalida']) {
    const ctx = app[clave];
    app[clave] = null;
    if (ctx && ctx.state !== 'closed') ctx.close().catch(() => {});
  }
  app.modelo = null;
}

// ------------------------------------------------------------------ chat de texto

const chat = { abierto: false, historial: [], enviando: false };

function agregarBurbuja(clase, texto) {
  const lista = $('chat-mensajes');
  const p = document.createElement('p');
  p.className = 'ia-msg ' + clase;
  p.textContent = texto; // siempre textContent: el texto viene de usuarios y de un modelo
  lista.appendChild(p);
  lista.scrollTop = lista.scrollHeight;
  return p;
}

function abrirChat(enfocar = true) {
  const panel = $('panel-chat');
  if (!panel) return;
  panel.hidden = false;
  chat.abierto = true;
  $('btn-chat').setAttribute('aria-expanded', 'true');
  if (!$('chat-mensajes').children.length) {
    agregarBurbuja('ia-msg-asistente', '¡Hola! Soy Antojito. Cuéntame qué se te antoja y te recomiendo un puesto cerca de ti.');
  }
  if (enfocar) $('chat-entrada').focus();
}

function cerrarChat() {
  const panel = $('panel-chat');
  if (!panel) return;
  panel.hidden = true;
  chat.abierto = false;
  $('btn-chat').setAttribute('aria-expanded', 'false');
  $('btn-chat').focus();
}

function bloquearChat(bloqueado) {
  chat.enviando = bloqueado;
  $('chat-enviar').disabled = bloqueado;
  $('chat-entrada').disabled = bloqueado;
}

async function enviarChat(texto, esReintento = false) {
  if (chat.enviando) return;
  const valido = U.validarMensajeChat(texto);
  if (!valido.ok) { mostrarAviso(valido.error, 'error', 3000); return; }
  if (!esReintento) agregarBurbuja('ia-msg-usuario', valido.texto);

  bloquearChat(true);
  const escribiendo = document.createElement('p');
  escribiendo.className = 'ia-escribiendo';
  escribiendo.textContent = 'Antojito está escribiendo…';
  $('chat-mensajes').appendChild(escribiendo);
  $('chat-mensajes').scrollTop = $('chat-mensajes').scrollHeight;

  try {
    if (!app.ubicacion) app.ubicacion = await obtenerUbicacion();
    const cuerpo = { mensaje: valido.texto, historial: chat.historial };
    if (app.ubicacion) { cuerpo.lat = app.ubicacion.lat; cuerpo.lng = app.ubicacion.lng; }

    let respuesta;
    try {
      respuesta = await fetch('/api/ia/chat', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cuerpo),
      });
    } catch (_) {
      throw { estado: 0 };
    }
    const datos = await respuesta.json().catch(() => ({}));
    if (!respuesta.ok) throw { estado: respuesta.status, codigo: datos.codigo, mensaje: datos.error };

    escribiendo.remove();
    agregarBurbuja('ia-msg-asistente', datos.respuesta);
    chat.historial = U.agregarAlHistorial(chat.historial, 'usuario', valido.texto);
    chat.historial = U.agregarAlHistorial(chat.historial, 'asistente', datos.respuesta);
    $('chat-entrada').value = '';
  } catch (e) {
    escribiendo.remove();
    const burbuja = agregarBurbuja('ia-msg-error', U.mensajeDeErrorChat(e.estado, e.codigo, e.mensaje));
    const reintentar = document.createElement('button');
    reintentar.type = 'button';
    reintentar.textContent = 'Reintentar';
    reintentar.addEventListener('click', () => {
      burbuja.remove();
      enviarChat(valido.texto, true);
    });
    burbuja.appendChild(reintentar);
  } finally {
    bloquearChat(false);
    if (chat.abierto) $('chat-entrada').focus();
  }
}

// ------------------------------------------------------------------ arranque

function iniciar() {
  if (!$('btn-ia')) return; // el parcial no está en esta página
  pintar();

  $('btn-ia').addEventListener('click', alternarVoz);
  $('btn-chat').addEventListener('click', () => (chat.abierto ? cerrarChat() : abrirChat()));
  $('chat-cerrar').addEventListener('click', cerrarChat);
  $('chat-form').addEventListener('submit', (e) => {
    e.preventDefault();
    enviarChat($('chat-entrada').value);
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && chat.abierto) cerrarChat(); });

  // La voz no se deja encendida en segundo plano ni al salir de la página.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && !['inactivo', 'error'].includes(app.estado)) detener();
  });
  globalThis.addEventListener('pagehide', () => { if (!['inactivo', 'error'].includes(app.estado)) detener(); });

  const apoyo = soporte();
  if (!apoyo.ok) $('btn-ia').title = apoyo.motivo;

  // API pública mínima. Los ganchos `_` son para depuración y para las pruebas de navegador (scripts/ia_browser_test.mjs).
  globalThis.AntojitoIA = {
    abrirChat,
    cerrarChat,
    detener,
    estado: () => app.estado,
    _sesion: () => app.sesion,
    _enviarTexto: (texto) => {
      if (!app.sesion) return false;
      app.sesion.sendClientContent({ turns: [{ role: 'user', parts: [{ text: texto }] }], turnComplete: true });
      return true;
    },
  };
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
else iniciar();
