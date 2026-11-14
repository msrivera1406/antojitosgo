"""Respuestas JSON uniformes y serialización de Decimal/datetime."""
from datetime import date, datetime
from decimal import Decimal

from flask import jsonify
from flask.json.provider import DefaultJSONProvider


class ProveedorJSON(DefaultJSONProvider):
    """Decimal -> número, datetime -> ISO 8601 (el proveedor por defecto los vuelve texto)."""

    ensure_ascii = False
    sort_keys = False

    @staticmethod
    def default(o):
        if isinstance(o, Decimal):
            return float(o)
        if isinstance(o, datetime):
            return o.isoformat(timespec="seconds")
        if isinstance(o, date):
            return o.isoformat()
        return DefaultJSONProvider.default(o)


def error(mensaje, codigo=400):
    """Respuesta de error estándar: {"error": "..."}."""
    return jsonify({"error": mensaje}), codigo
