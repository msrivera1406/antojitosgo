"""Pruebas de utils/cupones.py contra antojito_test (spec 01, tarea 4.3). Ver fixtures en conftest.py."""
import re
import threading
from datetime import datetime, timedelta
from decimal import Decimal
from types import SimpleNamespace

import pytest

import config
from utils import cupones
from utils.cupones import (
    ALFABETO_CODIGO, generar_codigo, listar_cupones_vigentes, progreso_usuario,
    registrar_consumo, registrar_recomendacion, validar_y_consumir_cupon)


# --- Ayudantes ---------------------------------------------------------------------------------
def recomendar(cursor, crear_puesto, usuario_id, hace_horas=0):
    """Inserta un puesto recomendado (creado hace `hace_horas`) y registra la recomendación."""
    puesto_id = crear_puesto(recomendado_por=usuario_id, estatus="recomendado")
    if hace_horas:
        cursor.execute("UPDATE puestos SET creado_en = NOW() - INTERVAL %s HOUR WHERE id = %s",
                       (hace_horas, puesto_id))
    return registrar_recomendacion(cursor, usuario_id)


def entregar(cursor, cliente_id, puesto_id, total=60):
    """Inserta un pedido entregado y registra el consumo, como hará la ruta de pedidos."""
    cursor.execute(
        "INSERT INTO pedidos (cliente_id, puesto_id, total, estado, codigo_pickup) "
        "VALUES (%s, %s, %s, 'entregado', 'ANT-100')", (cliente_id, puesto_id, total))
    return registrar_consumo(cursor, cliente_id, puesto_id)


def insertar_cupon(cursor, usuario_id, puesto_id=None, monto=15, usado=False, dias=30, clave="x:1"):
    cursor.execute(
        "INSERT INTO cupones (usuario_id, puesto_id, codigo, monto, origen, clave_hito, usado, vence_en) "
        "VALUES (%s, %s, %s, %s, 'recomendacion', %s, %s, %s)",
        (usuario_id, puesto_id, generar_codigo(cursor), monto, clave, usado,
         datetime.now() + timedelta(days=dias)))
    return cursor.lastrowid


def contar_cupones(cursor, usuario_id):
    cursor.execute("SELECT COUNT(*) AS n FROM cupones WHERE usuario_id = %s", (usuario_id,))
    return cursor.fetchone()["n"]


# --- generar_codigo ----------------------------------------------------------------------------
def test_codigo_con_formato_y_sin_caracteres_ambiguos(cursor):
    for _ in range(50):
        codigo = generar_codigo(cursor)
        assert re.fullmatch(r"CUP-[A-HJ-NP-Z2-9]{6}", codigo)
        assert not set("01OI") & set(codigo[4:])


def test_codigo_reintenta_si_hay_colision(cursor, crear_usuario, monkeypatch):
    usuario = crear_usuario()
    ocupado = "CUP-AAAAAA"
    cursor.execute(
        "INSERT INTO cupones (usuario_id, codigo, monto, origen, clave_hito, vence_en) "
        "VALUES (%s, %s, 15, 'recomendacion', 'x:1', NOW() + INTERVAL 1 DAY)", (usuario["id"], ocupado))
    letras = iter(list("AAAAAA") + list("BBBBBB"))
    monkeypatch.setattr(cupones, "secrets", SimpleNamespace(choice=lambda _alfabeto: next(letras)))
    assert generar_codigo(cursor) == "CUP-BBBBBB"


def test_alfabeto_no_tiene_caracteres_ambiguos():
    assert not set("01OI") & set(ALFABETO_CODIGO)


# --- Hito de recomendaciones -------------------------------------------------------------------
def test_recomendaciones_1_a_4_sin_cupon_y_la_5_con_cupon_de_15(cursor, crear_usuario, crear_puesto):
    usuario = crear_usuario()
    # Para no chocar con el límite diario, las recomendaciones se reparten en días distintos.
    resultados = [recomendar(cursor, crear_puesto, usuario["id"], hace_horas=h) for h in (96, 72, 48, 25)]
    assert resultados == [None] * 4
    cupon = recomendar(cursor, crear_puesto, usuario["id"])
    assert cupon["monto"] == Decimal("15.00")
    assert cupon["origen"] == "recomendacion"
    assert cupon["puesto"] is None
    assert re.fullmatch(r"CUP-[A-HJ-NP-Z2-9]{6}", cupon["codigo"])
    assert cupon["vence_en"] > datetime.now() + timedelta(days=config.CUPON_VIGENCIA_DIAS - 1)


def test_mas_de_3_recomendaciones_el_mismo_dia_no_avanzan_el_hito(cursor, crear_usuario, crear_puesto):
    usuario = crear_usuario()
    for _ in range(6):
        recomendar(cursor, crear_puesto, usuario["id"])
    cursor.execute("SELECT recomendaciones_contadas FROM usuarios WHERE id = %s", (usuario["id"],))
    assert cursor.fetchone()["recomendaciones_contadas"] == config.MAX_RECOMENDACIONES_CONTABLES_DIA


def test_recomendaciones_de_hace_mas_de_un_dia_no_cuentan_para_el_limite(cursor, crear_usuario, crear_puesto):
    usuario = crear_usuario()
    for _ in range(3):  # puestos viejos: solo existen, no pasan por registrar_recomendacion
        puesto_id = crear_puesto(recomendado_por=usuario["id"], estatus="recomendado")
        cursor.execute("UPDATE puestos SET creado_en = NOW() - INTERVAL 30 HOUR WHERE id = %s", (puesto_id,))
    recomendar(cursor, crear_puesto, usuario["id"])
    cursor.execute("SELECT recomendaciones_contadas FROM usuarios WHERE id = %s", (usuario["id"],))
    assert cursor.fetchone()["recomendaciones_contadas"] == 1


def test_hito_repetido_no_duplica_el_cupon(cursor, crear_usuario, crear_puesto):
    usuario = crear_usuario()
    cursor.execute("UPDATE usuarios SET recomendaciones_contadas = 4 WHERE id = %s", (usuario["id"],))
    assert recomendar(cursor, crear_puesto, usuario["id"]) is not None
    # Simula una petición repetida: el contador vuelve a 4 y se intenta emitir el mismo hito.
    cursor.execute("UPDATE usuarios SET recomendaciones_contadas = 4 WHERE id = %s", (usuario["id"],))
    assert recomendar(cursor, crear_puesto, usuario["id"]) is None
    assert contar_cupones(cursor, usuario["id"]) == 1


def test_segundo_hito_usa_otra_clave(cursor, crear_usuario, crear_puesto):
    usuario = crear_usuario()
    cursor.execute("UPDATE usuarios SET recomendaciones_contadas = 9 WHERE id = %s", (usuario["id"],))
    assert recomendar(cursor, crear_puesto, usuario["id"]) is not None
    cursor.execute("SELECT clave_hito FROM cupones WHERE usuario_id = %s", (usuario["id"],))
    assert cursor.fetchone()["clave_hito"] == "reco:2"


# --- Hito de consumo ---------------------------------------------------------------------------
def test_quinto_pedido_entregado_emite_cupon_de_20_del_puesto(cursor, crear_usuario, crear_puesto):
    cliente, puesto = crear_usuario(), crear_puesto()
    assert [entregar(cursor, cliente["id"], puesto) for _ in range(4)] == [None] * 4
    cupon = entregar(cursor, cliente["id"], puesto)
    assert cupon["monto"] == Decimal("20.00")
    assert cupon["origen"] == "consumo"
    assert cupon["puesto"]["id"] == puesto


def test_pedidos_de_menos_de_50_no_cuentan(cursor, crear_usuario, crear_puesto):
    cliente, puesto = crear_usuario(), crear_puesto()
    for _ in range(4):
        entregar(cursor, cliente["id"], puesto)
    assert entregar(cursor, cliente["id"], puesto, total=Decimal("49.99")) is None
    assert contar_cupones(cursor, cliente["id"]) == 0
    assert entregar(cursor, cliente["id"], puesto, total=Decimal("50.00")) is not None


def test_pedidos_en_puestos_distintos_no_se_suman(cursor, crear_usuario, crear_puesto):
    cliente, puesto_a, puesto_b = crear_usuario(), crear_puesto(), crear_puesto()
    resultados = [entregar(cursor, cliente["id"], p) for p in (puesto_a, puesto_b) * 4]
    assert resultados == [None] * 8
    assert contar_cupones(cursor, cliente["id"]) == 0


def test_no_se_vuelve_a_emitir_el_mismo_hito_de_consumo(cursor, crear_usuario, crear_puesto):
    cliente, puesto = crear_usuario(), crear_puesto()
    for _ in range(5):
        entregar(cursor, cliente["id"], puesto)
    assert registrar_consumo(cursor, cliente["id"], puesto) is None  # misma petición repetida
    assert contar_cupones(cursor, cliente["id"]) == 1


def test_el_pedido_10_emite_el_segundo_cupon_de_consumo(cursor, crear_usuario, crear_puesto):
    cliente, puesto = crear_usuario(), crear_puesto()
    for _ in range(9):
        entregar(cursor, cliente["id"], puesto)
    assert entregar(cursor, cliente["id"], puesto) is not None
    cursor.execute("SELECT clave_hito FROM cupones WHERE usuario_id = %s ORDER BY id", (cliente["id"],))
    assert [f["clave_hito"] for f in cursor.fetchall()] == [f"consumo:{puesto}:1", f"consumo:{puesto}:2"]


def test_pedidos_de_otro_cliente_no_cuentan(cursor, crear_usuario, crear_puesto):
    ana, beto, puesto = crear_usuario(), crear_usuario(), crear_puesto()
    for _ in range(4):
        entregar(cursor, ana["id"], puesto)
    assert entregar(cursor, beto["id"], puesto) is None


# --- validar_y_consumir_cupon ------------------------------------------------------------------
def test_validar_consume_el_cupon_y_calcula_descuento(cursor, crear_usuario, crear_puesto):
    cliente, puesto = crear_usuario(), crear_puesto()
    cupon_id = insertar_cupon(cursor, cliente["id"], monto=15)
    cupon = validar_y_consumir_cupon(cursor, cupon_id, cliente["id"], puesto, Decimal("45.00"))
    assert cupon["descuento"] == Decimal("15.00")
    cursor.execute("SELECT usado FROM cupones WHERE id = %s", (cupon_id,))
    assert cursor.fetchone()["usado"] == 1


def test_validar_rechaza_cupon_inexistente(cursor, crear_usuario, crear_puesto):
    cliente, puesto = crear_usuario(), crear_puesto()
    with pytest.raises(ValueError, match="no existe"):
        validar_y_consumir_cupon(cursor, 9999, cliente["id"], puesto, 100)


def test_validar_rechaza_cupon_ajeno(cursor, crear_usuario, crear_puesto):
    dueno, otro, puesto = crear_usuario(), crear_usuario(), crear_puesto()
    cupon_id = insertar_cupon(cursor, dueno["id"])
    with pytest.raises(ValueError, match="no te pertenece"):
        validar_y_consumir_cupon(cursor, cupon_id, otro["id"], puesto, 100)


def test_validar_rechaza_cupon_usado(cursor, crear_usuario, crear_puesto):
    cliente, puesto = crear_usuario(), crear_puesto()
    cupon_id = insertar_cupon(cursor, cliente["id"], usado=True)
    with pytest.raises(ValueError, match="ya fue usado"):
        validar_y_consumir_cupon(cursor, cupon_id, cliente["id"], puesto, 100)


def test_validar_rechaza_cupon_vencido(cursor, crear_usuario, crear_puesto):
    cliente, puesto = crear_usuario(), crear_puesto()
    cupon_id = insertar_cupon(cursor, cliente["id"], dias=-1)
    with pytest.raises(ValueError, match="vencido"):
        validar_y_consumir_cupon(cursor, cupon_id, cliente["id"], puesto, 100)


def test_validar_rechaza_cupon_de_otro_puesto(cursor, crear_usuario, crear_puesto):
    cliente, puesto_cupon, otro_puesto = crear_usuario(), crear_puesto(), crear_puesto()
    cupon_id = insertar_cupon(cursor, cliente["id"], puesto_id=puesto_cupon, monto=20)
    with pytest.raises(ValueError, match="otro puesto"):
        validar_y_consumir_cupon(cursor, cupon_id, cliente["id"], otro_puesto, 100)
    assert validar_y_consumir_cupon(cursor, cupon_id, cliente["id"], puesto_cupon, 100)["id"] == cupon_id


def test_validar_rechaza_puesto_no_verificado(cursor, crear_usuario, crear_puesto):
    cliente = crear_usuario()
    puesto = crear_puesto(estatus="recomendado")
    cupon_id = insertar_cupon(cursor, cliente["id"])
    with pytest.raises(ValueError, match="verificados"):
        validar_y_consumir_cupon(cursor, cupon_id, cliente["id"], puesto, 100)


@pytest.mark.parametrize("monto,subtotal,acepta", [
    (15, "44.99", False), (15, "45.00", True), (20, "59.99", False), (20, "60.00", True)])
def test_validar_compra_minima_es_3_veces_el_monto(cursor, crear_usuario, crear_puesto, monto, subtotal, acepta):
    cliente, puesto = crear_usuario(), crear_puesto()
    cupon_id = insertar_cupon(cursor, cliente["id"], monto=monto)
    if acepta:
        validar_y_consumir_cupon(cursor, cupon_id, cliente["id"], puesto, subtotal)
    else:
        with pytest.raises(ValueError, match="compra mínima"):
            validar_y_consumir_cupon(cursor, cupon_id, cliente["id"], puesto, subtotal)
        cursor.execute("SELECT usado FROM cupones WHERE id = %s", (cupon_id,))
        assert cursor.fetchone()["usado"] == 0


def test_uso_doble_secuencial_falla_la_segunda_vez(cursor, crear_usuario, crear_puesto):
    cliente, puesto = crear_usuario(), crear_puesto()
    cupon_id = insertar_cupon(cursor, cliente["id"])
    validar_y_consumir_cupon(cursor, cupon_id, cliente["id"], puesto, 100)
    with pytest.raises(ValueError, match="ya fue usado"):
        validar_y_consumir_cupon(cursor, cupon_id, cliente["id"], puesto, 100)


def test_uso_doble_simultaneo_solo_deja_pasar_uno(cursor, crear_usuario, crear_puesto, nueva_conexion):
    cliente, puesto = crear_usuario(), crear_puesto()
    cupon_id = insertar_cupon(cursor, cliente["id"])
    resultados, barrera = [], threading.Barrier(2)

    def intentar():
        conexion = nueva_conexion()
        conexion.autocommit = False
        cur = conexion.cursor(dictionary=True)
        barrera.wait()
        try:
            validar_y_consumir_cupon(cur, cupon_id, cliente["id"], puesto, 100)
            conexion.commit()
            resultados.append("ok")
        except ValueError:
            conexion.rollback()
            resultados.append("rechazado")

    hilos = [threading.Thread(target=intentar) for _ in range(2)]
    for h in hilos:
        h.start()
    for h in hilos:
        h.join(timeout=20)
    assert sorted(resultados) == ["ok", "rechazado"]


# --- listar_cupones_vigentes -------------------------------------------------------------------
def test_listar_solo_vigentes_sin_usar_y_del_usuario(cursor, crear_usuario):
    cliente, otro = crear_usuario(), crear_usuario()
    vigente = insertar_cupon(cursor, cliente["id"], clave="a:1")
    insertar_cupon(cursor, cliente["id"], usado=True, clave="a:2")
    insertar_cupon(cursor, cliente["id"], dias=-1, clave="a:3")
    insertar_cupon(cursor, otro["id"], clave="a:4")
    assert [c["id"] for c in listar_cupones_vigentes(cursor, cliente["id"])] == [vigente]


def test_listar_filtra_por_puesto_aplicable(cursor, crear_usuario, crear_puesto):
    cliente, puesto_a, puesto_b = crear_usuario(), crear_puesto(), crear_puesto()
    general = insertar_cupon(cursor, cliente["id"], clave="a:1")
    de_a = insertar_cupon(cursor, cliente["id"], puesto_id=puesto_a, monto=20, clave="a:2")
    assert {c["id"] for c in listar_cupones_vigentes(cursor, cliente["id"])} == {general, de_a}
    assert {c["id"] for c in listar_cupones_vigentes(cursor, cliente["id"], puesto_a)} == {general, de_a}
    assert {c["id"] for c in listar_cupones_vigentes(cursor, cliente["id"], puesto_b)} == {general}


def test_listar_incluye_el_puesto_en_la_forma_del_contrato(cursor, crear_usuario, crear_puesto):
    cliente, puesto = crear_usuario(), crear_puesto()
    insertar_cupon(cursor, cliente["id"], puesto_id=puesto, monto=20)
    cupon = listar_cupones_vigentes(cursor, cliente["id"])[0]
    assert set(cupon) == {"id", "codigo", "monto", "origen", "puesto", "vence_en"}
    assert cupon["puesto"]["id"] == puesto and cupon["puesto"]["nombre"].startswith("Puesto")


# --- progreso_usuario --------------------------------------------------------------------------
def test_progreso_sin_actividad(cursor, crear_usuario):
    cliente = crear_usuario()
    assert progreso_usuario(cursor, cliente["id"]) == {
        "recomendaciones": {"actual": 0, "meta": 5, "contables_hoy_restantes": 3}, "consumo": []}


def test_progreso_con_valores_intermedios(cursor, crear_usuario, crear_puesto):
    cliente, puesto = crear_usuario(), crear_puesto()
    recomendar(cursor, crear_puesto, cliente["id"])
    recomendar(cursor, crear_puesto, cliente["id"])
    for _ in range(4):
        entregar(cursor, cliente["id"], puesto)
    entregar(cursor, cliente["id"], puesto, total=10)  # no cuenta
    progreso = progreso_usuario(cursor, cliente["id"])
    assert progreso["recomendaciones"] == {"actual": 2, "meta": 5, "contables_hoy_restantes": 1}
    assert [(c["puesto_id"], c["actual"], c["meta"]) for c in progreso["consumo"]] == [(puesto, 4, 5)]


def test_progreso_en_multiplo_del_hito_vuelve_a_cero(cursor, crear_usuario, crear_puesto):
    cliente, puesto = crear_usuario(), crear_puesto()
    for _ in range(5):
        entregar(cursor, cliente["id"], puesto)
    assert progreso_usuario(cursor, cliente["id"])["consumo"][0]["actual"] == 0
