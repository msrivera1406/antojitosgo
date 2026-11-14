"""Autenticación y perfil. Dueño: Integrante 1 (spec 01, tarea 5).

POST /api/auth/registro, POST /api/auth/login, POST /api/auth/logout, GET /api/auth/me,
GET /api/usuarios/<id>/perfil
"""
import re

from flask import Blueprint, jsonify, request
from mysql.connector import errors as errores_mysql
from werkzeug.security import check_password_hash, generate_password_hash

from db import db_cursor
from utils.auth import cerrar_sesion, iniciar_sesion, login_requerido, usuario_actual
from utils.cupones import listar_cupones_vigentes, progreso_usuario
from utils.puntos import obtener_insignia
from utils.respuestas import error

auth_bp = Blueprint("auth", __name__)

ROLES_REGISTRO = ("cliente", "locatario")
PASSWORD_MIN, PASSWORD_MAX = 8, 128
NOMBRE_MAX, EMAIL_MAX = 100, 120
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
MSG_CREDENCIALES = "Correo o contraseña incorrectos"
# Hash de relleno: se compara cuando el correo no existe, para que ambos fallos tarden parecido.
_HASH_RELLENO = generate_password_hash("relleno-sin-uso", method="pbkdf2:sha256")


def _usuario_json(fila):
    return {"id": fila["id"], "nombre": fila["nombre"], "email": fila["email"],
            "rol": fila["rol"], "puntos": fila["puntos"]}


def _cuerpo_json():
    datos = request.get_json(silent=True)
    return datos if isinstance(datos, dict) else None


@auth_bp.route("/api/auth/registro", methods=["POST"])
def registro():
    datos = _cuerpo_json()
    if datos is None:
        return error("Envía los datos en formato JSON", 400)
    nombre, email = datos.get("nombre"), datos.get("email")
    password, rol = datos.get("password"), datos.get("rol")
    if not all(isinstance(v, str) for v in (nombre, email, password, rol)):
        return error("Faltan campos: nombre, email, password y rol", 400)
    nombre, email = nombre.strip(), email.strip().lower()
    if not nombre or len(nombre) > NOMBRE_MAX:
        return error(f"El nombre es obligatorio y de máximo {NOMBRE_MAX} caracteres", 400)
    if len(email) > EMAIL_MAX or not EMAIL_RE.match(email):
        return error("El correo no tiene un formato válido", 400)
    if not PASSWORD_MIN <= len(password) <= PASSWORD_MAX:
        return error(f"La contraseña debe tener entre {PASSWORD_MIN} y {PASSWORD_MAX} caracteres", 400)
    if rol not in ROLES_REGISTRO:
        return error("El rol debe ser cliente o locatario", 400)
    try:
        with db_cursor() as cursor:
            cursor.execute("SELECT id FROM usuarios WHERE email = %s", (email,))
            if cursor.fetchone():
                return error("Ya existe una cuenta con ese correo", 409)
            cursor.execute(
                "INSERT INTO usuarios (nombre, email, password_hash, rol) VALUES (%s, %s, %s, %s)",
                (nombre, email, generate_password_hash(password), rol))
            usuario = {"id": cursor.lastrowid, "nombre": nombre, "email": email, "rol": rol, "puntos": 0}
    except errores_mysql.IntegrityError:  # dos registros simultáneos con el mismo correo
        return error("Ya existe una cuenta con ese correo", 409)
    iniciar_sesion(usuario)
    return jsonify(usuario), 201


@auth_bp.route("/api/auth/login", methods=["POST"])
def login():
    datos = _cuerpo_json()
    if datos is None:
        return error("Envía los datos en formato JSON", 400)
    email, password = datos.get("email"), datos.get("password")
    if not isinstance(email, str) or not isinstance(password, str):
        return error("Escribe tu correo y contraseña", 400)
    with db_cursor(commit=False) as cursor:
        cursor.execute(
            "SELECT id, nombre, email, rol, puntos, password_hash FROM usuarios WHERE email = %s",
            (email.strip().lower(),))
        fila = cursor.fetchone()
    hash_guardado = fila["password_hash"] if fila else _HASH_RELLENO
    if not check_password_hash(hash_guardado, password) or fila is None:
        return error(MSG_CREDENCIALES, 401)
    iniciar_sesion(fila)
    return jsonify(_usuario_json(fila))


@auth_bp.route("/api/auth/logout", methods=["POST"])
def logout():
    cerrar_sesion()
    return jsonify({"ok": True})


@auth_bp.route("/api/auth/me")
@login_requerido
def me():
    sesion = usuario_actual()
    with db_cursor(commit=False) as cursor:
        cursor.execute("SELECT id, nombre, email, rol, puntos FROM usuarios WHERE id = %s", (sesion["id"],))
        fila = cursor.fetchone()
    if fila is None:  # la cuenta se borró con la sesión abierta
        cerrar_sesion()
        return error("Inicia sesión para continuar", 401)
    return jsonify(_usuario_json(fila))


@auth_bp.route("/api/usuarios/<int:usuario_id>/perfil")
@login_requerido
def perfil(usuario_id):
    sesion = usuario_actual()
    if sesion["id"] != usuario_id and sesion["rol"] != "admin":
        return error("No tienes permiso para ver este perfil", 403)
    with db_cursor(commit=False) as cursor:
        cursor.execute("SELECT id, nombre, email, rol, puntos FROM usuarios WHERE id = %s", (usuario_id,))
        fila = cursor.fetchone()
        if fila is None:
            return error("No encontramos ese usuario", 404)
        resultado = _usuario_json(fila)
        resultado["insignia"] = obtener_insignia(fila["puntos"])
        resultado["cupones"] = listar_cupones_vigentes(cursor, usuario_id)
        resultado["progreso"] = progreso_usuario(cursor, usuario_id)
        resultado["pedidos"] = _pedidos_del_usuario(cursor, usuario_id)
    return jsonify(resultado)


def _pedidos_del_usuario(cursor, usuario_id):
    """Pedidos del más reciente al más antiguo, sin `items`."""
    cursor.execute(
        "SELECT o.id, o.codigo_pickup, o.estado, o.total, o.descuento_aplicado, o.creado_en, "
        "o.puesto_id, p.nombre AS puesto_nombre, o.cupon_id, c.codigo AS cupon_codigo, c.monto AS cupon_monto "
        "FROM pedidos o JOIN puestos p ON p.id = o.puesto_id LEFT JOIN cupones c ON c.id = o.cupon_id "
        "WHERE o.cliente_id = %s ORDER BY o.creado_en DESC, o.id DESC", (usuario_id,))
    pedidos = []
    for f in cursor.fetchall():
        cupon = None
        if f["cupon_id"] is not None:
            cupon = {"id": f["cupon_id"], "codigo": f["cupon_codigo"], "monto": f["cupon_monto"]}
        pedidos.append({
            "id": f["id"], "codigo_pickup": f["codigo_pickup"], "estado": f["estado"],
            "subtotal": f["total"] + f["descuento_aplicado"],
            "descuento_aplicado": f["descuento_aplicado"], "total": f["total"],
            "creado_en": f["creado_en"], "cupon": cupon,
            "puesto": {"id": f["puesto_id"], "nombre": f["puesto_nombre"]}})
    return pedidos
