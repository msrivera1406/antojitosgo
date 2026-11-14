"""GET /api/puestos/<id>. Sin base de datos: db_cursor se reemplaza por un doble."""
from contextlib import contextmanager
from decimal import Decimal

import pytest

PUESTO = {
    "id": 3, "nombre": "Esquites Doña Lupe", "descripcion": "Con todo", "categoria": "esquites",
    "latitud": Decimal("19.41000000"), "longitud": Decimal("-99.16000000"), "horario": "17:00 a 23:00",
    "estatus": "verificado", "foto_url": None, "propietario_id": 7,
}
PRODUCTOS = [
    {"id": 9, "nombre": "Esquite chico", "precio": Decimal("35.00"), "disponible": 1},
    {"id": 10, "nombre": "Esquite grande", "precio": Decimal("50.00"), "disponible": 0},
]


class CursorFalso:
    def __init__(self):
        self.puesto = dict(PUESTO)
        self.productos = [dict(p) for p in PRODUCTOS]
        self.consultas = []
        self._ultima = None

    def execute(self, consulta, parametros):
        self.consultas.append((consulta, parametros))
        self._ultima = consulta

    def fetchone(self):
        return dict(self.puesto) if self.puesto else None  # copia: cada petición recibe filas nuevas

    def fetchall(self):
        disponibles_solo = "disponible = TRUE" in self._ultima
        return [dict(p) for p in self.productos if p["disponible"] or not disponibles_solo]


@pytest.fixture
def cursor(monkeypatch):
    falso = CursorFalso()

    @contextmanager
    def _db_cursor(commit=True):
        yield falso

    monkeypatch.setattr("routes.puestos_routes.db_cursor", _db_cursor)
    return falso


def iniciar_sesion(client, usuario_id, rol):
    with client.session_transaction() as sesion:
        sesion["usuario_id"] = usuario_id
        sesion["rol"] = rol


def test_anonimo_ve_solo_productos_disponibles(client, cursor):
    r = client.get("/api/puestos/3")
    assert r.status_code == 200
    datos = r.get_json()
    assert [p["id"] for p in datos["productos"]] == [9]
    assert datos["productos"][0] == {"id": 9, "nombre": "Esquite chico", "precio": 35.0, "disponible": True}
    assert datos["latitud"] == 19.41  # número, no cadena


def test_no_expone_al_propietario(client, cursor):
    datos = client.get("/api/puestos/3").get_json()
    assert "propietario_id" not in datos and "recomendado_por" not in datos


def test_dueno_ve_todos_los_productos(client, cursor):
    iniciar_sesion(client, 7, "locatario")
    datos = client.get("/api/puestos/3").get_json()
    assert [p["id"] for p in datos["productos"]] == [9, 10]
    assert datos["productos"][1]["disponible"] is False


def test_admin_ve_todos_los_productos(client, cursor):
    iniciar_sesion(client, 1, "admin")
    assert len(client.get("/api/puestos/3").get_json()["productos"]) == 2


def test_otro_locatario_o_cliente_ve_solo_disponibles(client, cursor):
    iniciar_sesion(client, 8, "locatario")
    assert len(client.get("/api/puestos/3").get_json()["productos"]) == 1
    iniciar_sesion(client, 9, "cliente")
    assert len(client.get("/api/puestos/3").get_json()["productos"]) == 1


def test_puesto_inexistente_da_404_json(client, cursor):
    cursor.puesto = None
    r = client.get("/api/puestos/999")
    assert r.status_code == 404
    assert "error" in r.get_json()
    assert len(cursor.consultas) == 1  # no consulta productos


def test_id_no_numerico_no_coincide_con_la_ruta(client, cursor):
    assert client.get("/api/puestos/abc").status_code == 404
    assert cursor.consultas == []


def test_consultas_parametrizadas(client, cursor):
    client.get("/api/puestos/3")
    assert all(parametros == (3,) for _, parametros in cursor.consultas)
