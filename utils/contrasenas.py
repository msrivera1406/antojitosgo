"""Único punto donde se protegen y se comparan contraseñas.

Para probar tu propio algoritmo, cambia SOLO el cuerpo de `hashear` y `verificar`. El resto de la app
(registro, login, pruebas) las usa y no hay que tocarlo.

Modo de pruebas sin hash (solo en local)
----------------------------------------
Con CONTRASENAS_SIN_HASH=true en .env, las cuentas NUEVAS guardan la contraseña tal cual, con el
prefijo "plano:" (por ejemplo "plano:MiClave123"), para verla en phpMyAdmin. Viene apagado.
Aunque esté encendido, si el registro llega por el túnel de Cloudflare (trae la cabecera Cf-Ray)
se guarda con hash: así no quedan en texto plano contraseñas de otras personas.
Las cuentas con hash (las de database.sql) siguen entrando en cualquier modo.
"""
import hmac
import logging
import os

from flask import has_request_context, request
from werkzeug.security import check_password_hash, generate_password_hash

PREFIJO_PLANO = "plano:"
_log = logging.getLogger(__name__)


def _sin_hash_activo() -> bool:
    if os.getenv("CONTRASENAS_SIN_HASH", "false").lower() != "true":
        return False
    if has_request_context() and request.headers.get("Cf-Ray"):
        return False  # viene de internet por el túnel
    return True


def hashear(password: str) -> str:
    """Devuelve el texto que se guarda en usuarios.password_hash (máximo 255 caracteres)."""
    if _sin_hash_activo():
        _log.warning("CONTRASENAS_SIN_HASH activo: se guarda una contraseña en texto plano (solo pruebas locales)")
        return PREFIJO_PLANO + password
    return generate_password_hash(password)


def verificar(guardado: str, password: str) -> bool:
    """True si `password` corresponde a lo guardado en usuarios.password_hash."""
    if guardado.startswith(PREFIJO_PLANO):
        # compare_digest tarda lo mismo acierte o falle (no da pistas por tiempo).
        return hmac.compare_digest(guardado[len(PREFIJO_PLANO):].encode(), password.encode())
    return check_password_hash(guardado, password)
