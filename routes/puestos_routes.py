"""Puestos, recomendaciones y menú. Dueño: Integrante 1 (spec 01).

Rutas a implementar: GET /api/puestos, GET /api/puestos/categorias, GET /api/puestos/mios,
GET /api/puestos/<id>, POST /api/puestos/recomendar, POST /api/puestos/crear, PUT /api/puestos/<id>,
POST /api/puestos/<id>/productos, PATCH /api/productos/<id>
"""
from flask import Blueprint

puestos_bp = Blueprint("puestos", __name__)
