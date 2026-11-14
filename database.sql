-- Antojito: esquema de la base de datos.
-- Dueño: Integrante 1. Basado en AntojitoGo.md sección 5 + cambios del contrato compartido (sección 2.1):
--   usuarios.recomendaciones_contadas, puestos.recomendado_por, pedidos.cupon_id y la tabla cupones.
-- Solo se ejecuta con el volumen de MySQL vacío. Para reiniciar: docker compose down -v

SET NAMES utf8mb4;
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


-- ============================================================
-- DATOS SEMILLA (spec 01, tareas 2 y 8; requisito R2)
-- Contraseñas de prueba (guardadas como hash pbkdf2:sha256 de werkzeug):
--   admin@antojito.mx                          -> Admin12345
--   lupe@antojito.mx, chela@antojito.mx        -> Locatario123
--   ana@antojito.mx, beto@antojito.mx          -> Cliente1234
-- ============================================================
INSERT INTO usuarios (id, nombre, email, password_hash, rol, puntos, recomendaciones_contadas) VALUES
(1, 'Admin Antojito', 'admin@antojito.mx', 'pbkdf2:sha256:1000000$pxre5fpmAohpXd54$755154e177cd35e59eab22b1d40fca607bf22151c2a3d1b3867e1515ff687410', 'admin', 0, 0),
(2, 'Lupe Hernández', 'lupe@antojito.mx', 'pbkdf2:sha256:1000000$sL4e3GiOxj55ALEM$051a4495c420280f815f332360c351a55ac7c654734475657dc3d58e8677b782', 'locatario', 0, 0),
(3, 'Chela Ramírez', 'chela@antojito.mx', 'pbkdf2:sha256:1000000$sL4e3GiOxj55ALEM$051a4495c420280f815f332360c351a55ac7c654734475657dc3d58e8677b782', 'locatario', 0, 0),
-- Ana: 250 puntos (Cazador de Garnachas), 4 pedidos entregados en el puesto 1 y un cupón de $15 vigente.
(4, 'Ana Torres', 'ana@antojito.mx', 'pbkdf2:sha256:1000000$6TQAdUdORWjZWnOx$3e867539c757b4fa21d7bc069394ff0c98e7650aaeb9f5c755254c49504e48f7', 'cliente', 250, 5),
(5, 'Beto Morales', 'beto@antojito.mx', 'pbkdf2:sha256:1000000$6TQAdUdORWjZWnOx$3e867539c757b4fa21d7bc069394ff0c98e7650aaeb9f5c755254c49504e48f7', 'cliente', 50, 1);

-- 6 puestos verificados (con propietario) y 2 recomendados (sin propietario, sugeridos por clientes).
INSERT INTO puestos (id, propietario_id, recomendado_por, nombre, descripcion, categoria, latitud, longitud, horario, estatus, foto_url) VALUES
(1, 2, NULL, 'Chilaquiles Doña Chela', 'Chilaquiles verdes y rojos para el desayuno, con salsa recién molida.', 'chilaquiles', 19.41950000, -99.16170000, '07:00 a 12:00', 'verificado', NULL),
(2, 2, NULL, 'Tamales y Atole El Güero', 'Tamales de rajas, mole y dulce con atole caliente.', 'tamales', 19.41680000, -99.15880000, '06:00 a 11:00', 'verificado', NULL),
(3, 2, NULL, 'Esquites Parque México', 'Esquites y elotes con todos los toppings, junto al Parque México.', 'esquites', 19.41130000, -99.17070000, '17:00 a 23:00', 'verificado', NULL),
(4, 3, NULL, 'Tacos de Canasta Zócalo', 'Tacos de canasta de papa, frijol y chicharrón.', 'tacos', 19.43400000, -99.13100000, '08:00 a 16:00', 'verificado', NULL),
(5, 3, NULL, 'Pan Dulce La Esperanza', 'Conchas, orejas y cuernitos recién horneados.', 'postres', 19.43610000, -99.13860000, '07:00 a 20:00', 'verificado', NULL),
(6, 3, NULL, 'Tortas Plaza Hidalgo', 'Tortas de milanesa, jamón y pierna en el centro de Coyoacán.', 'tortas', 19.34990000, -99.16200000, '12:00 a 20:00', 'verificado', NULL),
(7, NULL, 5, 'Nieves y Aguas Frescas Lupita', 'Nieves de sabores y aguas frescas del día.', 'bebidas', 19.41280000, -99.17350000, '11:00 a 20:00', 'recomendado', NULL),
(8, NULL, 4, 'Elotes Jardín Centenario', 'Elotes y esquites a la salida del jardín.', 'esquites', 19.34890000, -99.16270000, '16:00 a 22:00', 'recomendado', NULL);

INSERT INTO productos (id, puesto_id, nombre, precio, disponible) VALUES
(1, 1, 'Chilaquiles verdes', 70.00, TRUE),
(2, 1, 'Chilaquiles rojos', 70.00, TRUE),
(3, 1, 'Chilaquiles con pollo', 85.00, TRUE),
(4, 1, 'Café de olla', 25.00, TRUE),
(5, 2, 'Tamal de rajas', 25.00, TRUE),
(6, 2, 'Tamal de mole', 25.00, TRUE),
(7, 2, 'Tamal dulce', 22.00, TRUE),
(8, 2, 'Atole de champurrado', 30.00, TRUE),
(9, 3, 'Esquite chico', 35.00, TRUE),
(10, 3, 'Esquite grande', 50.00, TRUE),
(11, 3, 'Elote asado', 35.00, TRUE),
(12, 4, 'Taco de canasta de papa', 10.00, TRUE),
(13, 4, 'Taco de canasta de frijol', 10.00, TRUE),
(14, 4, 'Taco de canasta de chicharrón', 10.00, TRUE),
(15, 4, 'Orden de 5 tacos surtidos', 45.00, TRUE),
(16, 5, 'Concha', 18.00, TRUE),
(17, 5, 'Oreja', 20.00, TRUE),
(18, 5, 'Cuernito', 22.00, TRUE),
(19, 6, 'Torta de milanesa', 75.00, TRUE),
(20, 6, 'Torta de jamón', 55.00, TRUE),
(21, 6, 'Torta de pierna', 70.00, TRUE),
(22, 7, 'Nieve de limón', 35.00, TRUE),
(23, 7, 'Agua fresca de jamaica', 25.00, TRUE),
(24, 8, 'Elote preparado', 35.00, TRUE),
(25, 8, 'Esquite preparado', 30.00, TRUE);

-- Cupón vigente de $15 para Ana (hito de recomendaciones: 5 contadas = reco:1). Vale en cualquier puesto verificado.
INSERT INTO cupones (id, usuario_id, puesto_id, codigo, monto, origen, clave_hito, usado, vence_en) VALUES
(1, 4, NULL, 'CUP-7K2Q9X', 15.00, 'recomendacion', 'reco:1', FALSE, DATE_ADD(NOW(), INTERVAL 30 DAY));

-- 4 pedidos entregados de Ana en el puesto 1 (todos con total >= $50): un quinto pedido emite el cupón de consumo de $20.
INSERT INTO pedidos (id, cliente_id, puesto_id, cupon_id, total, descuento_aplicado, estado, codigo_pickup) VALUES
(1, 4, 1, NULL, 95.00, 0.00, 'entregado', 'ANT-101'),
(2, 4, 1, NULL, 140.00, 0.00, 'entregado', 'ANT-214'),
(3, 4, 1, NULL, 85.00, 0.00, 'entregado', 'ANT-337'),
(4, 4, 1, NULL, 155.00, 0.00, 'entregado', 'ANT-452');

INSERT INTO detalle_pedidos (pedido_id, producto_id, cantidad, subtotal) VALUES
(1, 1, 1, 70.00),
(1, 4, 1, 25.00),
(2, 2, 2, 140.00),
(3, 3, 1, 85.00),
(4, 1, 1, 70.00),
(4, 3, 1, 85.00);