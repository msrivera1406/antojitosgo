import pytest


@pytest.mark.parametrize("ruta", ["/", "/puesto/1", "/recomendar", "/locatario", "/perfil", "/login", "/registro"])
def test_vistas_responden_200(client, ruta):
    respuesta = client.get(ruta)
    assert respuesta.status_code == 200
    assert b"<html" in respuesta.data


def test_error_json_en_api(client):
    respuesta = client.get("/api/no-existe")
    assert respuesta.status_code == 404
    assert "error" in respuesta.get_json()


def test_salud_responde_aunque_no_haya_bd(client):
    respuesta = client.get("/api/salud")
    assert respuesta.status_code == 200
    assert respuesta.get_json()["estado"] == "ok"
