"""Pedidos pick-up y cupones del usuario. Dueño: Integrante 4 (spec 04).

Rutas a implementar: POST /api/pedidos, GET /api/pedidos/puesto/<puesto_id>,
PATCH /api/pedidos/<id>/estado, GET /api/cupones/mios
"""
from flask import Blueprint

pedidos_bp = Blueprint("pedidos", __name__)
