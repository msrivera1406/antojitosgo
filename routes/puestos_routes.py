"""Puestos, recomendaciones y menú. Dueño: Integrante 1 (spec 01).

Implementado: GET /api/puestos, GET /api/puestos/categorias, GET /api/puestos/<id> (tarea 6) y
POST /api/puestos/recomendar (tarea 7.2).
Pendiente: GET /api/puestos/mios, POST /api/puestos/crear, PUT /api/puestos/<id>, POST /api/puestos/<id>/productos, PATCH /api/productos/<id>
"""
import math
from decimal import Decimal, InvalidOperation

from flask import Blueprint, jsonify, request

import config
from db import db_cursor
from utils import fotos
from utils.auth import es_dueno_o_admin, login_requerido, rol_requerido, usuario_actual
from utils.cupones import registrar_recomendacion
from utils.puntos import sumar_puntos
from utils.respuestas import error

puestos_bp = Blueprint("puestos", __name__)

NOMBRE_MAX, DESCRIPCION_MAX = 120, 500
HORARIO_MAX, PRODUCTO_NOMBRE_MAX = 100, 100
PRECIO_MAX = Decimal("999999.99")  # columna DECIMAL(8, 2)
ESTATUS_VALIDOS = ("verificado", "recomendado")
CAMPOS_PUESTO = "id, nombre, descripcion, categoria, latitud, longitud, horario, estatus, foto_url"


def _puesto_json(fila):
    return {campo: fila[campo] for campo in CAMPOS_PUESTO.split(", ")}


def _producto_json(fila):
    return {"id": fila["id"], "nombre": fila["nombre"], "precio": fila["precio"],
            "disponible": bool(fila["disponible"])}


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

@puestos_bp.route("/api/puestos")
def listar():
    categoria = request.args.get("categoria", "").strip()
    estatus = request.args.get("estatus", "").strip()
    if categoria and categoria not in config.CATEGORIAS:
        return error("La categoría no es válida", 400)
    if estatus and estatus != "todos" and estatus not in ESTATUS_VALIDOS:
        return error("El estatus debe ser verificado, recomendado o todos", 400)
    condiciones, parametros = [], []
    if categoria:
        condiciones.append("categoria = %s")
        parametros.append(categoria)
    if estatus and estatus != "todos":
        condiciones.append("estatus = %s")
        parametros.append(estatus)
    consulta = f"SELECT {CAMPOS_PUESTO} FROM puestos"
    if condiciones:
        consulta += " WHERE " + " AND ".join(condiciones)
    with db_cursor(commit=False) as cursor:
        cursor.execute(consulta + " ORDER BY id", parametros)
        return jsonify([_puesto_json(f) for f in cursor.fetchall()])


@puestos_bp.route("/api/puestos/categorias")
def categorias():
    return jsonify(config.CATEGORIAS)


@puestos_bp.route("/api/puestos/<int:puesto_id>")
def detalle(puesto_id):
    with db_cursor(commit=False) as cursor:
        cursor.execute(f"SELECT {CAMPOS_PUESTO} FROM puestos WHERE id = %s", (puesto_id,))
        fila = cursor.fetchone()
        if fila is None:
            return error("No encontramos ese puesto", 404)
        usuario = usuario_actual()
        ve_todo = usuario is not None and es_dueno_o_admin(cursor, puesto_id, usuario)
        consulta = "SELECT id, nombre, precio, disponible FROM productos WHERE puesto_id = %s"
        if not ve_todo:
            consulta += " AND disponible = TRUE"
        cursor.execute(consulta + " ORDER BY id", (puesto_id,))
        resultado = _puesto_json(fila)
        resultado["productos"] = [_producto_json(f) for f in cursor.fetchall()]
    return jsonify(resultado)

# --- Escritura: validación compartida ---------------------------------------------------------
def _validar_puesto(datos, parcial):
    """Valida los campos editables de un puesto (nombre, descripcion, categoria, latitud, longitud, horario).

    Con parcial=True solo valida los que vienen; si no, nombre, categoria, latitud y longitud son
    obligatorios. Devuelve (campos limpios, None) o (None, mensaje).
    """
    campos = {}
    if not parcial or "nombre" in datos:
        nombre = datos.get("nombre")
        if not isinstance(nombre, str) or not nombre.strip() or len(nombre.strip()) > NOMBRE_MAX:
            return None, f"El nombre es obligatorio y de máximo {NOMBRE_MAX} caracteres"
        campos["nombre"] = nombre.strip()
    if not parcial or "categoria" in datos:
        if datos.get("categoria") not in config.CATEGORIAS:
            return None, "La categoría no es válida"
        campos["categoria"] = datos["categoria"]
    for clave, maximo, etiqueta in (("descripcion", DESCRIPCION_MAX, "La descripción"), ("horario", HORARIO_MAX, "El horario")):
        if clave in datos and datos[clave] is not None:
            valor = datos[clave]
            if not isinstance(valor, str) or len(valor.strip()) > maximo:
                return None, f"{etiqueta} debe ser texto de máximo {maximo} caracteres"
            campos[clave] = valor.strip() or None
        elif clave in datos:
            campos[clave] = None
    if not parcial or "latitud" in datos or "longitud" in datos:
        if parcial and ("latitud" not in datos or "longitud" not in datos):
            return None, "Para cambiar la ubicación envía latitud y longitud"
        latitud = _coordenada(datos.get("latitud"), *config.CDMX_BBOX["lat"]) if not isinstance(datos.get("latitud"), bool) else None
        longitud = _coordenada(datos.get("longitud"), *config.CDMX_BBOX["lng"]) if not isinstance(datos.get("longitud"), bool) else None
        if latitud is None or longitud is None:
            return None, "Las coordenadas deben estar dentro de la Ciudad de México"
        campos["latitud"], campos["longitud"] = latitud, longitud
    return campos, None


def _validar_producto(datos, parcial):
    """Valida nombre, precio (> 0, 2 decimales) y disponible. Devuelve (campos, None) o (None, mensaje)."""
    campos = {}
    if not parcial or "nombre" in datos:
        nombre = datos.get("nombre")
        if not isinstance(nombre, str) or not nombre.strip() or len(nombre.strip()) > PRODUCTO_NOMBRE_MAX:
            return None, f"El nombre del producto es obligatorio y de máximo {PRODUCTO_NOMBRE_MAX} caracteres"
        campos["nombre"] = nombre.strip()
    if not parcial or "precio" in datos:
        precio = datos.get("precio")
        try:
            if isinstance(precio, bool) or not isinstance(precio, (int, float, str)):
                raise InvalidOperation
            precio = Decimal(str(precio).strip())
            if not precio.is_finite() or precio <= 0 or precio > PRECIO_MAX or precio != precio.quantize(Decimal("0.01")):
                raise InvalidOperation
        except InvalidOperation:
            return None, "El precio debe ser mayor a 0, con máximo 2 decimales"
        campos["precio"] = precio
    if "disponible" in datos:
        if not isinstance(datos["disponible"], bool):
            return None, "disponible debe ser verdadero o falso"
        campos["disponible"] = datos["disponible"]
    elif not parcial:
        campos["disponible"] = True
    return campos, None


def _cuerpo_json():
    datos = request.get_json(silent=True)
    return datos if isinstance(datos, dict) else None


def _puesto_con_productos(cursor, puesto_id, todos_los_productos):
    cursor.execute(f"SELECT {CAMPOS_PUESTO} FROM puestos WHERE id = %s", (puesto_id,))
    resultado = _puesto_json(cursor.fetchone())
    consulta = "SELECT id, nombre, precio, disponible FROM productos WHERE puesto_id = %s"
    if not todos_los_productos:
        consulta += " AND disponible = TRUE"
    cursor.execute(consulta + " ORDER BY id", (puesto_id,))
    resultado["productos"] = [_producto_json(f) for f in cursor.fetchall()]
    return resultado


def _permiso_sobre_puesto(cursor, puesto_id):
    """None si el usuario en sesión puede editar el puesto; si no, la respuesta de error (404 o 403)."""
    cursor.execute("SELECT id FROM puestos WHERE id = %s", (puesto_id,))
    if cursor.fetchone() is None:
        return error("No encontramos ese puesto", 404)
    if not es_dueno_o_admin(cursor, puesto_id, usuario_actual()):
        return error("No tienes permiso para editar este puesto", 403)
    return None


# --- Escritura: puestos ----------------------------------------------------------------------
@puestos_bp.route("/api/puestos/crear", methods=["POST"])
@rol_requerido("locatario", "admin")
def crear():
    datos = _cuerpo_json()
    if datos is None:
        return error("Envía los datos en formato JSON", 400)
    campos, mensaje = _validar_puesto(datos, parcial=False)
    if mensaje:
        return error(mensaje, 400)
    productos_crudos = datos.get("productos", [])
    if not isinstance(productos_crudos, list) or not all(isinstance(p, dict) for p in productos_crudos):
        return error("productos debe ser una lista de productos", 400)
    productos = []
    for crudo in productos_crudos:
        producto, mensaje = _validar_producto(crudo, parcial=False)
        if mensaje:
            return error(mensaje, 400)
        productos.append(producto)

    sesion = usuario_actual()
    propietario_id = sesion["id"]
    with db_cursor() as cursor:  # una sola transacción: puesto + productos
        if sesion["rol"] == "admin" and datos.get("propietario_id") is not None:
            propietario_id = datos["propietario_id"]
            if isinstance(propietario_id, bool) or not isinstance(propietario_id, int):
                return error("propietario_id no es válido", 400)
            cursor.execute("SELECT id FROM usuarios WHERE id = %s AND rol IN ('locatario', 'admin')", (propietario_id,))
            if cursor.fetchone() is None:
                return error("propietario_id no corresponde a un locatario", 400)
        cursor.execute(
            "INSERT INTO puestos (propietario_id, nombre, descripcion, categoria, latitud, longitud, horario, estatus) "
            "VALUES (%s, %s, %s, %s, %s, %s, %s, 'verificado')",
            (propietario_id, campos["nombre"], campos.get("descripcion"), campos["categoria"],
             campos["latitud"], campos["longitud"], campos.get("horario")))
        puesto_id = cursor.lastrowid
        for p in productos:
            cursor.execute("INSERT INTO productos (puesto_id, nombre, precio, disponible) VALUES (%s, %s, %s, %s)",
                           (puesto_id, p["nombre"], p["precio"], p["disponible"]))
        resultado = _puesto_con_productos(cursor, puesto_id, True)
    return jsonify(resultado), 201


@puestos_bp.route("/api/puestos/mios")
@rol_requerido("locatario", "admin")
def mios():
    sesion = usuario_actual()
    consulta, parametros = f"SELECT {CAMPOS_PUESTO} FROM puestos", []
    if sesion["rol"] != "admin":
        consulta += " WHERE propietario_id = %s"
        parametros.append(sesion["id"])
    with db_cursor(commit=False) as cursor:
        cursor.execute(consulta + " ORDER BY id", parametros)
        return jsonify([_puesto_json(f) for f in cursor.fetchall()])


@puestos_bp.route("/api/puestos/<int:puesto_id>", methods=["PUT"])
@login_requerido
def editar(puesto_id):
    es_json = request.is_json
    datos = _cuerpo_json() if es_json else request.form.to_dict()
    if datos is None:
        return error("Envía los datos en formato JSON o como formulario", 400)
    editables = {k: v for k, v in datos.items() if k in ("nombre", "descripcion", "categoria", "latitud", "longitud", "horario")}
    archivo = request.files.get("foto")
    hay_foto = archivo is not None and bool(archivo.filename)
    if not editables and not hay_foto:
        return error("No hay nada que actualizar", 400)
    campos, mensaje = _validar_puesto(editables, parcial=True)
    if mensaje:
        return error(mensaje, 400)
    contenido = extension = None
    if hay_foto:
        try:
            contenido, extension = fotos.validar_foto(archivo)
        except ValueError as e:
            return error(str(e), 400)

    foto_nueva = foto_anterior = None
    try:
        with db_cursor() as cursor:
            denegado = _permiso_sobre_puesto(cursor, puesto_id)
            if denegado:
                return denegado
            if contenido:
                cursor.execute("SELECT foto_url FROM puestos WHERE id = %s FOR UPDATE", (puesto_id,))
                foto_anterior = cursor.fetchone()["foto_url"]
                foto_nueva = fotos.guardar_foto(contenido, extension)
                campos["foto_url"] = foto_nueva
            asignaciones = ", ".join(f"{columna} = %s" for columna in campos)  # columnas de lista blanca
            cursor.execute(f"UPDATE puestos SET {asignaciones} WHERE id = %s", (*campos.values(), puesto_id))
            resultado = _puesto_con_productos(cursor, puesto_id, True)
    except Exception:
        fotos.borrar_foto(foto_nueva)
        raise
    fotos.borrar_foto(foto_anterior)
    return jsonify(resultado)


# --- Escritura: productos --------------------------------------------------------------------
@puestos_bp.route("/api/puestos/<int:puesto_id>/productos", methods=["POST"])
@login_requerido
def agregar_producto(puesto_id):
    datos = _cuerpo_json()
    if datos is None:
        return error("Envía los datos en formato JSON", 400)
    campos, mensaje = _validar_producto(datos, parcial=False)
    if mensaje:
        return error(mensaje, 400)
    with db_cursor() as cursor:
        denegado = _permiso_sobre_puesto(cursor, puesto_id)
        if denegado:
            return denegado
        cursor.execute("INSERT INTO productos (puesto_id, nombre, precio, disponible) VALUES (%s, %s, %s, %s)",
                       (puesto_id, campos["nombre"], campos["precio"], campos["disponible"]))
        producto = {"id": cursor.lastrowid, **campos}
    return jsonify(_producto_json(producto)), 201


@puestos_bp.route("/api/productos/<int:producto_id>", methods=["PATCH"])
@login_requerido
def editar_producto(producto_id):
    datos = _cuerpo_json()
    if datos is None:
        return error("Envía los datos en formato JSON", 400)
    editables = {k: v for k, v in datos.items() if k in ("nombre", "precio", "disponible")}
    if not editables:
        return error("No hay nada que actualizar", 400)
    campos, mensaje = _validar_producto(editables, parcial=True)
    if mensaje:
        return error(mensaje, 400)
    with db_cursor() as cursor:
        cursor.execute("SELECT puesto_id FROM productos WHERE id = %s", (producto_id,))
        fila = cursor.fetchone()
        if fila is None:
            return error("No encontramos ese producto", 404)
        if not es_dueno_o_admin(cursor, fila["puesto_id"], usuario_actual()):
            return error("No tienes permiso para editar este producto", 403)
        asignaciones = ", ".join(f"{columna} = %s" for columna in campos)  # columnas de lista blanca
        cursor.execute(f"UPDATE productos SET {asignaciones} WHERE id = %s", (*campos.values(), producto_id))
        cursor.execute("SELECT id, nombre, precio, disponible FROM productos WHERE id = %s", (producto_id,))
        producto = cursor.fetchone()
    return jsonify(_producto_json(producto))
