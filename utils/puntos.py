"""Puntos Antojito. Solo suben y definen el nivel de insignia; NO se canjean (ver utils/cupones.py)."""
from decimal import Decimal

import config

NIVELES = [
    (0, "Explorador de Banqueta"),
    (150, "Cazador de Garnachas"),
    (500, "Maestro del Antojo"),
]


def sumar_puntos(cursor, usuario_id, cantidad):
    """Suma puntos y devuelve el saldo nuevo."""
    if cantidad < 0:
        raise ValueError("No se pueden sumar puntos negativos")
    cursor.execute("UPDATE usuarios SET puntos = puntos + %s WHERE id = %s", (cantidad, usuario_id))
    cursor.execute("SELECT puntos FROM usuarios WHERE id = %s", (usuario_id,))
    return cursor.fetchone()["puntos"]


def puntos_por_compra(total):
    """10 puntos por cada $50 completos del total pagado."""
    bloques = int(Decimal(str(total)) // Decimal(config.MXN_POR_BLOQUE))
    return max(0, bloques) * config.PUNTOS_POR_BLOQUE


def obtener_insignia(puntos):
    """Devuelve {nivel, siguiente_nivel, puntos_para_siguiente} (los dos últimos None en el nivel máximo)."""
    indice = 0
    for i, (minimo, _) in enumerate(NIVELES):
        if puntos >= minimo:
            indice = i
    nivel = NIVELES[indice][1]
    if indice + 1 < len(NIVELES):
        minimo_sig, nombre_sig = NIVELES[indice + 1]
        return {"nivel": nivel, "siguiente_nivel": nombre_sig, "puntos_para_siguiente": minimo_sig - puntos}
    return {"nivel": nivel, "siguiente_nivel": None, "puntos_para_siguiente": None}
