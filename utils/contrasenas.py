"""Único punto donde se protegen y se comparan contraseñas.

Para probar tu propio algoritmo, cambia SOLO el cuerpo de estas dos funciones. El resto de la app
(registro, login, pruebas) las usa y no hay que tocarlo.

Hoy usan werkzeug (pbkdf2:sha256 con sal), igual que los datos semilla de database.sql.
Si cambias el algoritmo, las cuentas existentes dejan de poder entrar hasta que regeneres
sus contraseñas con el nuevo `hashear` (docker compose down -v reinicia la BD de ejemplo).
"""
from werkzeug.security import check_password_hash, generate_password_hash


def hashear(password: str) -> str:
    """Devuelve el texto que se guarda en usuarios.password_hash (máximo 255 caracteres)."""
    return generate_password_hash(password)


def verificar(guardado: str, password: str) -> bool:
    """True si `password` corresponde a lo guardado en usuarios.password_hash."""
    return check_password_hash(guardado, password)
