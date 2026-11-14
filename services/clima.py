"""Clima actual desde Open-Meteo (sin API key). Dueño: Integrante 3 (spec 03).

Cualquier fallo (red, tiempo agotado, respuesta inesperada) devuelve None: el asistente
debe seguir funcionando sin la sección de clima.
"""
import time

import requests

URL = "https://api.open-meteo.com/v1/forecast"
TIMEOUT_S = 3
TTL_S = 600  # 10 minutos
_cache = {}  # (lat, lng redondeados a 2 decimales) -> (marca de tiempo, clima)

# Códigos WMO de Open-Meteo: https://open-meteo.com/en/docs
_LLUVIA = set(range(51, 68)) | {80, 81, 82} | {95, 96, 99}


def interpretar_weather_code(codigo):
    """Devuelve (descripción en español, llueve)."""
    if codigo == 0:
        return "despejado", False
    if codigo in (1, 2, 3):
        return "parcialmente nublado", False
    if codigo in (45, 48):
        return "niebla", False
    if 51 <= codigo <= 57:
        return "llovizna", True
    if 61 <= codigo <= 67:
        return "lluvia", True
    if 71 <= codigo <= 77 or codigo in (85, 86):
        return "nieve", False
    if codigo in (80, 81, 82):
        return "chubascos", True
    if codigo in (95, 96, 99):
        return "tormenta", True
    return "nublado", False


def limpiar_cache():
    _cache.clear()


def _numero(valor):
    return float(valor) if isinstance(valor, (int, float)) and not isinstance(valor, bool) else None


def obtener_clima(lat, lng, *, ahora=time.monotonic):
    """{'temperatura_c', 'lluvia_mm', 'llueve', 'descripcion'} o None si no hay datos."""
    clave = (round(lat, 2), round(lng, 2))
    en_cache = _cache.get(clave)
    if en_cache and ahora() - en_cache[0] < TTL_S:
        return en_cache[1]

    try:
        r = requests.get(
            URL,
            params={
                "latitude": lat,
                "longitude": lng,
                "current": "temperature_2m,precipitation,rain,weather_code",
                "timezone": "America/Mexico_City",
            },
            timeout=TIMEOUT_S,
        )
        r.raise_for_status()
        actual = r.json()["current"]
        temperatura = _numero(actual.get("temperature_2m"))
        if temperatura is None:
            return None
        lluvia_mm = max(_numero(actual.get("rain")) or 0.0, _numero(actual.get("precipitation")) or 0.0)
        codigo = actual.get("weather_code")
        descripcion, llueve_codigo = interpretar_weather_code(codigo if isinstance(codigo, int) else -1)
        clima = {
            "temperatura_c": round(temperatura, 1),
            "lluvia_mm": round(lluvia_mm, 1),
            "llueve": lluvia_mm > 0 or llueve_codigo,
            "descripcion": descripcion,
        }
    except (requests.RequestException, KeyError, TypeError, ValueError):
        return None

    _cache[clave] = (ahora(), clima)
    return clima
