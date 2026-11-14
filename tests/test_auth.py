"""Pruebas de registro, login, sesión y perfil (spec 01, tarea 5.4)."""
from datetime import datetime, timedelta

import pytest

DATOS = {"nombre": "Ana Pérez", "email": "ana@correo.mx", "password": "Segura1234", "rol": "cliente"}


def registrar(client, **cambios):
    return client.post("/api/auth/registro", json={**DATOS, **cambios})


# --- Registro ----------------------------------------------------------------------------------
def test_registro_feliz_crea_usuario_inicia_sesion_y_guarda_hash(client_bd, cursor):
    r = registrar(client_bd)
    assert r.status_code == 201
    usuario = r.get_json()
    assert usuario == {"id": usuario["id"], "nombre": "Ana Pérez", "email": "ana@correo.mx",
                       "rol": "cliente", "puntos": 0}
    assert "password" not in str(usuario) and "hash" not in str(usuario)
    assert client_bd.get("/api/auth/me").get_json()["id"] == usuario["id"]
    cursor.execute("SELECT password_hash FROM usuarios WHERE id = %s", (usuario["id"],))
    assert cursor.fetchone()["password_hash"] not in (DATOS["password"], "")


def test_registro_locatario(client_bd):
    assert registrar(client_bd, rol="locatario").get_json()["rol"] == "locatario"


def test_registro_normaliza_el_correo(client_bd):
    assert registrar(client_bd, email="  ANA@Correo.MX ").get_json()["email"] == "ana@correo.mx"


def test_registro_email_duplicado_da_409(client_bd):
    registrar(client_bd)
    assert registrar(client_bd, email="ANA@correo.mx").status_code == 409


@pytest.mark.parametrize("cambios", [
    {"rol": "admin"}, {"rol": "otro"}, {"rol": ""}, {"password": "corta12"}, {"password": "x" * 129},
    {"email": "sin-arroba"}, {"email": "a@b"}, {"nombre": "   "}, {"nombre": "x" * 101},
    {"nombre": None}, {"email": 123}, {"password": ["lista"]},
])
def test_registro_invalido_da_400(client_bd, cursor, cambios):
    assert registrar(client_bd, **cambios).status_code == 400
    cursor.execute("SELECT COUNT(*) AS n FROM usuarios")
    assert cursor.fetchone()["n"] == 0


@pytest.mark.parametrize("campo", ["nombre", "email", "password", "rol"])
def test_registro_con_campo_faltante_da_400(client_bd, campo):
    datos = {k: v for k, v in DATOS.items() if k != campo}
    assert client_bd.post("/api/auth/registro", json=datos).status_code == 400


def test_registro_sin_json_da_400(client_bd):
    assert client_bd.post("/api/auth/registro", data="no es json").status_code == 400
    assert client_bd.post("/api/auth/registro", json=[1, 2]).status_code == 400


# --- Login / me / logout -----------------------------------------------------------------------
def test_login_feliz_devuelve_usuario_con_rol_y_puntos(client_bd, crear_usuario):
    usuario = crear_usuario("locatario", puntos=120)
    r = client_bd.post("/api/auth/login", json={"email": usuario["email"], "password": usuario["password"]})
    assert r.status_code == 200
    cuerpo = r.get_json()
    assert (cuerpo["id"], cuerpo["email"], cuerpo["rol"], cuerpo["puntos"]) == (usuario["id"], usuario["email"], "locatario", 120)
    assert client_bd.get("/api/auth/me").status_code == 200


def test_login_fallido_usa_el_mismo_mensaje_para_correo_y_password(client_bd, crear_usuario):
    usuario = crear_usuario()
    mala_password = client_bd.post("/api/auth/login", json={"email": usuario["email"], "password": "incorrecta1"})
    no_existe = client_bd.post("/api/auth/login", json={"email": "nadie@correo.mx", "password": "incorrecta1"})
    assert mala_password.status_code == no_existe.status_code == 401
    assert mala_password.get_json() == no_existe.get_json()
    assert client_bd.get("/api/auth/me").status_code == 401


def test_login_sin_campos_da_400(client_bd):
    assert client_bd.post("/api/auth/login", json={"email": "a@b.mx"}).status_code == 400
    assert client_bd.post("/api/auth/login", data="x").status_code == 400


def test_login_reemplaza_la_sesion_anterior(client_bd, crear_usuario, login):
    a, b = crear_usuario(), crear_usuario()
    login(client_bd, a)
    client_bd.post("/api/auth/login", json={"email": b["email"], "password": b["password"]})
    assert client_bd.get("/api/auth/me").get_json()["id"] == b["id"]


def test_me_sin_sesion_da_401(client_bd):
    assert client_bd.get("/api/auth/me").status_code == 401


def test_me_con_cuenta_borrada_da_401_y_limpia_la_sesion(client_bd, cursor, crear_usuario, login):
    usuario = crear_usuario()
    login(client_bd, usuario)
    cursor.execute("DELETE FROM usuarios WHERE id = %s", (usuario["id"],))
    assert client_bd.get("/api/auth/me").status_code == 401
    with client_bd.session_transaction() as sesion:
        assert "usuario_id" not in sesion


def test_logout_limpia_la_sesion(client_bd, crear_usuario, login):
    login(client_bd, crear_usuario())
    assert client_bd.post("/api/auth/logout").status_code == 200
    assert client_bd.get("/api/auth/me").status_code == 401


def test_cookie_de_sesion_httponly_y_samesite_lax(client_bd):
    cookie = registrar(client_bd).headers["Set-Cookie"]
    assert "HttpOnly" in cookie and "SameSite=Lax" in cookie


# --- Perfil ------------------------------------------------------------------------------------
def test_perfil_sin_sesion_da_401(client_bd, crear_usuario):
    assert client_bd.get(f"/api/usuarios/{crear_usuario()['id']}/perfil").status_code == 401


def test_perfil_ajeno_da_403_y_admin_puede_verlo(client_bd, crear_usuario, login):
    ana, beto, admin = crear_usuario(), crear_usuario(), crear_usuario("admin")
    login(client_bd, ana)
    assert client_bd.get(f"/api/usuarios/{beto['id']}/perfil").status_code == 403
    login(client_bd, admin)
    assert client_bd.get(f"/api/usuarios/{beto['id']}/perfil").status_code == 200


def test_perfil_de_usuario_inexistente_da_404_para_admin(client_bd, crear_usuario, login):
    login(client_bd, crear_usuario("admin"))
    assert client_bd.get("/api/usuarios/99999/perfil").status_code == 404


def test_perfil_vacio(client_bd, crear_usuario, login):
    usuario = crear_usuario()
    login(client_bd, usuario)
    perfil = client_bd.get(f"/api/usuarios/{usuario['id']}/perfil").get_json()
    assert perfil["puntos"] == 0
    assert perfil["insignia"] == {"nivel": "Explorador de Banqueta", "siguiente_nivel": "Cazador de Garnachas",
                                  "puntos_para_siguiente": 150}
    assert perfil["cupones"] == [] and perfil["pedidos"] == []
    assert perfil["progreso"] == {"recomendaciones": {"actual": 0, "meta": 5, "contables_hoy_restantes": 3},
                                  "consumo": []}


def test_perfil_con_insignia_cupones_progreso_y_pedidos(client_bd, cursor, crear_usuario, crear_puesto, login):
    cliente, puesto = crear_usuario(puntos=250), crear_puesto()
    cursor.execute(
        "INSERT INTO cupones (usuario_id, codigo, monto, origen, clave_hito, vence_en) "
        "VALUES (%s, 'CUP-ABCDEF', 15, 'recomendacion', 'reco:1', %s)",
        (cliente["id"], datetime.now() + timedelta(days=5)))
    cupon_id = cursor.lastrowid
    cursor.execute(
        "INSERT INTO cupones (usuario_id, codigo, monto, origen, clave_hito, usado, vence_en) "
        "VALUES (%s, 'CUP-USADO2', 15, 'recomendacion', 'reco:2', TRUE, %s)",
        (cliente["id"], datetime.now() + timedelta(days=5)))
    for i, (total, descuento, cupon) in enumerate([(60, 0, None), (105, 15, cupon_id)], start=1):
        cursor.execute(
            "INSERT INTO pedidos (cliente_id, puesto_id, cupon_id, total, descuento_aplicado, estado, "
            "codigo_pickup, creado_en) VALUES (%s, %s, %s, %s, %s, 'entregado', %s, NOW() + INTERVAL %s MINUTE)",
            (cliente["id"], puesto, cupon, total, descuento, f"ANT-10{i}", i))
    login(client_bd, cliente)
    perfil = client_bd.get(f"/api/usuarios/{cliente['id']}/perfil").get_json()
    assert perfil["insignia"]["nivel"] == "Cazador de Garnachas"
    assert perfil["insignia"]["puntos_para_siguiente"] == 250
    assert [c["codigo"] for c in perfil["cupones"]] == ["CUP-ABCDEF"]  # el usado no aparece
    assert perfil["cupones"][0]["monto"] == 15.0 and perfil["cupones"][0]["puesto"] is None
    assert perfil["progreso"]["consumo"] == [
        {"puesto_id": puesto, "puesto_nombre": perfil["pedidos"][0]["puesto"]["nombre"], "actual": 2, "meta": 5}]
    # El más reciente primero, sin items, con subtotal = total + descuento.
    assert [p["codigo_pickup"] for p in perfil["pedidos"]] == ["ANT-102", "ANT-101"]
    reciente = perfil["pedidos"][0]
    assert reciente["subtotal"] == 120.0 and reciente["total"] == 105.0 and reciente["descuento_aplicado"] == 15.0
    assert reciente["cupon"] == {"id": cupon_id, "codigo": "CUP-ABCDEF", "monto": 15.0}
    assert perfil["pedidos"][1]["cupon"] is None
    assert "items" not in reciente


def test_perfil_no_muestra_pedidos_de_otros(client_bd, cursor, crear_usuario, crear_puesto, login):
    ana, beto, puesto = crear_usuario(), crear_usuario(), crear_puesto()
    cursor.execute(
        "INSERT INTO pedidos (cliente_id, puesto_id, total, codigo_pickup) VALUES (%s, %s, 80, 'ANT-200')",
        (beto["id"], puesto))
    login(client_bd, ana)
    assert client_bd.get(f"/api/usuarios/{ana['id']}/perfil").get_json()["pedidos"] == []
