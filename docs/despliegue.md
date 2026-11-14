# Despliegue

> Documento en construcción (spec 01, tarea 10). Por ahora solo incluye la parte de base de datos.

## Base de datos

### Reiniciar los datos

`database.sql` solo se ejecuta cuando el volumen de MySQL está vacío. Para volver a cargar el esquema y los datos semilla:

```bash
docker compose down -v
docker compose up --build
```

`down -v` borra el volumen `db_data`, así que se pierden todos los datos actuales.

Los datos se pueden revisar en phpMyAdmin: `http://localhost:8080` (usuario `root`, contraseña `MYSQL_ROOT_PASSWORD` del `.env`).

### Usuarios de prueba

Solo para desarrollo y demo. En un servidor público hay que cambiarlas o borrar estos usuarios.

| Rol | Nombre | Correo | Contraseña | Notas |
|---|---|---|---|---|
| admin | Admin Antojito | `admin@antojito.mx` | `Admin12345` | |
| locatario | Lupe Hernández | `lupe@antojito.mx` | `Locatario123` | Dueña de Chilaquiles Doña Chela, Tamales y Atole El Güero y Esquites Parque México |
| locatario | Chela Ramírez | `chela@antojito.mx` | `Locatario123` | Dueña de Tacos de Canasta Zócalo, Pan Dulce Don Chucho y Tortas Plaza Hidalgo |
| cliente | Ana Torres | `ana@antojito.mx` | `Cliente1234` | 250 puntos, cupón vigente de $15 (`CUP-7K2Q9X`) y 4 pedidos entregados en Chilaquiles Doña Chela. Un pedido más de $50 o más en ese puesto emite el cupón de $20. |
| cliente | Beto Morales | `beto@antojito.mx` | `Cliente1234` | 50 puntos, sin cupones ni pedidos |

El cupón de Ana vence 30 días después de crear la base de datos.

### Generar el hash de una contraseña

Para cambiar una contraseña en `database.sql`:

```bash
docker compose exec web python scripts/generar_hash.py "NuevaContraseña123"
```

### Verificar los datos semilla

```bash
docker compose exec web pytest tests/test_semilla.py
```

La prueba crea `antojito_test` desde `database.sql` y no toca `antojito_db`.