# Spec 01: Infraestructura, Backend core y Base de datos (Integrante 1)

Contexto compartido: `.kiro/steering/antojito-contrato-compartido.md` y `AntojitoGo.md`.

## Introducción

Esta spec deja listo el entorno Docker, la base de datos con datos semilla, el núcleo de Flask (configuración, conexión, errores, sesión) y las APIs de autenticación y puestos. Es la base de las otras tres specs, por eso su primera entrega es la más urgente.

## Requisitos

### R1. Entorno Docker de un comando
**Historia:** Como integrante del equipo, quiero levantar todo con `docker compose up --build`, para que nadie pierda tiempo configurando su máquina.

Criterios de aceptación:
1. CUANDO se ejecute `docker compose up --build` con un `.env` copiado de `.env.example`, EL SISTEMA DEBERÁ iniciar los servicios `web` (puerto 5000), `db` (MySQL 8.0, puerto 3306) y `phpmyadmin` (puerto 8080) en la misma red interna.
2. EL SISTEMA DEBERÁ conectar `web` con `db` mediante el hostname `db` (`DB_HOST=db`).
3. MIENTRAS `db` no acepte conexiones, `web` NO DEBERÁ arrancar. (Healthcheck de `db` y `depends_on: condition: service_healthy`.)
4. EL SISTEMA DEBERÁ montar `./database.sql` en `/docker-entrypoint-initdb.d/init.sql` y `.:/app` en `web` para recarga en caliente.
5. EL SISTEMA DEBERÁ persistir los datos de MySQL en un volumen con nombre y las fotos en `static/uploads/`.
6. `.env.example` DEBERÁ listar `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `MYSQL_ROOT_PASSWORD`, `SECRET_KEY`, `GEMINI_API_KEY`, `GEMINI_MODEL` y las variables `AWS_*` opcionales. `.env` DEBERÁ estar en `.gitignore`.

### R2. Base de datos y datos semilla
**Historia:** Como equipo, quiero una BD con datos realistas de CDMX, para demostrar el producto desde el primer minuto.

1. EL SISTEMA DEBERÁ crear `antojito_db` con las cinco tablas del esquema de `AntojitoGo.md` sección 5, más la tabla `cupones` y las columnas adicionales descritas en la sección 2.1 del contrato compartido (`usuarios.recomendaciones_contadas`, `puestos.recomendado_por`, `pedidos.cupon_id`). NO se modifican los demás nombres de tablas ni columnas.
2. EL SISTEMA DEBERÁ insertar entre 8 y 10 puestos en Roma, Condesa, Centro y Coyoacán, con coordenadas reales de esas zonas.
3. DE los puestos semilla, al menos 6 DEBERÁN ser `verificado`, con al menos 3 productos cada uno, y al menos 2 DEBERÁN ser `recomendado`.
4. LAS 7 categorías válidas DEBERÁN aparecer al menos una vez.
5. EL SISTEMA DEBERÁ insertar usuarios de prueba: 1 `admin`, 2 `locatario` (cada uno dueño de puestos verificados) y 2 `cliente`. Un cliente tendrá 250 puntos, un cupón vigente de $15 y 4 pedidos `entregado` (total de al menos $50) en un puesto verificado, para demostrar el hito de consumo con un solo pedido más. Las contraseñas de prueba se documentan en `docs/despliegue.md` y están hasheadas en el SQL.
6. CUANDO se abra phpMyAdmin en `http://localhost:8080`, LAS tablas y los datos DEBERÁN ser visibles.

### R3. Núcleo de Flask
1. EL SISTEMA DEBERÁ leer toda su configuración de variables de entorno mediante `config.py`, incluida la lista `CATEGORIAS` y el rectángulo geográfico válido de CDMX (lat 19.0 a 19.7, lng -99.4 a -98.9).
2. EL SISTEMA DEBERÁ ofrecer `db.py` con un helper de conexión y un context manager de cursor (ver diseño) que usen consultas parametrizadas.
3. EL SISTEMA DEBERÁ registrar los blueprints `auth`, `puestos`, `pedidos` e `ia`. Los de `pedidos` e `ia` se entregan vacíos para que los llenen los integrantes 4 y 3.
4. EL SISTEMA DEBERÁ servir las vistas `/`, `/puesto/<id>`, `/recomendar`, `/locatario`, `/perfil` y `/login`.
5. CUANDO ocurra un error en una ruta `/api/*` (400, 401, 403, 404, 405, 500), EL SISTEMA DEBERÁ responder `{"error": "..."}` en JSON y NO DEBERÁ exponer trazas.
6. EL SISTEMA DEBERÁ serializar `Decimal` y `datetime` como se define en el contrato compartido.
7. EL SISTEMA DEBERÁ exponer `utils/auth.py` con los decoradores `login_requerido` y `rol_requerido(*roles)`.
8. LA cookie de sesión DEBERÁ ser `HttpOnly` y `SameSite=Lax`.

### R4. Autenticación y perfil
**Historia:** Como usuario, quiero crear cuenta e iniciar sesión, para recomendar puestos y pedir.

1. CUANDO se envíe `POST /api/auth/registro` con `nombre`, `email`, `password` y `rol` (`cliente` o `locatario`) válidos, EL SISTEMA DEBERÁ crear el usuario con contraseña hasheada, iniciar sesión y responder `201` con el objeto Usuario.
2. SI el `email` ya existe, EL SISTEMA DEBERÁ responder `409`.
3. SI la contraseña tiene menos de 8 caracteres, el email no tiene formato válido, falta un campo o el rol es `admin` u otro valor, EL SISTEMA DEBERÁ responder `400`.
4. CUANDO se envíe `POST /api/auth/login` con credenciales correctas, EL SISTEMA DEBERÁ iniciar sesión y responder `200` con Usuario (incluye rol y puntos).
5. SI las credenciales son incorrectas, EL SISTEMA DEBERÁ responder `401` con el mismo mensaje para email inexistente y contraseña errónea.
6. `GET /api/auth/me` DEBERÁ devolver el Usuario en sesión o `401`.
7. `POST /api/auth/logout` DEBERÁ limpiar la sesión y responder `200`.
8. `GET /api/usuarios/<id>/perfil` DEBERÁ exigir sesión y que `<id>` sea el usuario en sesión (o `admin`), si no, `403`. DEBERÁ devolver `puntos`, `insignia` (`nivel`, `siguiente_nivel`, `puntos_para_siguiente`), `cupones` (vigentes y sin usar), `progreso` (hitos de recomendación y de consumo por puesto) y `pedidos` (Pedido sin `items`, del más reciente al más antiguo, con `codigo_pickup`).

### R5. API de puestos
**Historia:** Como comensal, quiero ver y sugerir puestos; como locatario, quiero dar de alta y editar el mío.

1. `GET /api/puestos?categoria=&estatus=` DEBERÁ devolver la lista de Puesto. Los filtros son opcionales. UN valor inválido de `categoria` o `estatus` DEBERÁ responder `400`. `estatus=todos` equivale a no filtrar.
2. `GET /api/puestos/<id>` DEBERÁ devolver el Puesto con sus `productos` (solo `disponible = true` para clientes, todos para el dueño o `admin`), o `404`.
3. `GET /api/puestos/categorias` DEBERÁ devolver la lista de categorías válidas.
4. CUANDO un usuario con sesión envíe `POST /api/puestos/recomendar` (`multipart/form-data`: `nombre`, `categoria`, `latitud`, `longitud`, `descripcion` opcional hasta 500 caracteres, `foto` opcional), EL SISTEMA DEBERÁ crear el puesto con `estatus='recomendado'`, `propietario_id` nulo y `recomendado_por` igual al usuario, sumar 50 puntos y, si la recomendación es contable (máximo 3 por día por usuario, ver contrato compartido 2.1), incrementar `recomendaciones_contadas` y emitir un cupón al llegar a cada múltiplo de 5. TODO en la misma transacción. DEBERÁ responder `201` con `{puesto, puntos_ganados: 50, puntos_totales, cupon_ganado}` (`cupon_ganado` es `null` si no hubo hito).
5. SI faltan campos, la categoría es inválida, las coordenadas están fuera del rectángulo de CDMX, o la foto no es JPG/PNG/WebP o pesa más de 5 MB, EL SISTEMA DEBERÁ responder `400` sin crear nada ni sumar puntos.
6. LA foto DEBERÁ guardarse con nombre `uuid4` y extensión validada por contenido y no por el nombre original, y `foto_url` DEBERÁ ser `/static/uploads/<uuid>.<ext>`.
7. CUANDO un `locatario` o `admin` envíe `POST /api/puestos/crear` (JSON con datos del puesto y lista `productos`), EL SISTEMA DEBERÁ crear el puesto `verificado` con `propietario_id` igual al usuario (el `admin` puede indicar otro `propietario_id`) y sus productos en una sola transacción. UN `cliente` DEBERÁ recibir `403`, un anónimo `401`.
8. `GET /api/puestos/mios` DEBERÁ listar los puestos del usuario en sesión (`locatario`) o todos (`admin`).
9. `PUT /api/puestos/<id>` DEBERÁ permitir editar nombre, descripción, categoría, coordenadas, horario y foto solo al dueño o `admin`, si no, `403`.
10. `POST /api/puestos/<id>/productos` y `PATCH /api/productos/<id>` DEBERÁN permitir crear y editar (nombre, precio > 0, disponible) solo al dueño del puesto o `admin`.

### R6. Utilidades de lealtad
1. EL SISTEMA DEBERÁ ofrecer `utils/puntos.py` con `sumar_puntos`, `puntos_por_compra` y `obtener_insignia`. Los puntos no se restan en ningún flujo.
2. `obtener_insignia` DEBERÁ aplicar los umbrales 0, 150 y 500 del contrato compartido.
3. EL SISTEMA DEBERÁ ofrecer `utils/cupones.py` con la emisión por hitos (`registrar_recomendacion`, `registrar_consumo`), la validación y el consumo de un cupón para un pedido (`validar_y_consumir_cupon`) y el listado de vigentes (`listar_cupones_vigentes`), con las reglas de la sección 2.1 del contrato compartido.
4. LA emisión DEBERÁ ser idempotente: repetir un hito NO DEBERÁ crear un segundo cupón (`UNIQUE (usuario_id, clave_hito)`).
5. EL código de cupón DEBERÁ ser único y generarse con un alfabeto sin caracteres ambiguos, reintentando ante colisión.
6. LOS parámetros de dificultad (hitos, montos, vigencia, límite diario) DEBERÁN leerse de `config.py`.
7. `validar_y_consumir_cupon` DEBERÁ rechazar con `ValueError` y mensaje claro: cupón inexistente o de otro usuario, ya usado, vencido, de otro puesto, o con compra menor al mínimo. DEBERÁ marcarlo `usado` con una actualización condicionada (`WHERE usado = FALSE`) para que dos pedidos simultáneos no lo usen a la vez.

### R7. Despliegue en AWS EC2
1. EL SISTEMA DEBERÁ poder desplegarse en una instancia EC2 con `docker compose up -d` siguiendo `docs/despliegue.md`.
2. LA guía DEBERÁ indicar los puertos del Security Group (22 solo para el equipo, 80/443 públicos; 3306 y 8080 NO públicos).
3. COMO el micrófono y la geolocalización exigen HTTPS, LA guía DEBERÁ describir una solución (Caddy o Nginx con certificado, o un túnel) y esa solución DEBERÁ estar probada antes de la demo.
4. EN producción, `phpmyadmin` NO DEBERÁ quedar expuesto públicamente.

### R8. Pruebas automatizadas
1. EL SISTEMA DEBERÁ incluir `tests/conftest.py` con una BD `antojito_test` creada desde `database.sql`, un `client` de Flask y limpieza de tablas entre pruebas, reutilizable por las specs 03 y 04.
2. LAS rutas de auth y puestos DEBERÁN tener pruebas de camino feliz y de cada error descrito arriba.
3. `docker compose exec web pytest` DEBERÁ ejecutar todas las pruebas del proyecto.
