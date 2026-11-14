import pytest

from utils.puntos import obtener_insignia, puntos_por_compra


@pytest.mark.parametrize("puntos,nivel", [
    (0, "Explorador de Banqueta"), (149, "Explorador de Banqueta"),
    (150, "Cazador de Garnachas"), (499, "Cazador de Garnachas"),
    (500, "Maestro del Antojo"), (5000, "Maestro del Antojo"),
])
def test_nivel_en_los_bordes(puntos, nivel):
    assert obtener_insignia(puntos)["nivel"] == nivel


def test_siguiente_nivel():
    assert obtener_insignia(100) == {"nivel": "Explorador de Banqueta",
                                     "siguiente_nivel": "Cazador de Garnachas", "puntos_para_siguiente": 50}
    assert obtener_insignia(500)["siguiente_nivel"] is None


@pytest.mark.parametrize("total,esperado", [(0, 0), (49.99, 0), (50, 10), (105, 20), ("149.99", 20), (150, 30)])
def test_puntos_por_compra(total, esperado):
    assert puntos_por_compra(total) == esperado
