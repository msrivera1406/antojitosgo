"""Servidor Flask. Dueño: Integrante 1. Registra blueprints, errores JSON y rutas de vistas."""
import os

from flask import Flask, jsonify, render_template, request
from flask_cors import CORS
from werkzeug.exceptions import HTTPException

import config
from db import get_connection
from routes.auth_routes import auth_bp
from routes.ia_routes import ia_bp
from routes.pedidos_routes import pedidos_bp
from routes.puestos_routes import puestos_bp
from utils.respuestas import ProveedorJSON, error


MENSAJES_HTTP = {
    400: "Solicitud no válida",
    401: "Inicia sesión para continuar",
    403: "No tienes permiso para esta acción",
    404: "No encontramos lo que buscas",
    405: "Método no permitido",
    413: "El archivo es demasiado grande",
    415: "Tipo de contenido no admitido",
}


def create_app():
    app = Flask(__name__)
    app.json = ProveedorJSON(app)
    app.config.update(
        SECRET_KEY=config.SECRET_KEY,
        SESSION_COOKIE_HTTPONLY=True,
        SESSION_COOKIE_SAMESITE="Lax",
        SESSION_COOKIE_SECURE=config.COOKIE_SECURE,
        MAX_CONTENT_LENGTH=config.MAX_UPLOAD_BYTES + 1024 * 1024,
    )
    os.makedirs(config.UPLOAD_DIR, exist_ok=True)

    # El frontend se sirve desde el mismo origen; CORS queda restringido por si se separa.
    CORS(app, supports_credentials=True, resources={r"/api/*": {"origins": os.getenv("CORS_ORIGINS", "http://localhost:5000")}})

    for bp in (auth_bp, puestos_bp, pedidos_bp, ia_bp):
        app.register_blueprint(bp)

    # --- Vistas ---
    @app.route("/")
    def index():
        return render_template("index.html")

    @app.route("/puesto/<int:puesto_id>")
    def vista_puesto(puesto_id):
        return render_template("puesto.html", puesto_id=puesto_id)

    @app.route("/recomendar")
    def vista_recomendar():
        return render_template("recomendar.html")

    @app.route("/locatario")
    def vista_locatario():
        return render_template("locatario.html")

    @app.route("/perfil")
    def vista_perfil():
        return render_template("perfil.html")

    @app.route("/login")
    @app.route("/registro")
    def vista_login():
        return render_template("login.html")

    # --- Salud ---
    @app.route("/api/salud")
    def salud():
        try:
            conexion = get_connection()
            conexion.close()
            db_ok = True
        except Exception:
            db_ok = False
        return jsonify({"estado": "ok", "db": db_ok})

    # --- Errores: JSON en /api/*, HTML simple en el resto ---
    @app.errorhandler(Exception)
    def manejar_error(exc):
        if isinstance(exc, HTTPException):
            codigo = exc.code
            mensaje = MENSAJES_HTTP.get(codigo, exc.description)
        else:
            app.logger.exception("Error no controlado")
            codigo, mensaje = 500, "Error interno del servidor"
        if request.path.startswith("/api/"):
            return error(mensaje, codigo)
        return f"<h1>{codigo}</h1><p>{mensaje}</p>", codigo

    return app


if __name__ == "__main__":
    create_app().run(host="0.0.0.0", port=5000, debug=True)
