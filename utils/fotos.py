"""Validación y guardado de fotos de puestos (spec 01, tarea 7.1).

El tipo se decide por los primeros bytes del archivo, no por el nombre ni por el Content-Type.
El archivo se guarda con nombre uuid4 dentro de config.UPLOAD_DIR.
"""
import os
import uuid

import config

URL_BASE = "/static/uploads/"


def detectar_extension(cabecera):
    """'.jpg', '.png' o '.webp' según la firma de bytes; None si no es una imagen admitida."""
    if cabecera.startswith(b"\xff\xd8\xff"):
        return ".jpg"
    if cabecera.startswith(b"\x89PNG\r\n\x1a\n"):
        return ".png"
    if cabecera[:4] == b"RIFF" and cabecera[8:12] == b"WEBP":
        return ".webp"
    return None


def validar_foto(archivo):
    """Lee el archivo subido (werkzeug FileStorage) y devuelve (bytes, extension).

    Lanza ValueError con mensaje en español si pesa más de MAX_UPLOAD_BYTES o no es JPG/PNG/WebP.
    Lee como máximo MAX_UPLOAD_BYTES + 1 bytes, así que un archivo enorme no llena la memoria.
    """
    contenido = archivo.stream.read(config.MAX_UPLOAD_BYTES + 1)
    if len(contenido) > config.MAX_UPLOAD_BYTES:
        raise ValueError("La foto pesa más de 5 MB")
    extension = detectar_extension(contenido[:12])
    if extension is None:
        raise ValueError("La foto debe ser JPG, PNG o WebP")
    return contenido, extension


def guardar_foto(contenido, extension):
    """Escribe los bytes con nombre uuid4 y devuelve la URL pública (/static/uploads/<uuid>.<ext>)."""
    os.makedirs(config.UPLOAD_DIR, exist_ok=True)
    nombre = uuid.uuid4().hex + extension
    with open(os.path.join(config.UPLOAD_DIR, nombre), "wb") as f:
        f.write(contenido)
    return URL_BASE + nombre


def borrar_foto(foto_url):
    """Borra una foto guardada por guardar_foto. Ignora URLs ajenas y archivos que ya no están."""
    if not foto_url or not foto_url.startswith(URL_BASE):
        return
    nombre = os.path.basename(foto_url)
    try:
        os.remove(os.path.join(config.UPLOAD_DIR, nombre))
    except FileNotFoundError:
        pass
