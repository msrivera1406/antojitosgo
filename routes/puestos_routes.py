"""Puestos, recomendaciones y menú. Dueño: Integrante 1 (spec 01).
Rutas a implementar: GET /api/puestos, GET /api/puestos/categorias, GET /api/puestos/mios,
GET /api/puestos/<id>, POST /api/puestos/recomendar, POST /api/puestos/crear, PUT /api/puestos/<id>,
POST /api/puestos/<id>/productos, PATCH /api/productos/<id>

Implementadas en la branch integracion-mapa: GET /api/puestos/cercanos.
"""
import math

from flask import Blueprint, jsonify, request

import config
from db import db_cursor
from utils.geo import RADIO_TIERRA_M, caja_envolvente, dentro_del_area
from utils.respuestas import error

puestos_bp = Blueprint("puestos", __name__)

RADIO_DEFECTO_M = 1500
RADIO_MAX_M = 5000
LIMITE_RESULTADOS = 100
ESTATUS_VALIDOS = ("verificado", "recomendado")


class ParametroInvalido(ValueError):
    """Un parámetro de la petición no es válido. El mensaje se muestra al usuario."""


def _numero(nombre, requerido=True, defecto=None):
    crudo = request.args.get(nombre)
    if crudo is None or crudo == "":
        if requerido:
            raise ParametroInvalido(f"Falta el parámetro «{nombre}»")
        return defecto
    try:
        valor = float(crudo)
    except ValueError:
        raise ParametroInvalido(f"El parámetro «{nombre}» debe ser un número") from None
    if not math.isfinite(valor):
        raise ParametroInvalido(f"El parámetro «{nombre}» debe ser un número")
    return valor


@puestos_bp.route("/api/puestos/cercanos")
def puestos_cercanos():
    """Puestos dentro de `radio` metros de (lat, lng), del más cercano al más lejano.

    Parámetros: lat, lng (obligatorios), radio (m, por defecto 1500, máximo 5000),
    categoria y estatus (opcionales). La ubicación solo se usa para esta consulta: no se guarda.
    """
    try:
        lat = _numero("lat")
        lng = _numero("lng")
        radio = _numero("radio", requerido=False, defecto=RADIO_DEFECTO_M)
    except ParametroInvalido as exc:
        return error(str(exc), 400)

    if not dentro_del_area(lat, lng, config.CDMX_BBOX):
        return error("La ubicación está fuera del área cubierta", 400)
    if not 1 <= radio <= RADIO_MAX_M:
        return error(f"El radio debe estar entre 1 y {RADIO_MAX_M} metros", 400)

    categoria = request.args.get("categoria")
    if categoria and categoria not in config.CATEGORIAS:
        return error("Categoría no válida", 400)
    estatus = request.args.get("estatus")
    if estatus in ("", "todos"):
        estatus = None
    if estatus and estatus not in ESTATUS_VALIDOS:
        return error("Estatus no válido", 400)

    lat_min, lat_max, lng_min, lng_max = caja_envolvente(lat, lng, radio)
    condiciones = ["latitud BETWEEN %s AND %s", "longitud BETWEEN %s AND %s"]
    parametros = [lat_min, lat_max, lng_min, lng_max]
    if categoria:
        condiciones.append("categoria = %s")
        parametros.append(categoria)
    if estatus:
        condiciones.append("estatus = %s")
        parametros.append(estatus)

    # Haversine en SQL. La caja envolvente reduce las filas con el índice (latitud, longitud).
    consulta = f"""
        SELECT id, nombre, descripcion, categoria, latitud, longitud, horario, estatus, foto_url,
               ({2 * RADIO_TIERRA_M} * ASIN(SQRT(
                   POWER(SIN(RADIANS(latitud - %s) / 2), 2)
                   + COS(RADIANS(%s)) * COS(RADIANS(latitud))
                     * POWER(SIN(RADIANS(longitud - %s) / 2), 2)
               ))) AS distancia_m
        FROM puestos
        WHERE {" AND ".join(condiciones)}
        HAVING distancia_m <= %s
        ORDER BY distancia_m
        LIMIT %s
    """
    # Orden de los %s: SELECT (lat, lat, lng), WHERE, HAVING, LIMIT.
    parametros = [lat, lat, lng, *parametros, radio, LIMITE_RESULTADOS]

    with db_cursor(commit=False) as cursor:
        cursor.execute(consulta, parametros)
        filas = cursor.fetchall()

    for fila in filas:
        fila["distancia_m"] = round(float(fila["distancia_m"]))
    return jsonify(filas)
