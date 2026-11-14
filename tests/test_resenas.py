"""Pruebas de reseñas: listar, crear, actualizar, validación y permisos."""
import pytest


def url(puesto_id):
    return f"/api/puestos/{puesto_id}/resenas"


def test_lista_vacia_es_publica(client_bd, crear_puesto):
    puesto = crear_puesto()
    datos = client_bd.get(url(puesto)).get_json()
    assert datos == {"total": 0, "promedio": None, "resenas": [], "mia": None}


def test_puesto_inexistente_404(client_bd):
    assert client_bd.get(url(999999)).status_code == 404


def test_crear_requiere_sesion(client_bd, crear_puesto):
    puesto = crear_puesto()
    assert client_bd.post(url(puesto), json={"calificacion": 5}).status_code == 401


def test_crear_y_actualizar(client_bd, crear_usuario, crear_puesto, login, cursor):
    puesto = crear_puesto()
    ana = crear_usuario()
    login(client_bd, ana)

    r = client_bd.post(url(puesto), json={"calificacion": 4, "comentario": "  Muy rico  "})
    assert r.status_code == 201
    cuerpo = r.get_json()
    assert cuerpo["resena"]["calificacion"] == 4
    assert cuerpo["resena"]["comentario"] == "Muy rico"
    assert cuerpo["total"] == 1 and cuerpo["promedio"] == 4.0

    r = client_bd.post(url(puesto), json={"calificacion": 2})
    assert r.status_code == 200
    cursor.execute("SELECT COUNT(*) AS n FROM resenas WHERE puesto_id = %s", (puesto,))
    assert cursor.fetchone()["n"] == 1

    datos = client_bd.get(url(puesto)).get_json()
    assert datos["mia"]["calificacion"] == 2
    assert datos["promedio"] == 2.0


def test_promedio_y_autor_solo_nombre(client_bd, crear_usuario, crear_puesto, login):
    puesto = crear_puesto()
    for calificacion in (5, 4):
        login(client_bd, crear_usuario())
        client_bd.post(url(puesto), json={"calificacion": calificacion})
    datos = client_bd.get(url(puesto)).get_json()
    assert datos["total"] == 2 and datos["promedio"] == 4.5
    for resena in datos["resenas"]:
        assert resena["autor"] == "Usuario"  # "Usuario N" -> solo el nombre de pila
        assert "email" not in resena


@pytest.mark.parametrize("cuerpo", [
    {}, {"calificacion": 0}, {"calificacion": 6}, {"calificacion": "5"}, {"calificacion": 4.5},
    {"calificacion": True}, {"calificacion": 3, "comentario": "x" * 501}, {"calificacion": 3, "comentario": 7},
])
def test_validacion(client_bd, crear_usuario, crear_puesto, login, cuerpo):
    puesto = crear_puesto()
    login(client_bd, crear_usuario())
    assert client_bd.post(url(puesto), json=cuerpo).status_code == 400


def test_dueno_no_puede_resenar_su_puesto(client_bd, crear_usuario, crear_puesto, login):
    dueno = crear_usuario(rol="locatario")
    puesto = crear_puesto(propietario_id=dueno["id"])
    login(client_bd, dueno)
    assert client_bd.post(url(puesto), json={"calificacion": 5}).status_code == 403


def test_resenar_puesto_recomendado(client_bd, crear_usuario, crear_puesto, login):
    puesto = crear_puesto(estatus="recomendado")
    login(client_bd, crear_usuario())
    assert client_bd.post(url(puesto), json={"calificacion": 3}).status_code == 201
