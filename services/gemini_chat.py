"""Chat de texto con modelos de respaldo. Dueño: Integrante 3 (spec 03).

Prueba GEMINI_CHAT_MODEL y después cada modelo de GEMINI_CHAT_MODEL_FALLBACKS. Por modelo hay hasta 2 intentos
(0,5 s de espera entre ellos, con variación aleatoria de ±25 %). Al cambiar de modelo no se espera.
Límites: 12 s por llamada y 20 s en total.

Clasificación de errores:
  - reintentable: 429, 500, 502, 503, 504, tiempos agotados, respuesta vacía  -> reintenta y luego cambia de modelo
  - modelo no disponible: 404                                                  -> cambia de modelo de inmediato
  - configuración: 400, 401, 403                                               -> se detiene (ChatConfiguracion)
"""
import random
import time

import config

INTENTOS_POR_MODELO = 2
ESPERA_BASE_S = 0.5
TIMEOUT_LLAMADA_MS = 12_000
TIEMPO_TOTAL_S = 20
MAX_TOKENS_SALIDA = 600


class ChatNoConfigurado(Exception):
    """Falta la API key o los modelos de chat."""


class ChatConfiguracion(Exception):
    """Error que no se arregla reintentando (clave inválida, petición mal formada)."""


class ChatOcupado(Exception):
    """Todos los modelos fallaron por saturación o no disponibilidad."""


class RespuestaVacia(Exception):
    """El modelo respondió sin texto (por ejemplo, bloqueo de seguridad)."""


def modelos_chat():
    vistos, lista = set(), []
    for m in [config.GEMINI_CHAT_MODEL, *config.GEMINI_CHAT_MODEL_FALLBACKS]:
        if m and m not in vistos:
            vistos.add(m)
            lista.append(m)
    return lista


def _codigo(error):
    codigo = getattr(error, "code", None)
    return codigo if isinstance(codigo, int) else None


def es_modelo_no_disponible(error):
    return _codigo(error) == 404


def es_error_de_configuracion(error):
    return _codigo(error) in (400, 401, 403)


def es_reintentable(error):
    """Todo lo que no sea 404 ni error de configuración se considera pasajero (incluye tiempos agotados)."""
    return not es_modelo_no_disponible(error) and not es_error_de_configuracion(error)


def calcular_espera(intento, aleatorio=random.random):
    """Espera antes del reintento número `intento` (1, 2, ...): 0,5 s, 1 s, ... con ±25 % de variación."""
    base = ESPERA_BASE_S * (2 ** (intento - 1))
    return base * (0.75 + 0.5 * aleatorio())


def _crear_cliente():
    from google import genai
    from google.genai import types

    return genai.Client(api_key=config.GEMINI_API_KEY, http_options=types.HttpOptions(timeout=TIMEOUT_LLAMADA_MS))


def _contenidos(historial, mensaje):
    """El historial y el mensaje van como turnos de la conversación, nunca dentro del system_instruction."""
    turnos = [{"role": "user" if h["rol"] == "usuario" else "model", "parts": [{"text": h["texto"]}]} for h in historial]
    turnos.append({"role": "user", "parts": [{"text": mensaje}]})
    return turnos


def generar_respuesta(system_instruction, historial, mensaje, *, cliente=None, dormir=time.sleep,
                      aleatorio=random.random, reloj=time.monotonic):
    """Devuelve {'respuesta', 'modelo'}. Lanza ChatNoConfigurado, ChatConfiguracion o ChatOcupado."""
    modelos = modelos_chat()
    if not config.GEMINI_API_KEY or not modelos:
        raise ChatNoConfigurado("El chat no está configurado")
    cliente = cliente or _crear_cliente()
    contenidos = _contenidos(historial, mensaje)
    configuracion = {"system_instruction": system_instruction, "max_output_tokens": MAX_TOKENS_SALIDA}
    inicio = reloj()

    for modelo in modelos:
        for intento in range(1, INTENTOS_POR_MODELO + 1):
            if reloj() - inicio >= TIEMPO_TOTAL_S:
                raise ChatOcupado("Tiempo agotado")
            try:
                resultado = cliente.models.generate_content(model=modelo, contents=contenidos, config=configuracion)
                texto = (getattr(resultado, "text", None) or "").strip()
                if not texto:
                    raise RespuestaVacia()
                return {"respuesta": texto, "modelo": modelo}
            except RespuestaVacia:
                pass  # se trata como fallo pasajero
            except Exception as e:  # noqa: BLE001
                if es_error_de_configuracion(e):
                    raise ChatConfiguracion("Error de configuración del chat") from e
                if es_modelo_no_disponible(e):
                    break  # pasar al siguiente modelo sin reintentar
            if intento < INTENTOS_POR_MODELO:
                dormir(calcular_espera(intento, aleatorio))
    raise ChatOcupado("Todos los modelos están ocupados")
