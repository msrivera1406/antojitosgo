"""Acceso a MySQL. SQL siempre parametrizado, sin ORM."""
from contextlib import contextmanager

import mysql.connector

import config


def get_connection():
    """Abre una conexión nueva. Quien la use debe cerrarla (preferir db_cursor)."""
    return mysql.connector.connect(
        host=config.DB_HOST,
        port=config.DB_PORT,
        user=config.DB_USER,
        password=config.DB_PASSWORD,
        database=config.DB_NAME,
        charset="utf8mb4",
        collation="utf8mb4_unicode_ci",
        connection_timeout=5,
    )


@contextmanager
def db_cursor(commit=True):
    """Entrega un cursor de diccionarios dentro de UNA transacción.

    Hace commit al salir sin errores y rollback si hay excepción. Todo lo que deba ser
    atómico (por ejemplo pedido + cupón, o recomendación + puntos) va dentro de un solo `with`.
    """
    conexion = get_connection()
    cursor = conexion.cursor(dictionary=True)
    try:
        yield cursor
        if commit:
            conexion.commit()
    except Exception:
        conexion.rollback()
        raise
    finally:
        cursor.close()
        conexion.close()
