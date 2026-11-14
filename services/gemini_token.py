"""Tokens efímeros para Gemini Live y selección de modelos de respaldo. Dueño: Integrante 3 (spec 03).

La API key vive solo en el servidor. El navegador recibe un token de un solo uso con el modelo, la
modalidad de audio y las instrucciones del sistema BLOQUEADOS (live_connect_constraints), así que no puede
cambiarlos ni usar el token para otra cosa.

Crear un token NO detecta saturación del modelo (eso solo se ve al conectar). Por eso el cliente avisa con
`excluir` qué modelos fallaron y este módulo devuelve el siguiente, sin guardar estado en el servidor.
"""
import datetime
import time

import config

VIGENCIA_MIN = 30          # tiempo para enviar mensajes con el token
INICIO_SESION_MIN = 1      # tiempo para abrir la sesión con el token
REINTENTO_ESPERA_S = 0.5


class TokenNoConfigurado(Exception):
    """Falta la API key o los modelos en el entorno."""


class TokenError(Exception):
    """Gemini no pudo crear el token."""


def modelos_voz():
    """[GEMINI_MODEL, *GEMINI_MODEL_FALLBACKS] sin vacíos ni duplicados, respetando el orden."""
    vistos, lista = set(), []
    for m in [config.GEMINI_MODEL, *config.GEMINI_MODEL_FALLBACKS]:
        if m and m not in vistos:
            vistos.add(m)
            lista.append(m)
    return lista


def elegir_modelo(excluir):
    """Primer modelo de la lista que no esté en `excluir`. Ignora nombres ajenos a la lista. None si no queda ninguno."""
    descartados = set(excluir or [])
    return next((m for m in modelos_voz() if m not in descartados), None)


def modelos_restantes(modelo_elegido, excluir):
    """Cuántos modelos quedan como respaldo después del elegido."""
    descartados = set(excluir or []) | {modelo_elegido}
    return len([m for m in modelos_voz() if m not in descartados])


def parsear_excluir(texto):
    """'a,b , c' -> ['a', 'b', 'c'] (máximo 10 elementos, para no procesar entradas absurdas)."""
    return [x.strip() for x in (texto or "").split(",") if x.strip()][:10]


def _crear_cliente():
    from google import genai

    return genai.Client(api_key=config.GEMINI_API_KEY, http_options={"api_version": "v1beta"})


def crear_token(modelo, system_instruction, *, fabrica_cliente=None, dormir=time.sleep, ahora=None):
    """Crea el token efímero. Devuelve {'token', 'model', 'expira_en'}.

    Reintenta una vez a los 0,5 s. Lanza TokenNoConfigurado o TokenError.
    """
    if not config.GEMINI_API_KEY or not modelo:
        raise TokenNoConfigurado("El asistente de voz no está configurado")
    ahora = ahora or datetime.datetime.now(tz=datetime.timezone.utc)
    expira = ahora + datetime.timedelta(minutes=VIGENCIA_MIN)
    parametros = {
        "uses": 1,
        "expire_time": expira,
        "new_session_expire_time": ahora + datetime.timedelta(minutes=INICIO_SESION_MIN),
        "live_connect_constraints": {
            "model": modelo,
            "config": {
                "response_modalities": ["AUDIO"],
                "system_instruction": system_instruction,
                "input_audio_transcription": {},
                "output_audio_transcription": {},
                "session_resumption": {},
            },
        },
    }
    cliente = (fabrica_cliente or _crear_cliente)()
    ultimo_error = None
    for intento in range(2):
        try:
            token = cliente.auth_tokens.create(config=parametros)
            return {"token": token.name, "model": modelo, "expira_en": expira.isoformat(timespec="seconds")}
        except Exception as e:  # noqa: BLE001  (cualquier fallo del SDK o de red)
            ultimo_error = e
            if intento == 0:
                dormir(REINTENTO_ESPERA_S)
    raise TokenError("No se pudo crear el token de voz") from ultimo_error
