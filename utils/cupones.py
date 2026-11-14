"""Cupones por hitos (contrato compartido, sección 2.1). Dueño: Integrante 1 (spec 01, tarea 3.4).

ESQUELETO: solo firmas y reglas. La lógica detallada está en .kiro/specs/01-infra-backend-core/design.md.
Todas las funciones reciben el `cursor` de una transacción abierta con db.db_cursor().
"""

ALFABETO_CODIGO = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"  # sin 0, O, 1, I


def generar_codigo(cursor):
    """'CUP-' + 6 caracteres de ALFABETO_CODIGO, único en la tabla cupones."""
    raise NotImplementedError


def registrar_recomendacion(cursor, usuario_id):
    """Llamar DESPUÉS de insertar el puesto recomendado. Devuelve el cupón emitido o None."""
    raise NotImplementedError


def registrar_consumo(cursor, usuario_id, puesto_id):
    """Llamar tras pasar un pedido a 'entregado'. Devuelve el cupón emitido o None."""
    raise NotImplementedError


def validar_y_consumir_cupon(cursor, cupon_id, usuario_id, puesto_id, subtotal):
    """Valida y marca como usado el cupón. Lanza ValueError con mensaje en español si no procede."""
    raise NotImplementedError


def listar_cupones_vigentes(cursor, usuario_id, puesto_id=None):
    """Cupones sin usar y no vencidos; con puesto_id, solo los aplicables a ese puesto."""
    raise NotImplementedError


def progreso_usuario(cursor, usuario_id):
    """{'recomendaciones': {...}, 'consumo': [...]} para el perfil."""
    raise NotImplementedError
