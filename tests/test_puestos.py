"""Pruebas de puestos (spec 01, tarea 7). Por ahora: foto (7.1) y POST /api/puestos/recomendar (7.2)."""
import io
import os
import re

import pytest
from werkzeug.datastructures import FileStorage

import config
from utils import fotos

JPG = b"\xff\xd8\xff\xe0" + b"\x00" * 100
PNG = b"\x89PNG\r\n\x1a\n" + b"\x00" * 100
WEBP = b"RIFF\x24\x00\x00\x00WEBPVP8 " + b"\x00" * 100

FORM = {"nombre": "Tacos Don Beto", "categoria": "tacos", "latitud": "19.4326", "longitud": "-99.1332",
        "descripcion": "Los mejores de la esquina"}


def archivo(contenido, nombre="foto.jpg"):
    return FileStorage(stream=io.BytesIO(contenido), filename=nombre)


def recomendar(client, foto=None, **cambios):
    datos = {**FORM, **cambios}
    datos = {k: v for k, v in datos.items() if v is not None}
    if foto is not None:
        datos["foto"] = (io.BytesIO(foto[0]), foto[1])
    return client.post("/api/puestos/recomendar", data=datos, content_type="multipart/form-data")


def estado_bd(cursor, usuario_id):
    cursor.execute("SELECT COUNT(*) AS n FROM puestos")
    puestos = cursor.fetchone()["n"]
    cursor.execute("SELECT puntos, recomendaciones_contadas FROM usuarios WHERE id = %s", (usuario_id,))
    return puestos, cursor.fetchone()


# --- utils/fotos.py (tarea 7.1) ----------------------------------------------------------------
@pytest.mark.parametrize("contenido,extension", [(JPG, ".jpg"), (PNG, ".png"), (WEBP, ".webp")])
def test_detecta_el_tipo_por_los_bytes_y_no_por_el_nombre(contenido, extension):
    assert fotos.validar_foto(archivo(contenido, nombre="engano.txt")) == (contenido, extension)


@pytest.mark.parametrize("contenido", [b"", b"GIF89a....", b"<?php echo 1;", b"RIFF\x00\x00\x00\x00WAVEfmt ", b"%PDF-1.4"])
def test_rechaza_lo_que_no_es_jpg_png_webp(contenido):
    with pytest.raises(ValueError, match="JPG, PNG o WebP"):
        fotos.validar_foto(archivo(contenido, nombre="foto.jpg"))


def test_rechaza_mas_de_5_mb_y_acepta_exactamente_5_mb():
    justo = JPG + b"\x00" * (config.MAX_UPLOAD_BYTES - len(JPG))
    assert fotos.validar_foto(archivo(justo))[1] == ".jpg"
    with pytest.raises(ValueError, match="5 MB"):
        fotos.validar_foto(archivo(justo + b"\x00"))


def test_guardar_y_borrar_foto(tmp_path, monkeypatch):
    monkeypatch.setattr(config, "UPLOAD_DIR", str(tmp_path / "up"))
    url = fotos.guardar_foto(JPG, ".jpg")
    assert re.fullmatch(r"/static/uploads/[0-9a-f]{32}\.jpg", url)
    ruta = tmp_path / "up" / os.path.basename(url)
    assert ruta.read_bytes() == JPG
    fotos.borrar_foto(url)
    assert not ruta.exists()
    fotos.borrar_foto(url)  # ya no existe: no falla
    fotos.borrar_foto("/static/otra/cosa.jpg")  # ajena: se ignora


# --- POST /api/puestos/recomendar (tarea 7.2) --------------------------------------------------
def test_recomendar_sin_sesion_da_401(client_bd):
    assert recomendar(client_bd).status_code == 401


def test_recomendar_feliz_crea_puesto_suma_50_puntos_y_cuenta_el_hito(client_bd, cursor, crear_usuario, login):
    usuario = crear_usuario(puntos=10)
    login(client_bd, usuario)
    r = recomendar(client_bd)
    assert r.status_code == 201
    cuerpo = r.get_json()
    assert cuerpo["puntos_ganados"] == 50 and cuerpo["puntos_totales"] == 60 and cuerpo["cupon_ganado"] is None
    puesto = cuerpo["puesto"]
    assert puesto["estatus"] == "recomendado" and puesto["foto_url"] is None
    assert (puesto["nombre"], puesto["categoria"], puesto["latitud"]) == ("Tacos Don Beto", "tacos", 19.4326)
    cursor.execute("SELECT propietario_id, recomendado_por, estatus FROM puestos WHERE id = %s", (puesto["id"],))
    assert cursor.fetchone() == {"propietario_id": None, "recomendado_por": usuario["id"], "estatus": "recomendado"}
    assert estado_bd(cursor, usuario["id"])[1] == {"puntos": 60, "recomendaciones_contadas": 1}


def test_recomendar_con_foto_valida_la_guarda_con_uuid(client_bd, crear_usuario, login):
    login(client_bd, crear_usuario())
    r = recomendar(client_bd, foto=(PNG, "mi foto.png"))
    url = r.get_json()["puesto"]["foto_url"]
    assert r.status_code == 201 and re.fullmatch(r"/static/uploads/[0-9a-f]{32}\.png", url)
    assert os.path.exists(os.path.join(config.UPLOAD_DIR, os.path.basename(url)))


def test_recomendar_la_quinta_contable_emite_cupon_de_15(client_bd, cursor, crear_usuario, login):
    usuario = crear_usuario()
    cursor.execute("UPDATE usuarios SET recomendaciones_contadas = 4 WHERE id = %s", (usuario["id"],))
    login(client_bd, usuario)
    cuerpo = recomendar(client_bd).get_json()
    cupon = cuerpo["cupon_ganado"]
    assert cupon["monto"] == 15.0 and cupon["origen"] == "recomendacion" and cupon["puesto"] is None
    assert re.fullmatch(r"CUP-[A-HJ-NP-Z2-9]{6}", cupon["codigo"])
    cursor.execute("SELECT COUNT(*) AS n FROM cupones WHERE usuario_id = %s", (usuario["id"],))
    assert cursor.fetchone()["n"] == 1


def test_recomendar_mas_de_3_al_dia_da_puntos_pero_no_avanza_el_hito(client_bd, cursor, crear_usuario, login):
    usuario = crear_usuario()
    login(client_bd, usuario)
    for _ in range(5):
        assert recomendar(client_bd).status_code == 201
    puestos, usuario_bd = estado_bd(cursor, usuario["id"])
    assert puestos == 5
    assert usuario_bd == {"puntos": 250, "recomendaciones_contadas": config.MAX_RECOMENDACIONES_CONTABLES_DIA}


@pytest.mark.parametrize("cambios", [
    {"nombre": None}, {"nombre": "  "}, {"categoria": None}, {"latitud": None}, {"longitud": None},
    {"nombre": "x" * 121}, {"categoria": "pizza"}, {"descripcion": "x" * 501},
    {"latitud": "abc"}, {"latitud": "nan"}, {"longitud": "inf"},
    {"latitud": "18.99"}, {"latitud": "19.71"}, {"longitud": "-99.41"}, {"longitud": "-98.89"},
])
def test_recomendar_invalido_da_400_sin_crear_nada(client_bd, cursor, crear_usuario, login, cambios):
    usuario = crear_usuario()
    login(client_bd, usuario)
    assert recomendar(client_bd, **cambios).status_code == 400
    assert estado_bd(cursor, usuario["id"]) == (0, {"puntos": 0, "recomendaciones_contadas": 0})


@pytest.mark.parametrize("foto,mensaje", [
    ((b"GIF89a" + b"\x00" * 50, "foto.gif"), "JPG, PNG o WebP"),
    ((b"<?php echo 1;", "shell.jpg"), "JPG, PNG o WebP"),
    ((JPG + b"\x00" * config.MAX_UPLOAD_BYTES, "grande.jpg"), "5 MB"),
])
def test_recomendar_con_foto_invalida_da_400_y_no_deja_archivos(client_bd, cursor, crear_usuario, login, foto, mensaje):
    usuario = crear_usuario()
    login(client_bd, usuario)
    r = recomendar(client_bd, foto=foto)
    assert r.status_code == 400 and mensaje in r.get_json()["error"]
    assert estado_bd(cursor, usuario["id"]) == (0, {"puntos": 0, "recomendaciones_contadas": 0})
    assert os.listdir(config.UPLOAD_DIR) == []


def test_recomendar_si_falla_la_transaccion_deshace_todo_y_borra_la_foto(client_bd, cursor, crear_usuario, login, monkeypatch):
    usuario = crear_usuario()
    login(client_bd, usuario)

    def falla(*_):
        raise RuntimeError("fallo simulado")

    monkeypatch.setattr("routes.puestos_routes.registrar_recomendacion", falla)
    client_bd.application.config["PROPAGATE_EXCEPTIONS"] = False
    r = recomendar(client_bd, foto=(JPG, "foto.jpg"))
    assert r.status_code == 500 and "error" in r.get_json()
    assert estado_bd(cursor, usuario["id"]) == (0, {"puntos": 0, "recomendaciones_contadas": 0})
    assert os.listdir(config.UPLOAD_DIR) == []


def test_recomendar_con_cuenta_borrada_da_401_y_limpia_la_foto(client_bd, cursor, crear_usuario, login):
    usuario = crear_usuario()
    login(client_bd, usuario)
    cursor.execute("DELETE FROM usuarios WHERE id = %s", (usuario["id"],))
    assert recomendar(client_bd, foto=(JPG, "foto.jpg")).status_code == 401
    assert os.listdir(config.UPLOAD_DIR) == []
