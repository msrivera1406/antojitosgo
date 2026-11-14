-- Antojito: esquema de la base de datos.
-- Dueño: Integrante 1. Basado en AntojitoGo.md sección 5 + cambios del contrato compartido (sección 2.1):
--   usuarios.recomendaciones_contadas, puestos.recomendado_por, pedidos.cupon_id y la tabla cupones.
-- Solo se ejecuta con el volumen de MySQL vacío. Para reiniciar: docker compose down -v

SET NAMES utf8mb4;  -- evita textos con acentos mal codificados al cargar el script
CREATE DATABASE IF NOT EXISTS antojito_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE antojito_db;

CREATE TABLE usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    email VARCHAR(120) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    rol ENUM('cliente', 'locatario', 'admin') DEFAULT 'cliente',
    puntos INT DEFAULT 0,
    recomendaciones_contadas INT NOT NULL DEFAULT 0,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE puestos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    propietario_id INT NULL,
    recomendado_por INT NULL,
    nombre VARCHAR(120) NOT NULL,
    descripcion TEXT,
    categoria VARCHAR(50) NOT NULL,
    latitud DECIMAL(10, 8) NOT NULL,
    longitud DECIMAL(11, 8) NOT NULL,
    horario VARCHAR(100),
    estatus ENUM('verificado', 'recomendado') DEFAULT 'recomendado',
    foto_url VARCHAR(255),
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (propietario_id) REFERENCES usuarios(id) ON DELETE SET NULL,
    FOREIGN KEY (recomendado_por) REFERENCES usuarios(id) ON DELETE SET NULL
);

CREATE TABLE productos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    puesto_id INT NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    precio DECIMAL(8, 2) NOT NULL,
    disponible BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (puesto_id) REFERENCES puestos(id) ON DELETE CASCADE
);

-- puesto_id NULL = válido en cualquier puesto verificado.
-- clave_hito evita emitir dos veces el mismo cupón: 'reco:<n>' o 'consumo:<puesto_id>:<n>'.
CREATE TABLE cupones (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    puesto_id INT NULL,
    codigo VARCHAR(12) NOT NULL UNIQUE,
    monto DECIMAL(8, 2) NOT NULL,
    origen ENUM('recomendacion', 'consumo') NOT NULL,
    clave_hito VARCHAR(60) NOT NULL,
    usado BOOLEAN NOT NULL DEFAULT FALSE,
    vence_en DATETIME NOT NULL,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_cupon_hito (usuario_id, clave_hito),
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (puesto_id) REFERENCES puestos(id) ON DELETE CASCADE
);

CREATE TABLE pedidos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    cliente_id INT NOT NULL,
    puesto_id INT NOT NULL,
    cupon_id INT NULL,
    total DECIMAL(8, 2) NOT NULL,
    descuento_aplicado DECIMAL(8, 2) DEFAULT 0.00,
    estado ENUM('pendiente', 'listo', 'entregado') DEFAULT 'pendiente',
    codigo_pickup VARCHAR(10) NOT NULL,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (cliente_id) REFERENCES usuarios(id),
    FOREIGN KEY (puesto_id) REFERENCES puestos(id),
    FOREIGN KEY (cupon_id) REFERENCES cupones(id)
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

-- TODO (Int. 1, spec 01 tarea 8): usuarios semilla, 8 a 10 puestos con productos y datos de demostración de cupones.
