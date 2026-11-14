"""Fixtures base. Dueño: Integrante 1 (spec 01, tarea 4.1).

TODO: crear la BD antojito_test desde database.sql, fixtures crear_usuario/login y limpieza de tablas.
Por ahora solo hay un cliente de Flask que no necesita base de datos.
"""
import pytest

from app import create_app


@pytest.fixture
def app():
    app = create_app()
    app.config.update(TESTING=True)
    return app


@pytest.fixture
def client(app):
    return app.test_client()
