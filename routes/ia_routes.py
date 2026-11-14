"""Contexto, token de voz y chat de texto del asistente. Dueño: Integrante 3 (spec 03).

GET  /api/ia/contexto?lat=&lng=            contexto y system_instruction (depuración y pruebas)
GET  /api/ia/token?lat=&lng=&excluir=a,b   token efímero de Gemini Live con instrucciones bloqueadas
POST /api/ia/chat                          chat de texto con modelos de respaldo
"""
from flask import Blueprint, jsonify, request

import config
from db import db_cursor
from services import gemini_chat, gemini_token
from services.ia_contexto import construir_contexto, validar_coordenadas
from services.limitador import limitador

ia_bp = Blueprint("ia", __name__)

LIMITE_CONTEXTO = 60   # peticiones por minuto y por IP
LIMITE_TOKEN = 10
LIMITE_CHAT = 20
MAX_MENSAJE = 500
MAX_HISTORIAL = 10
MAX_TEXTO_HISTORIAL = 1000


def _error(mensaje, status, codigo=None):
    cuerpo = {"error": mensaje}
    if codigo:
        cuerpo["codigo"] = codigo
    return jsonify(cuerpo), status


def _limite_excedido(prefijo, maximo):
    return not limitador.permitir(f"{prefijo}:{request.remote_addr}", maximo)


def _armar_contexto(lat, lng, por_defecto, canal):
    """Contexto con puestos cercanos. Si la BD falla, se degrada a una lista vacía en vez de caerse."""
    try:
        with db_cursor(commit=False) as cursor:
            return construir_contexto(cursor, lat, lng, ubicacion_por_defecto=por_defecto, canal=canal)
    except Exception:  # noqa: BLE001
        from flask import current_app

        current_app.logger.warning("IA: no se pudo consultar la BD, se continúa sin puestos", exc_info=True)
        return construir_contexto(None, lat, lng, ubicacion_por_defecto=por_defecto, canal=canal)


# ---------------------------------------------------------------- contexto

@ia_bp.get("/api/ia/contexto")
def contexto():
    if _limite_excedido("ctx", LIMITE_CONTEXTO):
        return _error("Demasiadas peticiones. Espera un momento", 429)
    try:
        lat, lng, por_defecto = validar_coordenadas(request.args.get("lat"), request.args.get("lng"))
    except ValueError as e:
        return _error(str(e), 400)
    return jsonify(_armar_contexto(lat, lng, por_defecto, "voz"))


# ---------------------------------------------------------------- token de voz

@ia_bp.get("/api/ia/token")
def token():
    if _limite_excedido("token", LIMITE_TOKEN):
        return _error("Demasiadas peticiones. Espera un momento", 429)
    try:
        lat, lng, por_defecto = validar_coordenadas(request.args.get("lat"), request.args.get("lng"))
    except ValueError as e:
        return _error(str(e), 400)
    if not config.GEMINI_API_KEY or not gemini_token.modelos_voz():
        return _error("El asistente de voz no está disponible por ahora", 503, "no_configurado")

    excluir = gemini_token.parsear_excluir(request.args.get("excluir"))
    modelo = gemini_token.elegir_modelo(excluir)
    if modelo is None:
        return _error("El asistente de voz está muy ocupado. Prueba el chat de texto", 503, "modelos_agotados")

    instruccion = _armar_contexto(lat, lng, por_defecto, "voz")["system_instruction"]
    try:
        datos = gemini_token.crear_token(modelo, instruccion)
    except gemini_token.TokenNoConfigurado:
        return _error("El asistente de voz no está disponible por ahora", 503, "no_configurado")
    except gemini_token.TokenError:
        return _error("No pudimos iniciar el asistente de voz. Inténtalo de nuevo", 502, "token_fallido")
    datos["modelos_restantes"] = gemini_token.modelos_restantes(modelo, excluir)
    return jsonify(datos)


# ---------------------------------------------------------------- chat de texto

def _validar_chat(cuerpo):
    """Devuelve (mensaje, historial, lat, lng, por_defecto). ValueError con mensaje en español si es inválido."""
    if not isinstance(cuerpo, dict):
        raise ValueError("El cuerpo debe ser un objeto JSON")
    mensaje = cuerpo.get("mensaje")
    if not isinstance(mensaje, str) or not mensaje.strip():
        raise ValueError("Escribe un mensaje")
    mensaje = mensaje.strip()
    if len(mensaje) > MAX_MENSAJE:
        raise ValueError(f"El mensaje no puede pasar de {MAX_MENSAJE} caracteres")

    historial = cuerpo.get("historial", [])
    if not isinstance(historial, list) or len(historial) > MAX_HISTORIAL:
        raise ValueError(f"El historial admite hasta {MAX_HISTORIAL} mensajes")
    limpio = []
    for h in historial:
        if not isinstance(h, dict) or h.get("rol") not in ("usuario", "asistente") or not isinstance(h.get("texto"), str):
            raise ValueError("Historial no válido")
        texto = h["texto"].strip()
        if not texto or len(texto) > MAX_TEXTO_HISTORIAL:
            raise ValueError("Historial no válido")
        limpio.append({"rol": h["rol"], "texto": texto})

    lat, lng = cuerpo.get("lat"), cuerpo.get("lng")
    if isinstance(lat, bool) or isinstance(lng, bool):
        raise ValueError("lat y lng deben ser números")
    lat, lng, por_defecto = validar_coordenadas(lat, lng)
    return mensaje, limpio, lat, lng, por_defecto


@ia_bp.post("/api/ia/chat")
def chat():
    if _limite_excedido("chat", LIMITE_CHAT):
        return _error("Demasiadas peticiones. Espera un momento", 429)
    try:
        mensaje, historial, lat, lng, por_defecto = _validar_chat(request.get_json(silent=True))
    except ValueError as e:
        return _error(str(e), 400)

    instruccion = _armar_contexto(lat, lng, por_defecto, "texto")["system_instruction"]
    try:
        resultado = gemini_chat.generar_respuesta(instruccion, historial, mensaje)
    except gemini_chat.ChatNoConfigurado:
        return _error("El chat no está disponible por ahora", 503, "no_configurado")
    except gemini_chat.ChatConfiguracion:
        return _error("El asistente no está disponible por un problema de configuración", 502, "configuracion")
    except gemini_chat.ChatOcupado:
        return _error("El asistente está ocupado, intenta en un momento", 503, "ocupado")
    return jsonify(resultado)
