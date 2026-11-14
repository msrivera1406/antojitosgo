"""Cupones por hitos (contrato compartido, sección 2.1). Dueño: Integrante 1 (spec 01, tarea 3.4).

Todas las funciones reciben el `cursor` de una transacción abierta con db.db_cursor(), así que
lo que hagan queda dentro de la misma transacción que el puesto o el pedido que las llamó.
Los parámetros de dificultad (hitos, montos, vigencia, límites) se leen de config.py.
"""
import secrets
from decimal import Decimal

import config

ALFABETO_CODIGO = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"  # sin 0, O, 1, I
LONGITUD_CODIGO = 6
MAX_INTENTOS_CODIGO = 10


def generar_codigo(cursor):
    """'CUP-' + 6 caracteres de ALFABETO_CODIGO, único en la tabla cupones."""
    for _ in range(MAX_INTENTOS_CODIGO):
        codigo = "CUP-" + "".join(secrets.choice(ALFABETO_CODIGO) for _ in range(LONGITUD_CODIGO))
        cursor.execute("SELECT 1 FROM cupones WHERE codigo = %s", (codigo,))
        if cursor.fetchone() is None:
            return codigo
    raise RuntimeError("No se pudo generar un código de cupón único")


def _bloquear_usuario(cursor, usuario_id):
    """Serializa las emisiones de un mismo usuario para que el conteo del hito sea consistente."""
    cursor.execute("SELECT id FROM usuarios WHERE id = %s FOR UPDATE", (usuario_id,))
    if cursor.fetchone() is None:
        raise ValueError("El usuario no existe.")


def _emitir_cupon(cursor, usuario_id, puesto_id, monto, origen, clave_hito):
    """Inserta el cupón del hito. Devuelve None si ese hito ya había emitido su cupón."""
    cursor.execute(
        "SELECT 1 FROM cupones WHERE usuario_id = %s AND clave_hito = %s", (usuario_id, clave_hito))
    if cursor.fetchone() is not None:
        return None
    codigo = generar_codigo(cursor)
    cursor.execute(
        "INSERT INTO cupones (usuario_id, puesto_id, codigo, monto, origen, clave_hito, vence_en) "
        "VALUES (%s, %s, %s, %s, %s, %s, DATE_ADD(NOW(), INTERVAL %s DAY))",
        (usuario_id, puesto_id, codigo, monto, origen, clave_hito, config.CUPON_VIGENCIA_DIAS))
    return _obtener_cupon(cursor, cursor.lastrowid)


def _obtener_cupon(cursor, cupon_id):
    cursor.execute(
        "SELECT c.id, c.codigo, c.monto, c.origen, c.vence_en, c.puesto_id, p.nombre AS puesto_nombre "
        "FROM cupones c LEFT JOIN puestos p ON p.id = c.puesto_id WHERE c.id = %s", (cupon_id,))
    return _forma_cupon(cursor.fetchone())


def _forma_cupon(fila):
    """Forma JSON del contrato: puesto es None (cualquier puesto) o {id, nombre}."""
    puesto = None
    if fila["puesto_id"] is not None:
        puesto = {"id": fila["puesto_id"], "nombre": fila["puesto_nombre"]}
    return {"id": fila["id"], "codigo": fila["codigo"], "monto": fila["monto"],
            "origen": fila["origen"], "puesto": puesto, "vence_en": fila["vence_en"]}


def _recomendaciones_ultimas_24h(cursor, usuario_id):
    cursor.execute(
        "SELECT COUNT(*) AS n FROM puestos WHERE recomendado_por = %s "
        "AND creado_en >= NOW() - INTERVAL 1 DAY", (usuario_id,))
    return cursor.fetchone()["n"]


def registrar_recomendacion(cursor, usuario_id):
    """Llamar DESPUÉS de insertar el puesto recomendado. Devuelve el cupón emitido o None.

    Solo avanzan el hito las primeras MAX_RECOMENDACIONES_CONTABLES_DIA recomendaciones de las
    últimas 24 h. Las demás se aceptan (y dan puntos en la ruta), pero no cuentan.
    """
    _bloquear_usuario(cursor, usuario_id)
    anteriores = _recomendaciones_ultimas_24h(cursor, usuario_id) - 1  # sin la recién insertada
    if anteriores >= config.MAX_RECOMENDACIONES_CONTABLES_DIA:
        return None
    cursor.execute(
        "UPDATE usuarios SET recomendaciones_contadas = recomendaciones_contadas + 1 WHERE id = %s",
        (usuario_id,))
    cursor.execute("SELECT recomendaciones_contadas FROM usuarios WHERE id = %s", (usuario_id,))
    contadas = cursor.fetchone()["recomendaciones_contadas"]
    if contadas % config.HITO_RECOMENDACIONES != 0:
        return None
    return _emitir_cupon(
        cursor, usuario_id, None, config.CUPON_RECOMENDACION_MXN, "recomendacion",
        f"reco:{contadas // config.HITO_RECOMENDACIONES}")


def _pedidos_que_cuentan(cursor, usuario_id, puesto_id):
    cursor.execute(
        "SELECT COUNT(*) AS n FROM pedidos WHERE cliente_id = %s AND puesto_id = %s "
        "AND estado = 'entregado' AND total >= %s", (usuario_id, puesto_id, config.CONSUMO_MIN_MXN))
    return cursor.fetchone()["n"]


def registrar_consumo(cursor, usuario_id, puesto_id):
    """Llamar tras pasar un pedido a 'entregado'. Devuelve el cupón emitido o None.

    Cuentan los pedidos entregados del usuario en ese puesto con total >= CONSUMO_MIN_MXN. Si el
    pedido recién entregado no llega al mínimo, el conteo no cambia y no se emite nada nuevo
    (la clave del hito impide repetir un cupón ya emitido).
    """
    _bloquear_usuario(cursor, usuario_id)
    cuentan = _pedidos_que_cuentan(cursor, usuario_id, puesto_id)
    if cuentan == 0 or cuentan % config.HITO_CONSUMO != 0:
        return None
    return _emitir_cupon(
        cursor, usuario_id, puesto_id, config.CUPON_CONSUMO_MXN, "consumo",
        f"consumo:{puesto_id}:{cuentan // config.HITO_CONSUMO}")


def validar_y_consumir_cupon(cursor, cupon_id, usuario_id, puesto_id, subtotal):
    """Valida y marca como usado el cupón. Lanza ValueError con mensaje en español si no procede.

    Devuelve el cupón (forma del contrato) con la clave extra `descuento`, que nunca supera el
    subtotal. Debe llamarse dentro de la misma transacción que crea el pedido.
    """
    cursor.execute(
        "SELECT c.id, c.usuario_id, c.puesto_id AS puesto_id, c.codigo, c.monto, c.origen, "
        "c.usado, c.vence_en, (c.vence_en < NOW()) AS vencido, p.nombre AS puesto_nombre "
        "FROM cupones c LEFT JOIN puestos p ON p.id = c.puesto_id WHERE c.id = %s FOR UPDATE",
        (cupon_id,))
    cupon = cursor.fetchone()
    if cupon is None or cupon["usuario_id"] != usuario_id:
        raise ValueError("El cupón no existe o no te pertenece.")
    if cupon["usado"]:
        raise ValueError("Este cupón ya fue usado.")
    if cupon["vencido"]:
        raise ValueError("Este cupón está vencido.")
    if cupon["puesto_id"] is not None and cupon["puesto_id"] != puesto_id:
        raise ValueError("Este cupón solo es válido en otro puesto.")
    cursor.execute("SELECT estatus FROM puestos WHERE id = %s", (puesto_id,))
    puesto = cursor.fetchone()
    if puesto is None or puesto["estatus"] != "verificado":
        raise ValueError("Los cupones solo se pueden usar en puestos verificados.")
    subtotal = Decimal(str(subtotal))
    monto = Decimal(str(cupon["monto"]))
    minimo = monto * config.CUPON_COMPRA_MIN_FACTOR
    if subtotal < minimo:
        raise ValueError(f"La compra mínima para este cupón es ${minimo:.2f}.")
    cursor.execute("UPDATE cupones SET usado = TRUE WHERE id = %s AND usado = FALSE", (cupon_id,))
    if cursor.rowcount != 1:
        raise ValueError("Este cupón ya fue usado.")
    resultado = _forma_cupon(cupon)
    resultado["descuento"] = min(monto, subtotal)
    return resultado


def listar_cupones_vigentes(cursor, usuario_id, puesto_id=None):
    """Cupones sin usar y no vencidos; con puesto_id, solo los aplicables a ese puesto."""
    consulta = (
        "SELECT c.id, c.codigo, c.monto, c.origen, c.vence_en, c.puesto_id, p.nombre AS puesto_nombre "
        "FROM cupones c LEFT JOIN puestos p ON p.id = c.puesto_id "
        "WHERE c.usuario_id = %s AND c.usado = FALSE AND c.vence_en > NOW()")
    parametros = [usuario_id]
    if puesto_id is not None:
        consulta += " AND (c.puesto_id IS NULL OR c.puesto_id = %s)"
        parametros.append(puesto_id)
    cursor.execute(consulta + " ORDER BY c.vence_en, c.id", parametros)
    return [_forma_cupon(f) for f in cursor.fetchall()]


def progreso_usuario(cursor, usuario_id):
    """{'recomendaciones': {...}, 'consumo': [...]} para el perfil (forma del contrato)."""
    cursor.execute("SELECT recomendaciones_contadas FROM usuarios WHERE id = %s", (usuario_id,))
    fila = cursor.fetchone()
    contadas = fila["recomendaciones_contadas"] if fila else 0
    restantes = max(0, config.MAX_RECOMENDACIONES_CONTABLES_DIA
                    - _recomendaciones_ultimas_24h(cursor, usuario_id))
    cursor.execute(
        "SELECT p.id AS puesto_id, p.nombre AS puesto_nombre, COUNT(*) AS n "
        "FROM pedidos o JOIN puestos p ON p.id = o.puesto_id "
        "WHERE o.cliente_id = %s AND o.estado = 'entregado' AND o.total >= %s "
        "GROUP BY p.id, p.nombre ORDER BY p.id", (usuario_id, config.CONSUMO_MIN_MXN))
    consumo = [{"puesto_id": f["puesto_id"], "puesto_nombre": f["puesto_nombre"],
                "actual": f["n"] % config.HITO_CONSUMO, "meta": config.HITO_CONSUMO}
               for f in cursor.fetchall()]
    return {
        "recomendaciones": {"actual": contadas % config.HITO_RECOMENDACIONES,
                            "meta": config.HITO_RECOMENDACIONES,
                            "contables_hoy_restantes": restantes},
        "consumo": consumo,
    }
