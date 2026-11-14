# Diseño: Infraestructura, Backend core y Base de datos

## Visión general

```
Navegador ──HTTP──▶ web (Flask :5000) ──mysql──▶ db (MySQL 8 :3306) ◀── phpmyadmin (:8080)
                         │
                         └── static/uploads (volumen)
```

Una sola app Flask con cuatro blueprints. El estado de sesión vive en la cookie firmada de Flask. La BD se accede con `mysql-connector-python` y SQL parametrizado, sin ORM.

## Estructura (archivos de esta spec)

```
Dockerfile, docker-compose.yml, .env.example, .gitignore
app.py, config.py, db.py, database.sql
requirements.txt, requirements-dev.txt   # dev: pytest, responses
utils/auth.py, utils/puntos.py, utils/cupones.py, utils/respuestas.py
routes/auth_routes.py, routes/puestos_routes.py
routes/pedidos_routes.py, routes/ia_routes.py   # solo blueprint vacío; el contenido es de Int. 4 y 3
scripts/generar_hash.py                          # genera hashes para los usuarios semilla
docs/despliegue.md
tests/conftest.py, tests/test_auth.py, tests/test_puestos.py, tests/test_cupones.py, tests/test_paginas.py
```

## Interfaces que consumen las otras specs

### `config.py`
```python
DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD   # DB_NAME sobreescribible por tests
SECRET_KEY, GEMINI_API_KEY, GEMINI_MODEL
CATEGORIAS = ["chilaquiles","esquites","tacos","tamales","tortas","postres","bebidas"]
CDMX_BBOX = {"lat": (19.0, 19.7), "lng": (-99.4, -98.9)}
CDMX_CENTRO = (19.4326, -99.1332)
UPLOAD_DIR, MAX_UPLOAD_BYTES = 5 * 1024 * 1024
HITO_RECOMENDACIONES = 5; CUPON_RECOMENDACION_MXN = 15; MAX_RECOMENDACIONES_CONTABLES_DIA = 3
HITO_CONSUMO = 5; CONSUMO_MIN_MXN = 50; CUPON_CONSUMO_MXN = 20
CUPON_VIGENCIA_DIAS = 30; CUPON_COMPRA_MIN_FACTOR = 3
```

### `db.py`
```python
def get_connection(): ...            # conexión nueva (pool pequeño)
@contextmanager
def db_cursor(commit=True):          # yield cursor(dictionary=True); commit al salir, rollback ante excepción
    ...
```
Las transacciones que tocan puntos usan **un solo** `db_cursor`, así que la recomendación y su +50 son atómicos.

### `utils/auth.py`
```python
def usuario_actual() -> dict | None     # {id, rol} desde session
def login_requerido(f)                   # 401 JSON si no hay sesión
def rol_requerido(*roles)                # 401 sin sesión, 403 si el rol no está
def es_dueno_o_admin(cursor, puesto_id, usuario) -> bool
```

### `utils/puntos.py`
```python
PUNTOS_RECOMENDACION = 50
PUNTOS_POR_BLOQUE = 10; MXN_POR_BLOQUE = 50

def sumar_puntos(cursor, usuario_id, cantidad) -> int          # devuelve saldo nuevo
def puntos_por_compra(total) -> int                            # 10 * floor(total / 50)
def obtener_insignia(puntos) -> dict                           # {nivel, siguiente_nivel, puntos_para_siguiente}
```
Los puntos solo suben. No hay `restar_puntos`.

### `utils/cupones.py`
```python
def generar_codigo(cursor) -> str                                      # 'CUP-' + 6 chars de 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
def registrar_recomendacion(cursor, usuario_id) -> dict | None          # llamar DESPUÉS de insertar el puesto
def registrar_consumo(cursor, usuario_id, puesto_id) -> dict | None     # llamar tras pasar el pedido a 'entregado'
def validar_y_consumir_cupon(cursor, cupon_id, usuario_id, puesto_id, subtotal) -> dict
                                                                        # ValueError con mensaje en español; devuelve el cupón ya marcado usado
def listar_cupones_vigentes(cursor, usuario_id, puesto_id=None) -> list[dict]
def progreso_usuario(cursor, usuario_id) -> dict                        # {recomendaciones, consumo[]} para el perfil
```

Lógica de `registrar_recomendacion`:
1. Contar las recomendaciones del usuario en las últimas 24 h (`puestos WHERE recomendado_por = %s AND creado_en >= NOW() - INTERVAL 1 DAY`), **sin** contar la recién insertada. Si ya hay 3 o más, no es contable: devolver `None`.
2. `UPDATE usuarios SET recomendaciones_contadas = recomendaciones_contadas + 1`, y leer el nuevo valor.
3. Si el valor es múltiplo de `HITO_RECOMENDACIONES`, insertar el cupón con `clave_hito = 'reco:<n/5>'` (`INSERT IGNORE` o capturar el error de unicidad). Devolver el cupón o `None`.

Lógica de `registrar_consumo`:
1. Contar `pedidos WHERE cliente_id = %s AND puesto_id = %s AND estado = 'entregado' AND total >= CONSUMO_MIN_MXN` (ya incluye el pedido recién entregado).
2. Si el pedido actual no cumple el mínimo, devolver `None`. Si el contador es múltiplo de `HITO_CONSUMO`, insertar el cupón con `puesto_id` y `clave_hito = 'consumo:<puesto_id>:<n/5>'`.

`validar_y_consumir_cupon`: `SELECT ... FOR UPDATE` del cupón, comprobaciones (dueño, usado, vigencia, puesto, mínimo `subtotal >= CUPON_COMPRA_MIN_FACTOR × monto`) y `UPDATE cupones SET usado = TRUE WHERE id = %s AND usado = FALSE`, verificando `rowcount == 1`.

`progreso_usuario`: recomendaciones = `recomendaciones_contadas % 5` y `contables_hoy_restantes = max(0, 3 - recomendaciones en 24 h)`. Consumo = por puesto con pedidos entregados que cumplen el mínimo, `actual = conteo % 5` (si el conteo es múltiplo de 5 y mayor que 0, `actual = 0`).

### `utils/respuestas.py`
`error(mensaje, codigo)` y un `JSONProvider` que serializa `Decimal` a número y `datetime` a ISO.

## Rutas

| Método y ruta | Auth | Notas |
|---|---|---|
| `POST /api/auth/registro` | No | Valida con regex simple de email, rol en `{cliente, locatario}`. Inicia sesión. |
| `POST /api/auth/login` | No | `check_password_hash`. Mensaje genérico en fallo. Hace `session.clear()` antes de guardar, para evitar fijación de sesión. |
| `POST /api/auth/logout` | No | `session.clear()` |
| `GET /api/auth/me` | Sesión | |
| `GET /api/usuarios/<id>/perfil` | Sesión, dueño o admin | Usa `obtener_insignia`, `listar_cupones_vigentes` y `progreso_usuario` |
| `GET /api/puestos` | No | `WHERE` armado con condiciones opcionales y parámetros |
| `GET /api/puestos/categorias` | No | |
| `GET /api/puestos/mios` | locatario, admin | |
| `GET /api/puestos/<id>` | No | Productos filtrados por `disponible` salvo dueño o admin |
| `POST /api/puestos/recomendar` | Sesión | `multipart`. Valida y guarda foto antes del `INSERT`. Una sola transacción: puesto, +50 puntos, `registrar_recomendacion`. Si falla, borra la foto. Devuelve `cupon_ganado`. |
| `POST /api/puestos/crear` | locatario, admin | JSON, transacción única puesto + productos |
| `PUT /api/puestos/<id>` | Dueño o admin | Solo campos permitidos (lista blanca) |
| `POST /api/puestos/<id>/productos` | Dueño o admin | |
| `PATCH /api/productos/<id>` | Dueño o admin | Resuelve el puesto del producto para verificar dueño |

Orden de rutas: `/api/puestos/categorias`, `/mios` y `/recomendar` se declaran como rutas estáticas, y `<int:id>` va con convertidor, para que no choquen.

## Validación de la foto
1. Revisar tamaño (`request.content_length` y lectura acotada).
2. Detectar tipo por los primeros bytes (firmas JPEG `FFD8FF`, PNG `89504E47`, WebP `RIFF....WEBP`), no por `Content-Type` ni por extensión.
3. Guardar como `uuid4().hex + ext` dentro de `UPLOAD_DIR`. Nunca usar el nombre del cliente.

## Datos semilla (resumen)

| Zona | Puesto | Categoría | Estatus |
|---|---|---|---|
| Roma | Chilaquiles Doña Chela | chilaquiles | verificado |
| Roma | Tamales y Atole El Güero | tamales | verificado |
| Condesa | Esquites Parque México | esquites | verificado |
| Condesa | Nieves y Aguas Frescas Lupita | bebidas | recomendado |
| Centro | Tacos de Canasta Zócalo | tacos | verificado |
| Centro | Pan Dulce La Esperanza | postres | verificado |
| Coyoacán | Tortas Plaza Hidalgo | tortas | verificado |
| Coyoacán | Elotes Jardín Centenario | esquites | recomendado |

Los nombres son ejemplo y pueden cambiar. Las coordenadas deben ser reales y estar dentro de `CDMX_BBOX`.

## Despliegue y HTTPS
* EC2 (Ubuntu), Docker y Docker Compose instalados, repositorio clonado, `.env` creado en el servidor.
* Para HTTPS se recomienda un cuarto contenedor **Caddy** (certificado automático con un dominio) delante de `web`, o `ngrok`/`cloudflared` como plan B para la demo. Es un añadido al compose del servidor, no del equipo, y se documenta en `docs/despliegue.md`.
* `phpmyadmin` y `db` se publican solo en `127.0.0.1` en producción (`ports: "127.0.0.1:8080:80"`).

## Manejo de errores
Un manejador global para `HTTPException` y `Exception` en rutas que empiezan con `/api/` devuelve `{"error": ...}`. Para el resto de rutas se devuelve HTML simple. Los errores de BD se registran en el log del servidor y el cliente recibe un `500` genérico.

## Estrategia de pruebas

| Área | Pruebas |
|---|---|
| `conftest.py` | Crea `antojito_test` desde `database.sql` con el nombre sustituido, fija `DB_NAME`, ofrece `app`, `client`, `crear_usuario(rol)`, `login(client, usuario)` y trunca tablas entre pruebas. |
| `test_auth.py` | Registro feliz, email duplicado, rol `admin` rechazado, contraseña corta, login feliz/erróneo, `me`, `logout`, perfil propio/ajeno/anónimo. |
| `test_puestos.py` | Listado con y sin filtros, filtro inválido, detalle y `404`, recomendar (suma 50, rollback si falla), foto inválida, coordenadas fuera de CDMX, crear como cliente (`403`) y locatario (`201`), editar puesto ajeno (`403`), producto con precio no positivo. |
| `test_puestos.py` (puntos) | `obtener_insignia` en los bordes 0, 149, 150, 499, 500. `puntos_por_compra` en 0, 49.99, 50, 105. |
| `test_cupones.py` | Recomendación 1 a 4 sin cupón y la 5 con cupón de $15. Más de 3 recomendaciones el mismo día: no avanzan el hito pero sí dan puntos. Hito repetido no duplica cupón. Consumo: el 5.º pedido entregado en el mismo puesto emite cupón de $20 con `puesto_id`. Pedidos de menos de $50 no cuentan. Pedidos en puestos distintos no se suman. `validar_y_consumir_cupon`: ajeno, usado, vencido, de otro puesto, bajo el mínimo, uso doble simultáneo (el segundo falla). `progreso_usuario` con valores intermedios. Código con formato `CUP-XXXXXX` sin caracteres ambiguos. |
| `test_paginas.py` | Cada vista responde `200` y contiene `<html`. |

## Riesgos
* **Orden de arranque de MySQL:** el healthcheck evita errores de conexión al inicio.
* **`database.sql` solo se ejecuta con volumen vacío:** documentar `docker compose down -v` para reiniciar los datos.
* **HTTPS en EC2:** sin esto fallan el micrófono y el GPS en la demo. Probar pronto.
