/* Utilidades puras del asistente de voz y chat. Dueño: Integrante 3 (spec 03).
 *
 * Sin dependencias del navegador: se prueba con `node --test static/js/tests/`.
 * En el navegador se expone como `globalThis.AntojitoAudio` (lo importa gemini_live.js);
 * en Node se exporta con `module.exports`.
 */
(function (raiz) {
  'use strict';

  const TASA_ENTRADA = 16000; // lo que Gemini espera del micrófono
  const TASA_SALIDA = 24000; // lo que Gemini devuelve

  // ---------------------------------------------------------------- audio

  /** Float32 [-1, 1] a PCM de 16 bits, con saturación. */
  function float32AInt16(f32) {
    const salida = new Int16Array(f32.length);
    for (let i = 0; i < f32.length; i++) {
      const s = Math.max(-1, Math.min(1, f32[i]));
      salida[i] = s < 0 ? Math.round(s * 0x8000) : Math.round(s * 0x7fff);
    }
    return salida;
  }

  function int16AFloat32(i16) {
    const salida = new Float32Array(i16.length);
    for (let i = 0; i < i16.length; i++) salida[i] = i16[i] < 0 ? i16[i] / 0x8000 : i16[i] / 0x7fff;
    return salida;
  }

  /** PCM de 16 bits a base64 (little-endian, sin depender del orden de bytes de la plataforma). */
  function int16ABase64(i16) {
    const bytes = new Uint8Array(i16.length * 2);
    const vista = new DataView(bytes.buffer);
    for (let i = 0; i < i16.length; i++) vista.setInt16(i * 2, i16[i], true);
    let binario = '';
    for (let i = 0; i < bytes.length; i += 0x8000) {
      binario += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    }
    return btoa(binario);
  }

  function base64AInt16(base64) {
    const binario = atob(base64);
    const longitud = binario.length - (binario.length % 2); // descarta un byte suelto
    const salida = new Int16Array(longitud / 2);
    const bytes = new Uint8Array(longitud);
    for (let i = 0; i < longitud; i++) bytes[i] = binario.charCodeAt(i);
    const vista = new DataView(bytes.buffer);
    for (let i = 0; i < salida.length; i++) salida[i] = vista.getInt16(i * 2, true);
    return salida;
  }

  /** Cambia la frecuencia de muestreo: promedio por ventanas al bajar, interpolación lineal al subir. */
  function remuestrear(f32, tasaOrigen, tasaDestino) {
    if (!f32.length || tasaOrigen === tasaDestino) return f32;
    const razon = tasaOrigen / tasaDestino;
    const longitud = Math.floor(f32.length / razon);
    const salida = new Float32Array(longitud);
    if (razon > 1) {
      for (let i = 0; i < longitud; i++) {
        const inicio = Math.floor(i * razon);
        const fin = Math.min(f32.length, Math.max(inicio + 1, Math.floor((i + 1) * razon)));
        let suma = 0;
        for (let j = inicio; j < fin; j++) suma += f32[j];
        salida[i] = suma / (fin - inicio);
      }
    } else {
      for (let i = 0; i < longitud; i++) {
        const pos = i * razon;
        const a = Math.floor(pos);
        const b = Math.min(f32.length - 1, a + 1);
        salida[i] = f32[a] + (f32[b] - f32[a]) * (pos - a);
      }
    }
    return salida;
  }

  // ---------------------------------------------------------------- mensajes del servidor

  /**
   * Normaliza un mensaje de la Live API. Un mismo evento puede traer varias partes (audio y texto a la vez),
   * así que se recorren todas.
   */
  function procesarMensajeServidor(msg) {
    const r = { audios: [], interrumpido: false, turnoCompleto: false, textoEntrada: '', textoSalida: '', goAway: false };
    if (!msg) return r;
    const sc = msg.serverContent;
    if (sc) {
      const partes = (sc.modelTurn && sc.modelTurn.parts) || [];
      for (const p of partes) {
        const datos = p && p.inlineData;
        if (datos && datos.data && (!datos.mimeType || /audio/i.test(datos.mimeType))) r.audios.push(datos.data);
      }
      if (sc.interrupted) r.interrumpido = true;
      if (sc.turnComplete) r.turnoCompleto = true;
      if (sc.inputTranscription && sc.inputTranscription.text) r.textoEntrada = sc.inputTranscription.text;
      if (sc.outputTranscription && sc.outputTranscription.text) r.textoSalida = sc.outputTranscription.text;
    }
    if (msg.goAway) r.goAway = true;
    return r;
  }

  /** Configuración que el cliente envía al conectar. Las instrucciones ya vienen bloqueadas en el token. */
  function construirConfigConexion(Modality) {
    return { responseModalities: [Modality.AUDIO] };
  }

  // ---------------------------------------------------------------- errores y reintentos

  function _numero(v) {
    return typeof v === 'number' && Number.isFinite(v) ? v : null;
  }

  /**
   * Clasifica un fallo de conexión:
   *  - 'fatal': no tiene sentido reintentar (permisos, clave, petición inválida, micrófono).
   *  - 'cambiar_modelo': el modelo no existe o no está disponible; pasar al siguiente sin esperar.
   *  - 'reintentable': saturación, red, cierre inesperado, tiempo agotado (y cualquier error desconocido).
   */
  function clasificarError(e) {
    if (e == null) return 'reintentable';
    const nombre = String(e.name || '');
    if (['NotAllowedError', 'PermissionDeniedError', 'SecurityError', 'NotFoundError', 'NotReadableError'].includes(nombre)) {
      return 'fatal';
    }
    const estado = _numero(e.status != null ? e.status : e.httpStatus);
    const cierre = _numero(e.closeCode);
    const texto = [nombre, e.message, e.reason, e.codigo, e.statusText].filter(Boolean).join(' ').toUpperCase();

    if (estado === 404 || /NOT_FOUND|NOT FOUND|NO LONGER AVAILABLE|MODELO_NO_DISPONIBLE/.test(texto)) return 'cambiar_modelo';
    if (
      [400, 401, 403].includes(estado) ||
      cierre === 1007 ||
      /PERMISSION_DENIED|UNAUTHENTICATED|INVALID_ARGUMENT|API KEY|NO_CONFIGURADO/.test(texto)
    ) {
      return 'fatal';
    }
    return 'reintentable';
  }

  /** Espera antes del reintento número `intento` (1, 2, 3...): 1 s, 2 s, 4 s, tope 8 s, con ±25 % de variación. */
  function calcularEspera(intento, aleatorio) {
    const azar = typeof aleatorio === 'function' ? aleatorio : Math.random;
    const base = Math.min(8000, 1000 * Math.pow(2, Math.max(1, intento) - 1));
    return Math.round(base * (0.75 + 0.5 * azar()));
  }

  /**
   * Conecta con reintentos y modelos de respaldo.
   *  - Fallo reintentable: espera y reintenta el mismo modelo (con token nuevo), hasta `maxIntentosPorModelo`.
   *  - Agotados los intentos, o ante "cambiar_modelo": excluye el modelo y pide el siguiente.
   *  - Fallo fatal: se detiene. Sin modelos, sin servidor, o pasado `tiempoTotalMs`: se rinde. Nunca hay bucle infinito.
   * Devuelve {ok:true, sesion, modelo, datos, excluir} o {ok:false, motivo, error?, excluir}.
   */
  async function orquestarConexion(opciones) {
    const { pedirToken, conectar, dormir, reloj } = opciones;
    const alEstado = opciones.alEstado || function () {};
    const aleatorio = opciones.aleatorio || Math.random;
    const cancelado = opciones.cancelado || function () { return false; };
    const maxIntentosPorModelo = opciones.maxIntentosPorModelo || 3;
    const tiempoTotalMs = opciones.tiempoTotalMs || 30000;
    const excluir = (opciones.excluir || []).slice();
    const inicio = reloj();
    let intentosModelo = 0;
    let fallosToken = 0;

    while (true) {
      if (cancelado()) return { ok: false, motivo: 'cancelado', excluir };
      if (reloj() - inicio >= tiempoTotalMs) return { ok: false, motivo: 'tiempo_agotado', excluir };

      let datos;
      try {
        datos = await pedirToken(excluir.slice());
        fallosToken = 0;
      } catch (e) {
        if (e && e.codigo === 'modelos_agotados') return { ok: false, motivo: 'modelos_agotados', excluir };
        if (e && e.codigo === 'no_configurado') return { ok: false, motivo: 'no_configurado', excluir };
        if (clasificarError(e) === 'fatal') return { ok: false, motivo: 'fatal', error: e, excluir };
        fallosToken++;
        if (fallosToken >= maxIntentosPorModelo) return { ok: false, motivo: 'servidor_no_responde', error: e, excluir };
        const espera = calcularEspera(fallosToken, aleatorio);
        alEstado({ estado: 'reconectando', intento: fallosToken, esperaMs: espera, modelo: null });
        await dormir(espera);
        continue;
      }
      if (cancelado()) return { ok: false, motivo: 'cancelado', excluir };

      try {
        const sesion = await conectar(datos);
        return { ok: true, sesion, modelo: datos.model, datos, excluir };
      } catch (e) {
        if (cancelado()) return { ok: false, motivo: 'cancelado', excluir };
        const clase = clasificarError(e);
        if (clase === 'fatal') return { ok: false, motivo: 'fatal', error: e, excluir };
        if (clase === 'cambiar_modelo') {
          excluir.push(datos.model);
          intentosModelo = 0;
          alEstado({ estado: 'reconectando', cambioModelo: true, modelo: datos.model });
          continue;
        }
        intentosModelo++;
        if (intentosModelo >= maxIntentosPorModelo) {
          excluir.push(datos.model);
          intentosModelo = 0;
          alEstado({ estado: 'reconectando', cambioModelo: true, modelo: datos.model });
          continue;
        }
        const espera = calcularEspera(intentosModelo, aleatorio);
        alEstado({ estado: 'reconectando', intento: intentosModelo, esperaMs: espera, modelo: datos.model });
        await dormir(espera);
      }
    }
  }

  // ---------------------------------------------------------------- estados de la interfaz

  const ESTADOS = ['inactivo', 'conectando', 'escuchando', 'hablando', 'reconectando', 'error'];

  const TRANSICIONES = {
    inactivo: { tocar: 'conectando' },
    conectando: { conectado: 'escuchando', reconectar: 'reconectando', tocar: 'inactivo', error: 'error', cerrar: 'inactivo' },
    escuchando: { audio_modelo: 'hablando', reconectar: 'reconectando', tocar: 'inactivo', error: 'error', cerrar: 'inactivo' },
    hablando: { turno_completo: 'escuchando', interrumpido: 'escuchando', reconectar: 'reconectando', tocar: 'inactivo', error: 'error', cerrar: 'inactivo' },
    reconectando: { conectado: 'escuchando', reconectar: 'reconectando', tocar: 'inactivo', error: 'error', cerrar: 'inactivo' },
    error: { tocar: 'conectando', cerrar: 'inactivo' },
  };

  /** Devuelve el estado siguiente, o el mismo si el evento no es válido en ese estado. */
  function siguienteEstado(estado, evento) {
    const tabla = TRANSICIONES[estado];
    return (tabla && tabla[evento]) || estado;
  }

  const ETIQUETAS = {
    inactivo: 'Hablar con el asistente de inteligencia artificial',
    conectando: 'Conectando con el asistente. Toca para cancelar',
    escuchando: 'Te escucho. Toca para terminar',
    hablando: 'El asistente está hablando. Toca para terminar',
    reconectando: 'Reconectando. Toca para cancelar',
    error: 'Hubo un problema. Toca para intentar de nuevo',
  };

  const TEXTOS_ESTADO = {
    inactivo: '',
    conectando: 'Conectando…',
    escuchando: 'Te escucho…',
    hablando: 'Antojito (IA) está hablando…',
    reconectando: 'Reconectando…',
    error: '',
  };

  /** Mensaje para el usuario según el motivo por el que no se pudo conectar. */
  function mensajeDeFallo(motivo) {
    switch (motivo) {
      case 'modelos_agotados':
        return 'El asistente de voz está muy ocupado. Prueba el chat de texto.';
      case 'no_configurado':
        return 'El asistente de voz no está disponible por ahora. Puedes escribirme.';
      case 'tiempo_agotado':
        return 'No pudimos conectar a tiempo. Prueba el chat de texto.';
      case 'servidor_no_responde':
        return 'Sin conexión con el servidor. Revisa tu internet e inténtalo de nuevo.';
      case 'fatal':
        return 'No pudimos iniciar el asistente de voz. Puedes escribirme.';
      default:
        return 'Algo salió mal con el asistente de voz.';
    }
  }

  function mensajeDeMicrofono(error) {
    const nombre = error && error.name;
    if (nombre === 'NotAllowedError' || nombre === 'PermissionDeniedError' || nombre === 'SecurityError') {
      return 'Permite el micrófono en tu navegador (ícono del candado junto a la dirección) para hablar. Mientras tanto, puedes escribirme.';
    }
    if (nombre === 'NotFoundError') return 'No encontramos un micrófono en tu dispositivo. Puedes escribirme.';
    return 'No pudimos usar el micrófono. Puedes escribirme.';
  }

  /** ¿Puede este entorno usar voz? entorno = {isSecureContext, getUserMedia, AudioContext, WebSocket} (booleanos). */
  function evaluarSoporte(entorno) {
    if (!entorno.isSecureContext) {
      return { ok: false, motivo: 'La voz necesita una conexión segura (HTTPS). Puedes escribirme.' };
    }
    if (!entorno.getUserMedia) return { ok: false, motivo: 'Tu navegador no permite usar el micrófono. Puedes escribirme.' };
    if (!entorno.AudioContext) return { ok: false, motivo: 'Tu navegador no soporta audio en tiempo real. Puedes escribirme.' };
    if (!entorno.WebSocket) return { ok: false, motivo: 'Tu navegador no soporta conexiones en tiempo real. Puedes escribirme.' };
    return { ok: true, motivo: '' };
  }

  /** "19.41,-99.17" -> {lat, lng}, o null si no es válido. Sirve para probar el asistente en un celular fuera de la CDMX. */
  function parsearUbicacionManual(texto) {
    if (typeof texto !== 'string') return null;
    const partes = texto.split(',');
    if (partes.length !== 2 || !partes[0].trim() || !partes[1].trim()) return null;
    const lat = Number(partes[0]);
    const lng = Number(partes[1]);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
    return { lat: lat, lng: lng };
  }

  /** Redondea la ubicación (3 decimales, ~110 m) antes de enviarla: el servidor y los terceros no necesitan más precisión. */
  function redondearUbicacion(ubicacion, decimales) {
    if (!ubicacion) return null;
    const d = decimales == null ? 3 : decimales;
    return { lat: Number(ubicacion.lat.toFixed(d)), lng: Number(ubicacion.lng.toFixed(d)) };
  }

  // ---------------------------------------------------------------- consentimiento de voz

  const CLAVE_CONSENTIMIENTO = 'antojito_ia_voz_v1';

  /** ¿La persona ya aceptó el aviso de voz? `almacen` es localStorage (o algo con getItem/setItem). Tolera que falle. */
  function consentimientoVoz(almacen) {
    try {
      return !!almacen && almacen.getItem(CLAVE_CONSENTIMIENTO) === 'si';
    } catch (e) {
      return false;
    }
  }

  function guardarConsentimientoVoz(almacen) {
    try {
      almacen.setItem(CLAVE_CONSENTIMIENTO, 'si');
      return true;
    } catch (e) {
      return false;
    }
  }

  // ---------------------------------------------------------------- chat de texto

  const MAX_MENSAJE = 500;
  const MAX_HISTORIAL = 10;

  /** Devuelve {ok, texto, error}. Quita espacios y valida largo. */
  function validarMensajeChat(texto) {
    const limpio = typeof texto === 'string' ? texto.trim() : '';
    if (!limpio) return { ok: false, texto: '', error: 'Escribe un mensaje' };
    if (limpio.length > MAX_MENSAJE) return { ok: false, texto: limpio, error: 'Máximo ' + MAX_MENSAJE + ' caracteres' };
    return { ok: true, texto: limpio, error: '' };
  }

  /** Historial nuevo (sin mutar) con el mensaje agregado, recortado a los últimos `max`. */
  function agregarAlHistorial(historial, rol, texto, max) {
    return historial.concat([{ rol: rol, texto: texto }]).slice(-(max || MAX_HISTORIAL));
  }

  /** Mensaje en español para un error del chat. */
  function mensajeDeErrorChat(estado, codigo, mensajeServidor) {
    if (estado === 0 || estado == null) return 'Sin conexión. Inténtalo de nuevo.';
    if (estado === 429) return 'Vas muy rápido. Espera un momento e inténtalo de nuevo.';
    if (estado === 503 && codigo === 'ocupado') return 'El asistente está ocupado, intenta en un momento.';
    if (estado === 503) return 'El chat no está disponible por ahora.';
    if (estado === 400 && mensajeServidor) return mensajeServidor;
    return 'No pudimos responderte. Inténtalo de nuevo.';
  }

  const api = {
    TASA_ENTRADA, TASA_SALIDA, ESTADOS, ETIQUETAS, TEXTOS_ESTADO, MAX_MENSAJE, MAX_HISTORIAL,
    float32AInt16, int16AFloat32, int16ABase64, base64AInt16, remuestrear,
    procesarMensajeServidor, construirConfigConexion,
    clasificarError, calcularEspera, orquestarConexion,
    siguienteEstado, mensajeDeFallo, mensajeDeMicrofono, evaluarSoporte,
    validarMensajeChat, agregarAlHistorial, mensajeDeErrorChat, parsearUbicacionManual,
    redondearUbicacion, consentimientoVoz, guardarConsentimientoVoz, CLAVE_CONSENTIMIENTO,
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else raiz.AntojitoAudio = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
