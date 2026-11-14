"""Autenticación y perfil. Dueño: Integrante 1 (spec 01).

Rutas a implementar: POST /api/auth/registro, POST /api/auth/login, POST /api/auth/logout,
GET /api/auth/me, GET /api/usuarios/<id>/perfil
"""
from flask import Blueprint

auth_bp = Blueprint("auth", __name__)
