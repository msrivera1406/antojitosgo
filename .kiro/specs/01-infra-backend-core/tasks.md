# Plan de tareas: Infraestructura, Backend core y BD (Integrante 1)

Marca cada tarea al terminarla. Las tareas de **Fase 0** desbloquean a los demás y deben estar en `main` en los primeros ~30 min.

## Fase 0: Desbloqueo (prioridad máxima)

- [x] 1. Esqueleto Docker
  - [x] 1.1 Escribir `Dockerfile` (python:3.11-slim, instala `requirements.txt`, `CMD flask run --host 0.0.0.0 --debug`)
  - [x] 1.2 Escribir `docker-compose.yml` con `web`, `db` (healthcheck) y `phpmyadmin`
  - [x] 1.3 Crear `.env.example` y `.gitignore` (`.env`, `__pycache__`, `static/uploads/*` salvo `.gitkeep`)
  - [x] 1.4 Crear `requirements.txt` y `requirements-dev.txt`
  - _Requisitos: R1_
- [x] 2. `database.sql`: el **esquema ya está** (con `cupones` y columnas nuevas). Falta añadir usuarios semilla (los puestos llegan en la tarea 8)
  - _Requisitos: R2.1, R2.5_
- [ ] 3. Núcleo mínimo para que otros desarrollen
  - [x] 3.1 `config.py` y `db.py` (`db_cursor`)
  - [x] 3.2 `utils/respuestas.py` (serialización y errores JSON)
  - [x] 3.3 `utils/auth.py` (decoradores)
  - [x] 3.4 `utils/puntos.py` y `utils/cupones.py` (lógica completa, probada en `tests/test_cupones.py`)
  - [x] 3.5 `app.py` con los cuatro blueprints (los de pedidos e ia vacíos) y rutas de vistas que sirven plantillas
  - [ ] 3.6 Avisar al equipo: "rama base lista"
  - _Requisitos: R3, R6_
- [ ] 4. Pruebas de la base
  - [ ] 4.1 `tests/conftest.py` (hay una versión mínima sin BD; falta `antojito_test`) con BD `antojito_test`, fixtures `client`, `crear_usuario`, `login` (**parcial**: ya crea `antojito_test`, `cursor`, `crear_usuario` y `crear_puesto`; falta `login` y apuntar `app` a la BD de pruebas)
  - [x] 4.2 Pruebas de `utils/puntos.py` (bordes de insignias, `puntos_por_compra`)
  - [x] 4.3 `tests/test_cupones.py` (hitos de recomendación y consumo, límite diario, idempotencia, validación y uso doble)
  - _Requisitos: R6, R8.1_

## Fase 1: APIs

- [ ] 5. Autenticación (`routes/auth_routes.py`)
  - [ ] 5.1 `POST /api/auth/registro`
  - [ ] 5.2 `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`
  - [ ] 5.3 `GET /api/usuarios/<id>/perfil` con insignia, cupones vigentes, progreso y pedidos
  - [ ] 5.4 `tests/test_auth.py`
  - _Requisitos: R4, R8.2_
- [ ] 6. Puestos, lectura (`routes/puestos_routes.py`)
  - [ ] 6.1 `GET /api/puestos` con filtros y validación
  - [ ] 6.2 `GET /api/puestos/<id>` y `GET /api/puestos/categorias`
  - [ ] 6.3 Pruebas de lectura
  - _Requisitos: R5.1 a R5.3_
- [ ] 7. Puestos, escritura
  - [ ] 7.1 Helper de validación y guardado de foto (firma de bytes, 5 MB, `uuid4`)
  - [ ] 7.2 `POST /api/puestos/recomendar` (+50 puntos, `recomendado_por`, hito de cupón, todo atómico, limpieza de foto si falla)
  - [ ] 7.3 `POST /api/puestos/crear` con productos en una transacción
  - [ ] 7.4 `GET /api/puestos/mios`, `PUT /api/puestos/<id>`
  - [ ] 7.5 `POST /api/puestos/<id>/productos`, `PATCH /api/productos/<id>`
  - [ ] 7.6 Pruebas de escritura y permisos
  - _Requisitos: R5.4 a R5.10, R8.2_
- [x] 8. Datos semilla
  - [x] 8.1 `scripts/generar_hash.py` y hashes de los usuarios de prueba
  - [x] 8.2 8 a 10 puestos con productos en Roma, Condesa, Centro y Coyoacán, y los datos de demostración de cupones y pedidos entregados (R2.5)
  - [x] 8.3 Verificar la carga en phpMyAdmin (`localhost:8080`) con `docker compose down -v && docker compose up --build`
  - [x] 8.4 Prueba que verifique conteos y cobertura de categorías contra `antojito_test`
  - _Requisitos: R2_
- [ ] 9. `tests/test_paginas.py`: cada vista responde 200 (las plantillas reales llegan de las otras specs; usar `base.html` provisional si hace falta)
  - _Requisitos: R3.4_

## Fase 2: Despliegue

- [ ] 10. `docs/despliegue.md`: preparar EC2, Security Group, clonado, `.env`, `docker compose up -d`, reinicio de datos, usuarios de prueba
  - _Requisitos: R7.1, R7.2_
- [ ] 11. HTTPS para la demo (Caddy o túnel) y prueba del micrófono y GPS desde un celular real
  - _Requisitos: R7.3, R7.4_
- [ ] 12. Despliegue real en EC2 y humo de extremo a extremo con el equipo (registro, mapa, recomendar, pedido, locatario, IA)
  - _Requisitos: R7_

## Fase 3: Cierre

- [ ] 13. Punto de control: `docker compose exec web pytest` pasa completo (incluye pruebas de las specs 03 y 04) y la BD semilla está lista para la demo
  - _Requisitos: R8.3_

## Dependencias con otras specs
* Entregas a Int. 2: `GET /api/puestos`, `/categorias`, `POST /recomendar`, `auth/*`. Acordar JSON del contrato compartido antes de implementar.
* Entregas a Int. 3 y 4: `db_cursor`, `utils/auth.py`, `utils/puntos.py`, `conftest.py` y blueprints vacíos.
* Recibe de Int. 4: nada de código. Solo confirma que `perfil` devuelve `pedidos` con `codigo_pickup` y `estado`.
