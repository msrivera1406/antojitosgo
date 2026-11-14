"""Configuración central. Todo se lee de variables de entorno (ver .env.example)."""
import os


def _int(nombre, defecto):
    return int(os.getenv(nombre, defecto))


# --- Base de datos ---
DB_HOST = os.getenv("DB_HOST", "db")
DB_PORT = _int("DB_PORT", 3306)
DB_NAME = os.getenv("DB_NAME", "antojito_db")  # los tests lo sobreescriben con antojito_test
DB_USER = os.getenv("DB_USER", "root")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")

# --- Flask ---
SECRET_KEY = os.getenv("SECRET_KEY", "dev-inseguro-cambiar-en-env")
COOKIE_SECURE = os.getenv("COOKIE_SECURE", "false").lower() == "true"

# --- Gemini (spec 03) ---
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "")

# --- Dominio ---
CATEGORIAS = ["chilaquiles", "esquites", "tacos", "tamales", "tortas", "postres", "bebidas"]
CDMX_BBOX = {"lat": (19.0, 19.7), "lng": (-99.4, -98.9)}
CDMX_CENTRO = (19.4326, -99.1332)

# --- Fotos ---
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_DIR = os.path.join(BASE_DIR, "static", "uploads")
MAX_UPLOAD_BYTES = 5 * 1024 * 1024

# --- Puntos (solo para el nivel de insignia, no se canjean) ---
PUNTOS_RECOMENDACION = 50
PUNTOS_POR_BLOQUE = 10
MXN_POR_BLOQUE = 50

# --- Cupones por hitos (contrato compartido, sección 2.1). Ajustar aquí la dificultad. ---
HITO_RECOMENDACIONES = 5
CUPON_RECOMENDACION_MXN = 15
MAX_RECOMENDACIONES_CONTABLES_DIA = 3
HITO_CONSUMO = 5
CONSUMO_MIN_MXN = 50
CUPON_CONSUMO_MXN = 20
CUPON_VIGENCIA_DIAS = 30
CUPON_COMPRA_MIN_FACTOR = 3
