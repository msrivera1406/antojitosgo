"""Utilidades geográficas puras (sin base de datos)."""
import math

RADIO_TIERRA_M = 6371008.8


def caja_envolvente(lat, lng, radio_m):
    """Rectángulo (lat_min, lat_max, lng_min, lng_max) que contiene el círculo de `radio_m` metros.

    Sirve para prefiltrar por índice en MySQL antes de calcular la distancia exacta.
    """
    d_lat = math.degrees(radio_m / RADIO_TIERRA_M)
    d_lng = d_lat / math.cos(math.radians(lat))
    return lat - d_lat, lat + d_lat, lng - d_lng, lng + d_lng


def dentro_del_area(lat, lng, bbox):
    """True si (lat, lng) está dentro de `bbox` = {"lat": (min, max), "lng": (min, max)}."""
    return bbox["lat"][0] <= lat <= bbox["lat"][1] and bbox["lng"][0] <= lng <= bbox["lng"][1]
