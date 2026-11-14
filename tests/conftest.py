"""Fixtures base. Dueño: Integrante 1 (spec 01, tarea 4.1).

- `app` y `client`: Flask sin base de datos.
- `bd`, `cursor`, `nueva_conexion`, `crear_usuario`, `crear_puesto`: BD `antojito_test`, creada una vez
  por sesión desde database.sql y vaciada antes de cada prueba que pida `cursor`.
  Si no hay MySQL disponible, esas pruebas se omiten.
TODO (4.1): fixture `login` (depende de las rutas de auth) y apuntar `app` a antojito_test.
"""
import itertools
import os

import mysql.connector
import pytest

import config
from app import create_app

BD_TEST = "antojito_test"
RUTA_SQL = os.path.join(config.BASE_DIR, "database.sql")
HASH_DUMMY = "hash-de-prueba"
_contador = itertools.count(1)


def _sentencias(sql):
    sin_comentarios = "\n".join(l for l in sql.splitlines() if not l.strip().startswith("--"))
    return [s.strip() for s in sin_comentarios.split(";") if s.strip()]


def _conectar(base=None):
    return mysql.connector.connect(
        host=config.DB_HOST, port=config.DB_PORT, user=config.DB_USER, password=config.DB_PASSWORD,
        database=base, charset="utf8mb4", collation="utf8mb4_unicode_ci",
        connection_timeout=5, autocommit=True)


@pytest.fixture
def app():
    app = create_app()
    app.config.update(TESTING=True)
    return app


@pytest.fixture
def client(app):
    return app.test_client()


@pytest.fixture(scope="session")
def bd():
    """Crea antojito_test desde database.sql (una vez por sesión) y la borra al final."""
    try:
        conexion = _conectar()
    except mysql.connector.Error as e:
        pytest.skip(f"MySQL no disponible: {e}")
    cur = conexion.cursor()
    with open(RUTA_SQL, encoding="utf-8") as f:
        sql = f.read().replace("antojito_db", BD_TEST)
    cur.execute(f"DROP DATABASE IF EXISTS {BD_TEST}")
    for sentencia in _sentencias(sql):
        cur.execute(sentencia)
    yield BD_TEST
    cur.execute(f"DROP DATABASE IF EXISTS {BD_TEST}")
    cur.close()
    conexion.close()


def _vaciar_tablas(conexion):
    cur = conexion.cursor()
    cur.execute("SET FOREIGN_KEY_CHECKS = 0")
    cur.execute("SHOW TABLES")
    for (tabla,) in cur.fetchall():
        cur.execute(f"TRUNCATE TABLE `{tabla}`")
    cur.execute("SET FOREIGN_KEY_CHECKS = 1")
    cur.close()


@pytest.fixture
def nueva_conexion(bd):
    """Fábrica de conexiones independientes (para probar concurrencia). Se cierran solas."""
    abiertas = []

    def abrir():
        conexion = _conectar(bd)
        abiertas.append(conexion)
        return conexion

    yield abrir
    for conexion in abiertas:
        conexion.close()


@pytest.fixture
def cursor(bd, nueva_conexion):
    """Cursor de diccionarios sobre antojito_test, con las tablas vacías. Autocommit activado."""
    conexion = nueva_conexion()
    _vaciar_tablas(conexion)
    cur = conexion.cursor(dictionary=True)
    yield cur
    cur.close()


@pytest.fixture
def crear_usuario(cursor):
    def _crear(rol="cliente", puntos=0):
        n = next(_contador)
        cursor.execute(
            "INSERT INTO usuarios (nombre, email, password_hash, rol, puntos) VALUES (%s, %s, %s, %s, %s)",
            (f"Usuario {n}", f"usuario{n}@prueba.mx", HASH_DUMMY, rol, puntos))
        return {"id": cursor.lastrowid, "rol": rol}
    return _crear


@pytest.fixture
def crear_puesto(cursor):
    def _crear(propietario_id=None, recomendado_por=None, estatus="verificado", categoria="tacos"):
        n = next(_contador)
        cursor.execute(
            "INSERT INTO puestos (propietario_id, recomendado_por, nombre, categoria, latitud, longitud, estatus) "
            "VALUES (%s, %s, %s, %s, %s, %s, %s)",
            (propietario_id, recomendado_por, f"Puesto {n}", categoria, 19.4326, -99.1332, estatus))
        return cursor.lastrowid
    return _crear
