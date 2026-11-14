"""Límite de peticiones por clave (IP) con ventana deslizante, en memoria. Dueño: Integrante 3 (spec 03).

Suficiente para un solo proceso (el MVP). Con varios procesos o servidores habría que mover el contador a Redis.
"""
import threading
import time
from collections import deque

MAX_CLAVES = 10_000  # tope de memoria ante muchas IPs distintas


class Limitador:
    def __init__(self, ahora=time.monotonic):
        self._ahora = ahora
        self._eventos = {}
        self._cerrojo = threading.Lock()

    def permitir(self, clave, maximo, ventana_s=60):
        """True si la petición cabe en el límite (y la registra). False si se excedió."""
        ahora = self._ahora()
        with self._cerrojo:
            if len(self._eventos) > MAX_CLAVES:
                self._purgar(ahora, ventana_s)
            cola = self._eventos.setdefault(clave, deque())
            while cola and ahora - cola[0] >= ventana_s:
                cola.popleft()
            if len(cola) >= maximo:
                return False
            cola.append(ahora)
            return True

    def _purgar(self, ahora, ventana_s):
        for clave in [c for c, q in self._eventos.items() if not q or ahora - q[-1] >= ventana_s]:
            del self._eventos[clave]

    def reiniciar(self):
        with self._cerrojo:
            self._eventos.clear()


limitador = Limitador()
