"""GET /api/puestos/cercanos y utils/geo.py. Sin base de datos: db_cursor se reemplaza por un doble."""
from contextlib import contextmanager

import pytest

import config
from utils.geo import caja_envolvente, dentro_del_area

ZOCALO = {"lat": 19.4326, "lng": -99.1332}


class CursorFalso:
    def __init__(self, filas):
        self.filas = filas
        self.consulta = None
        self.parametros = None

    def execute(self, consulta, parametros):
        self.consulta, self.parametros = consulta, parametros

    def fetchall(self):
        return self.filas


@pytest.fixture
def cursor(monkeypatch):
    falso = CursorFalso([])

    @contextmanager
    def _db_cursor(commit=True):
        yield falso

    monkeypatch.setattr("routes.puestos_routes.db_cursor", _db_cursor)
    return falso


def test_caja_envolvente_contiene_el_circulo():
    lat_min, lat_max, lng_min, lng_max = caja_envolvente(19.4326, -99.1332, 1000)
    assert lat_min < 19.4326 < lat_max and lng_min < -99.1332 < lng_max
    # 1 km son unos 0.009 grados de latitud
    assert 0.0085 < (lat_max - lat_min) / 2 < 0.0095


def test_dentro_del_area():
    assert dentro_del_area(19.4326, -99.1332, config.CDMX_BBOX)
    assert dentro_del_area(19.5161, -98.8828, config.CDMX_BBOX)  # Texcoco
    assert not dentro_del_area(25.68, -100.31, config.CDMX_BBOX)


def test_devuelve_lista_con_distancia_redondeada(client, cursor):
    cursor.filas = [
        {"id": 1, "nombre": "A", "categoria": "tacos", "latitud": 19.43, "longitud": -99.13,
         "estatus": "verificado", "distancia_m": 123.6},
    ]
    r = client.get("/api/puestos/cercanos", query_string=ZOCALO)
    assert r.status_code == 200
    assert r.get_json()[0]["distancia_m"] == 124


def test_parametros_van_en_orden_y_sin_interpolar(client, cursor):
    client.get("/api/puestos/cercanos", query_string={**ZOCALO, "radio": 800, "categoria": "tacos", "estatus": "verificado"})
    assert cursor.consulta.count("%s") == len(cursor.parametros)
    assert cursor.parametros[:3] == [ZOCALO["lat"], ZOCALO["lat"], ZOCALO["lng"]]
    assert "tacos" in cursor.parametros and "verificado" in cursor.parametros
    assert cursor.parametros[-2:] == [800, 100]  # radio y límite
    assert "tacos" not in cursor.consulta  # nunca interpolado en el SQL


@pytest.mark.parametrize(
    "consulta",
    [
        {},
        {"lat": "abc", "lng": -99.1},
        {"lat": "nan", "lng": -99.1},
        {"lat": "inf", "lng": -99.1},
        {"lat": 25.68, "lng": -100.31},
        {**ZOCALO, "radio": 0},
        {**ZOCALO, "radio": 99999},
        {**ZOCALO, "categoria": "sushi"},
        {**ZOCALO, "estatus": "falso"},
    ],
)
def test_parametros_invalidos_dan_400(client, cursor, consulta):
    r = client.get("/api/puestos/cercanos", query_string=consulta)
    assert r.status_code == 400
    assert "error" in r.get_json()
    assert cursor.consulta is None  # ni siquiera se consulta la BD


def test_estatus_todos_no_filtra(client, cursor):
    client.get("/api/puestos/cercanos", query_string={**ZOCALO, "estatus": "todos"})
    assert "estatus = %s" not in cursor.consulta
