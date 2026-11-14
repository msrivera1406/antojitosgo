"""Sesión (cookie de Flask) y control de acceso por rol."""
from functools import wraps

from flask import session

from utils.respuestas import error


def iniciar_sesion(usuario):
    """Guarda al usuario en la sesión. Limpia antes para evitar fijación de sesión."""
    session.clear()
    session["usuario_id"] = usuario["id"]
    session["rol"] = usuario["rol"]


def cerrar_sesion():
    session.clear()


def usuario_actual():
    """Devuelve {'id', 'rol'} del usuario en sesión, o None."""
    if "usuario_id" not in session:
        return None
    return {"id": session["usuario_id"], "rol": session.get("rol")}


def login_requerido(f):
    @wraps(f)
    def envoltura(*args, **kwargs):
        if usuario_actual() is None:
            return error("Inicia sesión para continuar", 401)
        return f(*args, **kwargs)

    return envoltura


def rol_requerido(*roles):
    def decorador(f):
        @wraps(f)
        def envoltura(*args, **kwargs):
            usuario = usuario_actual()
            if usuario is None:
                return error("Inicia sesión para continuar", 401)
            if usuario["rol"] not in roles:
                return error("No tienes permiso para esta acción", 403)
            return f(*args, **kwargs)

        return envoltura

    return decorador


def es_dueno_o_admin(cursor, puesto_id, usuario):
    """True si el usuario es admin o propietario del puesto."""
    if usuario["rol"] == "admin":
        return True
    cursor.execute("SELECT propietario_id FROM puestos WHERE id = %s", (puesto_id,))
    fila = cursor.fetchone()
    return bool(fila) and fila["propietario_id"] == usuario["id"]
