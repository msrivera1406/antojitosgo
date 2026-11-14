from datetime import datetime
from decimal import Decimal

from flask import jsonify


def test_decimal_y_fecha_se_serializan_como_numero_e_iso(app):
    with app.test_request_context():
        datos = jsonify({"precio": Decimal("35.50"), "creado_en": datetime(2025, 1, 31, 14, 5, 0)}).get_json()
    assert datos == {"precio": 35.5, "creado_en": "2025-01-31T14:05:00"}
