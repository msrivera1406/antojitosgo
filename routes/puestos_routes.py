"""Puestos, recomendaciones y menú. Dueño: Integrante 1 (spec 01).

Implementado: POST /api/puestos/recomendar (tarea 7.2).
Pendiente: GET /api/puestos, GET /api/puestos/categorias, GET /api/puestos/mios, GET /api/puestos/<id>,
POST /api/puestos/crear, PUT /api/puestos/<id>, POST /api/puestos/<id>/productos, PATCH /api/productos/<id>
"""
import math

from flask import Blueprint, jsonify, request

import config
from db import db_cursor
from utils import fotos
from utils.auth import login_requerido, usuario_actual
from utils.cupones import registrar_recomendacion
from utils.puntos import sumar_puntos
from utils.respuestas import error

puestos_bp = Blueprint("puestos", __name__)

NOMBRE_MAX, DESCRIPCION_MAX = 120, 500


def _coordenada(texto, minimo, maximo):
    """Convierte a float si es un número finito dentro del rango; si no, None."""
    try:
        valor = float(texto)
    except (TypeError, ValueError):
        return None
    return valor if math.isfinite(valor) and minimo <= valor <= maximo else None


def _validar_recomendacion(form):
    """Devuelve (datos, None) o (None, mensaje de error)."""
    nombre = (form.get("nombre") or "").strip()
    categoria = (form.get("categoria") or "").strip()
    descripcion = (form.get("descripcion") or "").strip()
    if not nombre or not categoria or not form.get("latitud") or not form.get("longitud"):
        return None, "Faltan campos: nombre, categoria, latitud y longitud"
    if len(nombre) > NOMBRE_MAX:
        return None, f"El nombre debe tener máximo {NOMBRE_MAX} caracteres"
    if categoria not in config.CATEGORIAS:
        return None, "La categoría no es válida"
    if len(descripcion) > DESCRIPCION_MAX:
        return None, f"La descripción debe tener máximo {DESCRIPCION_MAX} caracteres"
    latitud = _coordenada(form.get("latitud"), *config.CDMX_BBOX["lat"])
    longitud = _coordenada(form.get("longitud"), *config.CDMX_BBOX["lng"])
    if latitud is None or longitud is None:
        return None, "Las coordenadas deben estar dentro de la Ciudad de México"
    return {"nombre": nombre, "categoria": categoria, "descripcion": descripcion or None,
            "latitud": latitud, "longitud": longitud}, None


@puestos_bp.route("/api/puestos/recomendar", methods=["POST"])
@login_requerido
def recomendar():
    datos, mensaje = _validar_recomendacion(request.form)
    if mensaje:
        return error(mensaje, 400)
    contenido = extension = None
    archivo = request.files.get("foto")
    if archivo is not None and archivo.filename:
        try:
            contenido, extension = fotos.validar_foto(archivo)
        except ValueError as e:
            return error(str(e), 400)

    usuario_id = usuario_actual()["id"]
    foto_url = fotos.guardar_foto(contenido, extension) if contenido else None
    try:
        with db_cursor() as cursor:  # una sola transacción: puesto, +50 puntos y hito de cupón
            cursor.execute("SELECT id FROM usuarios WHERE id = %s FOR UPDATE", (usuario_id,))
            if cursor.fetchone() is None:
                raise ValueError("El usuario de la sesión ya no existe")
            cursor.execute(
                "INSERT INTO puestos (propietario_id, recomendado_por, nombre, descripcion, categoria, "
                "latitud, longitud, estatus, foto_url) VALUES (NULL, %s, %s, %s, %s, %s, %s, 'recomendado', %s)",
                (usuario_id, datos["nombre"], datos["descripcion"], datos["categoria"],
                 datos["latitud"], datos["longitud"], foto_url))
            puesto_id = cursor.lastrowid
            puntos_totales = sumar_puntos(cursor, usuario_id, config.PUNTOS_RECOMENDACION)
            cupon = registrar_recomendacion(cursor, usuario_id)
    except ValueError:  # el usuario de la sesión ya no existe
        fotos.borrar_foto(foto_url)
        return error("Inicia sesión para continuar", 401)
    except Exception:
        fotos.borrar_foto(foto_url)
        raise
    return jsonify({
        "puesto": {"id": puesto_id, "nombre": datos["nombre"], "descripcion": datos["descripcion"],
                   "categoria": datos["categoria"], "latitud": datos["latitud"],
                   "longitud": datos["longitud"], "horario": None, "estatus": "recomendado",
                   "foto_url": foto_url},
        "puntos_ganados": config.PUNTOS_RECOMENDACION,
        "puntos_totales": puntos_totales,
        "cupon_ganado": cupon,
    }), 201
