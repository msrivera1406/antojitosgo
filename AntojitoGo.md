# 🌮 ANTOJITO — Especificación Técnica y Prompt Maestro (MVP Hackathon)

> **Instrucción para Agentes de Código / Desarrolladores:** Este documento es la única fuente de verdad (*Single Source of Truth*) para el desarrollo del MVP de **Antojito**. Respeta estrictamente el stack tecnológico, la arquitectura de contenedores Docker, los contratos de API y el esquema de base de datos aquí definidos para garantizar una integración sin fricciones entre los 4 integrantes del equipo.

---

## 1. ¿Qué es Antojito?

**Antojito** es una plataforma web comunitaria con enfoque **Mobile-First** diseñada como el *"Waze de la comida callejera"* en la Ciudad de México (CDMX). Conecta a comensales con puestos informales y semifijos de antojitos mexicanos (esquites, chilaquiles, tamales, tortas, atole, pan dulce, tacos, etc.) mediante un mapa interactivo en tiempo real, un asistente conversacional de voz impulsado por IA contextual, pedidos anticipados para recoger (*pick-up*) y un sistema de lealtad gamificado.

---

## 2. Problemática que Resolvemos

1. **Invisibilidad Digital del Comercio Informal:** Miles de puestos de comida callejera en la CDMX son el corazón gastronómico y económico de sus barrios, pero al no contar con locales comerciales formales ni conocimientos técnicos, no aparecen en plataformas tradicionales como Google Maps, Uber Eats o Rappi.
2. **Fricción en el Descubrimiento y Tiempos de Espera:** Para el comensal es difícil saber qué puestos están abiertos cerca de su ubicación exacta, qué venden o si el clima/horario favorece cierto tipo de antojo, además de enfrentarse a filas sin posibilidad de apartar su comida.
3. **Necesidad de Confianza y Control de Calidad:** Un mapa 100% abierto sin moderación puede llenarse de datos falsos o puestos inexistentes. Se requiere un modelo híbrido donde los locatarios y administradores validen puestos oficiales, mientras la comunidad aporta sugerencias verificables.

---

## 3. Stack Tecnológico y Contenedores (Docker)

* **Contenerización y Orquestación:** **Docker** + **Docker Compose** (3 servicios aislados en una misma red interna: `web` para Flask, `db` para MySQL 8.0 y `phpmyadmin` para administración visual de la BD).
* **Frontend:** HTML5, CSS3, JavaScript puro (**Vanilla JS**) — Diseño **Mobile-First** (optimizado para pantallas verticales de smartphones).
* **Mapas y Geolocalización:** **Leaflet.js** + tiles gratuitos de **OpenStreetMap** + API nativa del navegador (`navigator.geolocation`).
* **Backend:** **Python 3.11** con **Flask** (sirviendo vistas HTML y API REST JSON).
* **Base de Datos:** **MySQL 8.0** administrada mediante **phpMyAdmin** (inicializada automáticamente mediante volumen en `/docker-entrypoint-initdb.d`).
* **Inteligencia Artificial:** **Gemini Live API** (WebSockets bidireccionales en tiempo real para interacción por voz + inyección de contexto dinámico).
* **Clima en Tiempo Real:** API pública **Open-Meteo** (sin necesidad de API Key) para consultar temperatura y lluvia en CDMX.
* **Despliegue / Cloud (AWS Hackathon):** Despliegue directo mediante `docker compose up -d` en una instancia **AWS EC2** (con opción de apuntar a **AWS RDS** para MySQL y **AWS S3** para fotos de puestos).

---

## 4. Arquitectura de Funcionalidades del MVP

### 4.1. Mapa Interactivo y Modelo Híbrido de Puestos
* **Puestos Verificados (`estatus = 'verificado'`):** Dados de alta directamente por los **locatarios** desde su panel o por el equipo **administrador**. Se muestran con un pin destacado (Dorado/Verde), incluyen menú con precios, horarios y habilitan el botón de **Pedir Pick-up**.
* **Recomendaciones de Usuarios (`estatus = 'recomendado'`):** Cualquier usuario puede sugerir un puesto callejero nuevo (nombre, coordenadas seleccionadas en el mapa, categoría, foto y reseña breve). Se muestran con un pin distintivo (Azul/Naranja) bajo la etiqueta *"Recomendación de la comunidad — Pendiente de verificación"*.
* **Filtros y Búsqueda:** Filtrado instantáneo por categoría (`chilaquiles`, `esquites`, `tacos`, `tamales`, `tortas`, `postres`, `bebidas`) y por estatus (`todos`, `verificados`, `recomendados`).

### 4.2. Agente de IA Conversacional Contextual (Gemini Live API)
* Botón flotante de micrófono en la pantalla principal que abre una sesión de audio bidireccional en tiempo real mediante **Gemini Live API**.
* **Contexto Dinámico Inyectado al Agente:** Antes de iniciar la conversación, el backend construye el `system_instruction` con:
  1. **Ubicación actual del usuario** (`lat`, `lng`) y el listado JSON de puestos cercanos extraídos de MySQL.
  2. **Fecha y hora actual** (ej. priorizar tamales, atole y chilaquiles por la mañana; esquites, elotes y tacos por la tarde/noche).
  3. **Clima actual en CDMX** vía Open-Meteo (ej. si llueve o hace frío $< 16^\circ\text{C}$, sugerir bebidas calientes, caldos o pan dulce; si hace calor $> 25^\circ\text{C}$, sugerir aguas frescas, nieves o fruta).
* El agente responde con voz natural recomendando 1 o 2 puestos específicos del mapa y explicando el porqué según el clima, la hora y el antojo.

### 4.3. Sistema de Pedidos (*Pick-up*) y Panel de Locatarios
* **Flujo Cliente (*Pick-up*):** En puestos verificados, el usuario agrega productos al carrito, confirma su pedido y recibe un **código único de 6 caracteres** (ej. `ANT-482`) para mostrar al recoger. *(No hay delivery en el MVP).*
* **Panel de Locatarios:** Autenticación sencilla (`email` y `password`) para dueños de puestos donde pueden:
  * Registrar o editar la información y ubicación de su puesto.
  * Agregar/editar productos de su menú y disponibilidad.
  * Gestionar pedidos entrantes cambiando su estado: `pendiente` $\rightarrow$ `listo` $\rightarrow$ `entregado`.

### 4.4. Sistema de Lealtad Gamificado
* Cada usuario acumula **Puntos Antojito**:
  * **+50 puntos** por enviar una recomendación de puesto comunitario.
  * **+10 puntos** por cada \$50 MXN consumidos en pedidos *pick-up* entregados.
* **Insignias y Canje:** Niveles visuales en el perfil (*Explorador de Banqueta*, *Cazador de Garnachas*, *Maestro del Antojo*) y botón para canjear puntos acumulados por cupones de descuento (ej. `100 pts = $15 MXN de descuento`).

---

## 5. Esquema de Base de Datos (MySQL / phpMyAdmin)

Archivo: `database.sql` (se monta en el contenedor `db` para auto-ejecutarse al iniciar Docker).
Nombre de la base de datos: `antojito_db`

```sql
CREATE DATABASE IF NOT EXISTS antojito_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE antojito_db;

CREATE TABLE usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    email VARCHAR(120) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    rol ENUM('cliente', 'locatario', 'admin') DEFAULT 'cliente',
    puntos INT DEFAULT 0,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE puestos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    propietario_id INT NULL,
    nombre VARCHAR(120) NOT NULL,
    descripcion TEXT,
    categoria VARCHAR(50) NOT NULL,
    latitud DECIMAL(10, 8) NOT NULL,
    longitud DECIMAL(11, 8) NOT NULL,
    horario VARCHAR(100),
    estatus ENUM('verificado', 'recomendado') DEFAULT 'recomendado',
    foto_url VARCHAR(255),
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (propietario_id) REFERENCES usuarios(id) ON DELETE SET NULL
);

CREATE TABLE productos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    puesto_id INT NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    precio DECIMAL(8, 2) NOT NULL,
    disponible BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (puesto_id) REFERENCES puestos(id) ON DELETE CASCADE
);

CREATE TABLE pedidos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    cliente_id INT NOT NULL,
    puesto_id INT NOT NULL,
    total DECIMAL(8, 2) NOT NULL,
    descuento_aplicado DECIMAL(8, 2) DEFAULT 0.00,
    estado ENUM('pendiente', 'listo', 'entregado') DEFAULT 'pendiente',
    codigo_pickup VARCHAR(10) NOT NULL,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (cliente_id) REFERENCES usuarios(id),
    FOREIGN KEY (puesto_id) REFERENCES puestos(id)
);

CREATE TABLE detalle_pedidos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    pedido_id INT NOT NULL,
    producto_id INT NOT NULL,
    cantidad INT NOT NULL,
    subtotal DECIMAL(8, 2) NOT NULL,
    FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE,
    FOREIGN KEY (producto_id) REFERENCES productos(id)
);
```

---

## 6. Arquitectura de Contenedores (`docker-compose.yml`)

* **`web` (Flask App):** Puerto `5000:5000`, volumen montado `.:/app` para *hot-reload* en desarrollo, conectado a `db` mediante el hostname interno `db` (`DB_HOST=db`).
* **`db` (MySQL 8.0):** Puerto `3306:3306`, variables de entorno (`MYSQL_DATABASE=antojito_db`, `MYSQL_ROOT_PASSWORD`), volumen `./database.sql:/docker-entrypoint-initdb.d/init.sql`.
* **`phpmyadmin` (phpMyAdmin):** Puerto `8080:80`, `PMA_HOST=db` para inspección rápida de tablas y datos semilla en `http://localhost:8080`.

---

## 7. Contratos de API REST (Flask)

Todos los endpoints devuelven JSON estándar (`Content-Type: application/json`):

* **Autenticación y Usuarios**
  * `POST /api/auth/registro` — Crea cuenta (`cliente` o `locatario`).
  * `POST /api/auth/login` — Inicia sesión y devuelve datos del usuario, rol y puntos.
  * `GET /api/usuarios/<id>/perfil` — Devuelve puntos acumulados, insignias e historial de pedidos.
* **Puestos y Mapa**
  * `GET /api/puestos?categoria=&estatus=` — Lista puestos con sus coordenadas y estatus (`verificado` / `recomendado`).
  * `GET /api/puestos/<id>` — Devuelve detalle completo del puesto y su lista de `productos`.
  * `POST /api/puestos/recomendar` — Permite a un usuario sugerir un puesto (`estatus='recomendado'`) y le suma `+50` puntos.
  * `POST /api/puestos/crear` — Permite a un `locatario` o `admin` registrar un puesto oficial (`estatus='verificado'`) y sus productos.
* **Pedidos Pick-up y Lealtad**
  * `POST /api/pedidos` — Crea orden *pick-up*, aplica descuento si el usuario canjea puntos, genera `codigo_pickup` y suma puntos por compra.
  * `GET /api/pedidos/puesto/<puesto_id>` — Lista pedidos activos para el panel del locatario.
  * `PATCH /api/pedidos/<id>/estado` — Actualiza estado (`pendiente`, `listo`, `entregado`).
* **Contexto IA (Gemini Live)**
  * `GET /api/ia/contexto?lat=&lng=` — Devuelve el `system_instruction` armado con clima actual (Open-Meteo), fecha/hora y puestos cercanos para inicializar la sesión de Gemini Live API.

---

## 8. Estructura de Carpetas del Proyecto

```text
antojito/
├── Dockerfile              # Imagen Python 3.11-slim + dependencias Flask
├── docker-compose.yml      # Orquestación de servicios: web, db (MySQL) y phpmyadmin
├── .env.example            # Variables de entorno (DB_HOST, GEMINI_API_KEY, AWS_*)
├── app.py                  # Servidor principal Flask y rutas de vistas
├── config.py               # Lectura de variables de entorno para MySQL, Gemini y AWS
├── database.sql            # Script SQL de creación y datos semilla CDMX (auto-init en Docker)
├── requirements.txt        # flask, mysql-connector-python, requests, google-genai, flask-cors
├── routes/
│   ├── auth_routes.py      # Registro, login y perfil/puntos
│   ├── puestos_routes.py   # CRUD puestos, recomendaciones y menú
│   ├── pedidos_routes.py   # Lógica de pick-up y panel locatarios
│   └── ia_routes.py        # Endpoint de contexto dinámico (clima + hora + puestos)
├── static/
│   ├── css/
│   │   └── styles.css      # Estilos Mobile-First
│   ├── js/
│   │   ├── map.js          # Lógica Leaflet + OpenStreetMap + Geolocalización
│   │   ├── gemini_live.js  # Cliente WebSocket para Gemini Live API (audio)
│   │   ├── pickup.js       # Carrito, órdenes pick-up y canje de puntos
│   │   └── locatario.js    # Gestión de menú y órdenes del locatario
│   └── uploads/            # Imágenes de puestos (persistidas vía volumen Docker / S3)
└── templates/
    ├── index.html          # Vista principal: Mapa + Filtros + Botón Gemini Live
    ├── puesto.html         # Detalle del puesto, menú y carrito pick-up
    ├── recomendar.html     # Formulario con pin en mapa para sugerir puesto
    ├── locatario.html      # Dashboard del dueño del puesto
    └── perfil.html         # Puntos, insignias y códigos pick-up activos
```

---

## 9. Distribución de Tareas y Entregables (Equipo de 4 | 3.5 Horas)

### 👤 Integrante 1: DevOps (Docker/AWS), Backend Core & Base de Datos
* **Tareas:**
  1. Escribir `Dockerfile`, `docker-compose.yml` (servicios `web`, `db`, `phpmyadmin`) y `.env.example` para que todo el equipo levante el proyecto con `docker compose up --build`.
  2. Crear `database.sql` con el esquema e insertar **8 a 10 puestos semilla** en CDMX (ej. Roma, Condesa, Centro, Coyoacán) con productos variados, verificando su carga en phpMyAdmin (`localhost:8080`).
  3. Configurar `app.py`, conexión a MySQL (`DB_HOST=db`) y los blueprints `auth_routes.py` y `puestos_routes.py`, además del despliegue de los contenedores en **AWS EC2**.
* **Entregables:** Entorno Docker funcional con un comando + Base de datos poblada + API REST operativa de autenticación y puestos.

### 👤 Integrante 2: Frontend Mobile-First & Mapa Interactivo
* **Tareas:**
  1. Maquetar la estructura base *Mobile-First* (`styles.css`, `index.html`, `recomendar.html`).
  2. Implementar `map.js` con **Leaflet + OpenStreetMap**, centrando automáticamente en la ubicación GPS del usuario.
  3. Diferenciar visualmente pines **Verificados** vs. **Recomendados**, conectar barra de búsqueda/filtros y permitir seleccionar coordenadas haciendo clic en el mapa para recomendar un puesto.
* **Entregables:** Interfaz móvil responsiva + Mapa interactivo funcional con filtros y formulario de recomendación comunitaria conectado al backend.

### 👤 Integrante 3: Agente de IA Conversacional (Gemini Live API)
* **Tareas:**
  1. Implementar `routes/ia_routes.py` consultando la API de clima **Open-Meteo** para CDMX (`lat=19.4326, lon=-99.1332`), fecha/hora del sistema y puestos cercanos en MySQL.
  2. Construir `static/js/gemini_live.js` para capturar audio del micrófono del navegador, transmitirlo vía WebSocket a **Gemini Live API** y reproducir la respuesta de voz en tiempo real.
  3. Integrar el botón flotante de asistente de voz en `index.html` con indicador visual de escucha/respuesta.
* **Entregables:** Asistente de voz conversacional en tiempo real que recomienda puestos del mapa basándose en antojo, clima, hora y cercanía.

### 👤 Integrante 4: Flujo Pick-up, Panel de Locatarios & Lealtad
* **Tareas:**
  1. Implementar `routes/pedidos_routes.py` con la lógica de creación de órdenes *pick-up*, generación de código único, suma de puntos (`+50` por recomendar, `+10` por cada \$50 de compra) y canje de descuentos.
  2. Desarrollar `puesto.html` + `pickup.js` (carrito de compras, aplicación de puntos y pantalla de confirmación con código).
  3. Desarrollar `locatario.html` + `locatario.js` (alta de puesto verificado, gestión de productos y tablero de pedidos en vivo) y `perfil.html` (insignias y puntos).
* **Entregables:** Ciclo completo de pedido *pick-up* cliente $\leftrightarrow$ locatario + Sistema de lealtad gamificado operativo.