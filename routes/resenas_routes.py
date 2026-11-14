"""Reseñas de puestos: calificación de 1 a 5 y comentario opcional.

GET  /api/puestos/<id>/resenas   Público. Lista (más recientes primero), promedio, total y la reseña propia.
POST /api/puestos/<id>/resenas   Sesión. Crea o actualiza la reseña del usuario en ese puesto.

Reglas: una reseña por usuario y puesto; el propietario no puede reseñar su propio puesto.
El nombre del autor se muestra solo con el nombre de pila, sin correo.
"""
from flask import Blueprint, jsonify, request

from db import db_cursor
from utils.auth import login_requerido, usuario_actual
from utils.respuestas import error

resenas_bp = Blueprint("resenas", __name__)

COMENTARIO_MAX = 500
LIMITE_LISTA = 50


def _nombre_publico(nombre):
    """Solo el nombre de pila, para no exponer el nombre completo."""
    partes = (nombre or "").split()
    return partes[0] if partes else "Usuario"


def _resena_json(fila):
    return {
        "id": fila["id"],
        "calificacion": int(fila["calificacion"]),
        "comentario": fila["comentario"],
        "autor": _nombre_publico(fila["autor"]),
        "creado_en": fila["creado_en"],
        "actualizado_en": fila["actualizado_en"],
    }


def _resumen(cursor, puesto_id):
    cursor.execute(
        "SELECT COUNT(*) AS total, AVG(calificacion) AS promedio FROM resenas WHERE puesto_id = %s",
        (puesto_id,),
    )
    fila = cursor.fetchone()
    total = int(fila["total"])
    promedio = round(float(fila["promedio"]), 1) if total else None
    return total, promedio


def _validar(datos):
    """Devuelve ((calificacion, comentario), None) o (None, mensaje)."""
    calificacion = datos.get("calificacion")
    if isinstance(calificacion, bool) or not isinstance(calificacion, int) or not 1 <= calificacion <= 5:
        return None, "La calificación debe ser un número entero del 1 al 5"
    comentario = datos.get("comentario", "")
    if comentario is None:
        comentario = ""
    if not isinstance(comentario, str):
        return None, "El comentario debe ser texto"
    comentario = comentario.strip()
    if len(comentario) > COMENTARIO_MAX:
        return None, f"El comentario puede tener hasta {COMENTARIO_MAX} caracteres"
    return (calificacion, comentario), None


SELECT_RESENA = (
    "SELECT r.id, r.calificacion, r.comentario, r.creado_en, r.actualizado_en, u.nombre AS autor "
    "FROM resenas r JOIN usuarios u ON u.id = r.usuario_id "
)


@resenas_bp.route("/api/puestos/<int:puesto_id>/resenas")
def listar_resenas(puesto_id):
    with db_cursor(commit=False) as cursor:
        cursor.execute("SELECT id FROM puestos WHERE id = %s", (puesto_id,))
        if cursor.fetchone() is None:
            return error("No encontramos ese puesto", 404)
        total, promedio = _resumen(cursor, puesto_id)
        cursor.execute(
            SELECT_RESENA + "WHERE r.puesto_id = %s ORDER BY r.creado_en DESC, r.id DESC LIMIT %s",
            (puesto_id, LIMITE_LISTA),
        )
        resenas = [_resena_json(f) for f in cursor.fetchall()]
        mia = None
        usuario = usuario_actual()
        if usuario:
            cursor.execute(SELECT_RESENA + "WHERE r.puesto_id = %s AND r.usuario_id = %s", (puesto_id, usuario["id"]))
            fila = cursor.fetchone()
            mia = _resena_json(fila) if fila else None
    return jsonify({"total": total, "promedio": promedio, "resenas": resenas, "mia": mia})


@resenas_bp.route("/api/puestos/<int:puesto_id>/resenas", methods=["POST"])
@login_requerido
def guardar_resena(puesto_id):
    datos = request.get_json(silent=True)
    if not isinstance(datos, dict):
        return error("Envía la reseña en formato JSON", 400)
    limpio, mensaje = _validar(datos)
    if mensaje:
        return error(mensaje, 400)
    calificacion, comentario = limpio
    usuario = usuario_actual()

    with db_cursor() as cursor:
        cursor.execute("SELECT propietario_id FROM puestos WHERE id = %s", (puesto_id,))
        puesto = cursor.fetchone()
        if puesto is None:
            return error("No encontramos ese puesto", 404)
        if puesto["propietario_id"] == usuario["id"]:
            return error("No puedes reseñar tu propio puesto", 403)
        cursor.execute(
            "SELECT id FROM resenas WHERE usuario_id = %s AND puesto_id = %s", (usuario["id"], puesto_id)
        )
        existia = cursor.fetchone() is not None
        cursor.execute(
            "INSERT INTO resenas (puesto_id, usuario_id, calificacion, comentario) VALUES (%s, %s, %s, %s) "
            "ON DUPLICATE KEY UPDATE calificacion = VALUES(calificacion), comentario = VALUES(comentario)",
            (puesto_id, usuario["id"], calificacion, comentario),
        )
        cursor.execute(SELECT_RESENA + "WHERE r.puesto_id = %s AND r.usuario_id = %s", (puesto_id, usuario["id"]))
        resena = _resena_json(cursor.fetchone())
        total, promedio = _resumen(cursor, puesto_id)
    return jsonify({"resena": resena, "total": total, "promedio": promedio}), (200 if existia else 201)
