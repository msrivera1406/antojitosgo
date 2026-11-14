# 🌮 Antojito

Plataforma web Mobile-First, el "Waze de la comida callejera" en CDMX. Mapa en tiempo real, asistente de voz con Gemini Live, pedidos pick-up y cupones por hitos.

Fuente de verdad: [`AntojitoGo.md`](AntojitoGo.md) y [`.kiro/steering/antojito-contrato-compartido.md`](.kiro/steering/antojito-contrato-compartido.md). **Si se contradicen, manda el contrato compartido.**

## Arrancar

```bash
cp .env.example .env        # y ajusta valores si hace falta
docker compose up --build
```

| Servicio | URL |
|---|---|
| App Flask | http://localhost:5000 |
| phpMyAdmin | http://localhost:8080 (usuario `root`, contraseña de `MYSQL_ROOT_PASSWORD`) |
| Salud de la API | http://localhost:5000/api/salud |

Para reiniciar la base de datos (el SQL solo corre con el volumen vacío): `docker compose down -v && docker compose up --build`.

Si el puerto 5000 ya está ocupado en tu máquina (por ejemplo AirPlay en macOS), cambia el mapeo `5000:5000` en tu copia local de `docker-compose.yml`, sin subir ese cambio.

## Pruebas

```bash
docker compose exec web pytest                 # backend
node --test static/js/tests/                   # lógica pura del frontend (Node 18+ en tu máquina)
```

## Quién hace qué

Cada integrante tiene su spec en `.kiro/specs/` (requisitos, diseño y tareas). **Solo el dueño edita un archivo.** La tabla completa de propiedad está en el contrato compartido, sección 1.

| Integrante | Spec | Rama |
|---|---|---|
| 1. Infra, backend core y BD | [`01-infra-backend-core`](.kiro/specs/01-infra-backend-core) | `feat/int1-infra` |
| 2. Frontend y mapa | [`02-frontend-mapa`](.kiro/specs/02-frontend-mapa) | `feat/int2-frontend` |
| 3. Agente de IA | [`03-agente-ia`](.kiro/specs/03-agente-ia) | `feat/int3-ia` |
| 4. Pedidos, locatarios y lealtad | [`04-pedidos-locatarios-lealtad`](.kiro/specs/04-pedidos-locatarios-lealtad) | `feat/int4-pedidos` |

### Flujo de Git

```bash
git pull origin main
git checkout -b feat/int2-frontend     # tu rama
# ...trabaja solo en tus archivos, commits pequeños...
git push -u origin feat/int2-frontend
```

Haz merge a `main` seguido (pull request o `git merge`), y antes de empezar cada tarea trae los últimos cambios de `main`. No subas `.env`.

## Qué trae el esqueleto

Ya funciona de punta a punta: Docker (web, MySQL, phpMyAdmin), esquema completo de la BD, `config.py`, `db.py` (`db_cursor`), `utils/auth.py`, `utils/puntos.py`, `utils/respuestas.py`, los cuatro blueprints **vacíos** registrados en `app.py`, las seis vistas con plantillas **placeholder**, y pruebas base. Cada archivo placeholder dice en su primera línea quién es el dueño.

Pendiente de la fase 0 de Int. 1: `utils/cupones.py` (solo tiene firmas), datos semilla en `database.sql` y `tests/conftest.py` con BD de pruebas.

## Cupones (resumen)

Los puntos solo suben el nivel de insignia y **no se canjean**. Los descuentos se ganan con cupones: \$15 cada 5 recomendaciones (máx. 3 contables por día) y \$20 cada 5 pedidos entregados en el mismo puesto. Detalle y parámetros en el contrato compartido, sección 2.1.
