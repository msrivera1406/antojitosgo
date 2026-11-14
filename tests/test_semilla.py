"""Verifica los datos semilla de database.sql contra una BD temporal (spec 01, tarea 8.4).

Crea antojito_semilla_test desde database.sql (cambiando el nombre de la BD). No toca antojito_db ni antojito_test.
Si no hay MySQL disponible, las pruebas se omiten.
"""
import os
import re

import mysql.connector
import pytest
from werkzeug.security import check_password_hash

import config

BD_TEST = "antojito_semilla_test"  # aparte de antojito_test, que usan las demás pruebas
RUTA_SQL = os.path.join(config.BASE_DIR, "database.sql")


def _sentencias(sql):
    sin_comentarios = "\n".join(l for l in sql.splitlines() if not l.strip().startswith("--"))
    return [s.strip() for s in sin_comentarios.split(";") if s.strip()]


@pytest.fixture(scope="module")
def cursor():
    try:
        conexion = mysql.connector.connect(
            host=config.DB_HOST, port=config.DB_PORT, user=config.DB_USER,
            password=config.DB_PASSWORD, charset="utf8mb4", collation="utf8mb4_unicode_ci",
            connection_timeout=5,
        )
    except mysql.connector.Error as e:
        pytest.skip(f"MySQL no disponible: {e}")
    cur = conexion.cursor(dictionary=True)
    with open(RUTA_SQL, encoding="utf-8") as f:
        sql = f.read().replace("antojito_db", BD_TEST)
    cur.execute(f"DROP DATABASE IF EXISTS {BD_TEST}")
    for sentencia in _sentencias(sql):
        cur.execute(sentencia)
    conexion.commit()
    yield cur
    cur.execute(f"DROP DATABASE IF EXISTS {BD_TEST}")
    cur.close()
    conexion.close()


def _uno(cur, sql):
    cur.execute(sql)
    return cur.fetchone()["n"]


def test_conteos_de_usuarios_por_rol(cursor):
    cursor.execute("SELECT rol, COUNT(*) n FROM usuarios GROUP BY rol")
    assert {r["rol"]: r["n"] for r in cursor.fetchall()} == {"admin": 1, "locatario": 2, "cliente": 2}


def test_entre_8_y_10_puestos(cursor):
    assert 8 <= _uno(cursor, "SELECT COUNT(*) n FROM puestos") <= 10


def test_al_menos_6_verificados_con_3_productos(cursor):
    cursor.execute(
        "SELECT p.id FROM puestos p JOIN productos d ON d.puesto_id = p.id "
        "WHERE p.estatus = 'verificado' GROUP BY p.id HAVING COUNT(*) >= 3")
    assert len(cursor.fetchall()) >= 6


def test_al_menos_2_recomendados(cursor):
    assert _uno(cursor, "SELECT COUNT(*) n FROM puestos WHERE estatus = 'recomendado'") >= 2


def test_cubre_las_7_categorias(cursor):
    cursor.execute("SELECT DISTINCT categoria FROM puestos")
    assert {r["categoria"] for r in cursor.fetchall()} == set(config.CATEGORIAS)


def test_coordenadas_dentro_de_cdmx(cursor):
    (lat_min, lat_max), (lng_min, lng_max) = config.CDMX_BBOX["lat"], config.CDMX_BBOX["lng"]
    cursor.execute("SELECT nombre, latitud, longitud FROM puestos")
    for p in cursor.fetchall():
        assert lat_min <= float(p["latitud"]) <= lat_max, p["nombre"]
        assert lng_min <= float(p["longitud"]) <= lng_max, p["nombre"]


def test_locatarios_son_duenos_de_puestos_verificados(cursor):
    cursor.execute(
        "SELECT u.id FROM usuarios u JOIN puestos p ON p.propietario_id = u.id "
        "WHERE u.rol = 'locatario' AND p.estatus = 'verificado' GROUP BY u.id")
    assert len(cursor.fetchall()) == 2


def test_cliente_demo_con_250_puntos_cupon_y_4_pedidos(cursor):
    cursor.execute("SELECT id FROM usuarios WHERE rol = 'cliente' AND puntos = 250")
    clientes = cursor.fetchall()
    assert len(clientes) == 1
    uid = clientes[0]["id"]
    cursor.execute(
        "SELECT monto FROM cupones WHERE usuario_id = %s AND usado = FALSE AND vence_en > NOW() "
        "AND puesto_id IS NULL", (uid,))
    cupones = cursor.fetchall()
    assert len(cupones) == 1 and float(cupones[0]["monto"]) == 15.0
    cursor.execute(
        "SELECT puesto_id, COUNT(*) n FROM pedidos WHERE cliente_id = %s AND estado = 'entregado' "
        "AND total >= %s GROUP BY puesto_id", (uid, config.CONSUMO_MIN_MXN))
    filas = cursor.fetchall()
    assert [f["n"] for f in filas] == [config.HITO_CONSUMO - 1]
    cursor.execute("SELECT estatus FROM puestos WHERE id = %s", (filas[0]["puesto_id"],))
    assert cursor.fetchone()["estatus"] == "verificado"


def test_total_de_cada_pedido_coincide_con_su_detalle(cursor):
    cursor.execute(
        "SELECT p.id FROM pedidos p JOIN detalle_pedidos d ON d.pedido_id = p.id "
        "GROUP BY p.id, p.total, p.descuento_aplicado HAVING SUM(d.subtotal) - p.descuento_aplicado <> p.total")
    assert cursor.fetchall() == []


def test_codigos_pickup_y_cupon_con_formato(cursor):
    cursor.execute("SELECT codigo_pickup FROM pedidos")
    assert all(re.fullmatch(r"ANT-\d{3}", r["codigo_pickup"]) for r in cursor.fetchall())
    cursor.execute("SELECT codigo FROM cupones")
    assert all(re.fullmatch(r"CUP-[A-HJ-NP-Z2-9]{6}", r["codigo"]) for r in cursor.fetchall())


@pytest.mark.parametrize("email,password", [
    ("admin@antojito.mx", "Admin12345"),
    ("lupe@antojito.mx", "Locatario123"),
    ("chela@antojito.mx", "Locatario123"),
    ("ana@antojito.mx", "Cliente1234"),
    ("beto@antojito.mx", "Cliente1234"),
])
def test_hashes_de_los_usuarios_de_prueba(cursor, email, password):
    cursor.execute("SELECT password_hash FROM usuarios WHERE email = %s", (email,))
    assert check_password_hash(cursor.fetchone()["password_hash"], password)


def test_acentos_bien_codificados(cursor):
    cursor.execute("SELECT COUNT(*) n FROM puestos WHERE nombre LIKE BINARY '%Ã%'")
    assert cursor.fetchone()["n"] == 0
    cursor.execute("SELECT COUNT(*) n FROM puestos WHERE nombre LIKE BINARY '%Güero%'")
    assert cursor.fetchone()["n"] == 1
