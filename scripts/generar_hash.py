"""Genera el hash de una contraseña para pegarlo en database.sql (spec 01, tarea 8.1).

Uso:
    docker compose exec web python scripts/generar_hash.py "MiContraseña123"
    python scripts/generar_hash.py            # pide la contraseña sin mostrarla

Usa el mismo algoritmo que la app (werkzeug.security), así que el hash sirve con check_password_hash.
"""
import getpass
import sys

from werkzeug.security import generate_password_hash

MIN_LONGITUD = 8


def main(argv):
    if len(argv) > 2:
        print("Uso: python scripts/generar_hash.py [contraseña]", file=sys.stderr)
        return 2
    password = argv[1] if len(argv) == 2 else getpass.getpass("Contraseña: ")
    if len(password) < MIN_LONGITUD:
        print(f"La contraseña debe tener al menos {MIN_LONGITUD} caracteres.", file=sys.stderr)
        return 1
    print(generate_password_hash(password, method="pbkdf2:sha256"))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
