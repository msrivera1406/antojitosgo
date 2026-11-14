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
    FOREIGN KEY (recomendado_por) REFERENCES usuarios(id) ON DELETE SET NULL,
    INDEX idx_puestos_geo (latitud, longitud)
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


-- Reseñas: una por usuario y puesto (se puede actualizar). Calificación de 1 a 5 y comentario opcional.
CREATE TABLE resenas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    puesto_id INT NOT NULL,
    usuario_id INT NOT NULL,
    calificacion TINYINT NOT NULL,
    comentario VARCHAR(500) NOT NULL DEFAULT '',
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_resena_usuario_puesto (usuario_id, puesto_id),
    INDEX idx_resenas_puesto (puesto_id, creado_en),
    CHECK (calificacion BETWEEN 1 AND 5),
    FOREIGN KEY (puesto_id) REFERENCES puestos(id) ON DELETE CASCADE,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
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
(5, 3, NULL, 'Pan Dulce Don Chucho', 'Conchas, orejas y cuernitos recién horneados.', 'postres', 19.43610000, -99.13860000, '07:00 a 20:00', 'verificado', NULL),
(6, 3, NULL, 'Tortas Plaza Hidalgo', 'Tortas de milanesa, jamón y pierna en el centro de Coyoacán.', 'tortas', 19.34990000, -99.16200000, '12:00 a 20:00', 'verificado', NULL),
(7, NULL, 5, 'Nieves y Aguas Frescas Lupita', 'Nieves de sabores y aguas frescas del día.', 'bebidas', 19.41280000, -99.17350000, '11:00 a 20:00', 'recomendado', NULL),
(8, NULL, 4, 'Elotes Jardín Centenario', 'Elotes y esquites a la salida del jardín.', 'esquites', 19.34890000, -99.16270000, '16:00 a 22:00', 'recomendado', NULL),
-- Puestos en lugares reales de la CDMX (coordenadas de OpenStreetMap). Los negocios son de ejemplo.
(9, 3, NULL, 'Tostadas y Tacos Doña Carmen', 'Tostadas y tacos cerca del Mercado de Coyoacán, calle Ignacio Allende.', 'tacos', 19.35279440, -99.16149720, '09:00 a 17:00', 'verificado', NULL),
(10, 3, NULL, 'Tortas Plaza Santo Domingo', 'Tortas calientes en la Plaza de Santo Domingo, Centro Histórico.', 'tortas', 19.43731120, -99.13391230, '10:00 a 18:00', 'verificado', NULL),
(11, 2, NULL, 'Tacos de Guisado Medellín', 'Tacos de guisado a un lado del Mercado de Medellín, colonia Roma Sur.', 'tacos', 19.41043240, -99.16328980, '08:00 a 15:00', 'verificado', NULL),
(12, 2, NULL, 'Churros Plaza Luis Cabrera', 'Churros recién hechos en la calle Orizaba, junto a la Plaza Luis Cabrera.', 'postres', 19.41632590, -99.15955440, '16:00 a 22:00', 'verificado', NULL),
(13, NULL, 5, 'Aguas Frescas Parque España', 'Aguas frescas del día en el Parque España, colonia Condesa.', 'bebidas', 19.41493540, -99.17141060, '10:00 a 19:00', 'recomendado', NULL),
(14, 3, NULL, 'Elotes Alameda Central', 'Elotes, esquites y botanas preparadas en la Alameda Central.', 'esquites', 19.43571560, -99.14399080, '12:00 a 21:00', 'verificado', NULL),
(15, 3, NULL, 'Tamales y Atole Garibaldi', 'Tamales y atole de madrugada en la Plaza Garibaldi.', 'tamales', 19.44071170, -99.13896230, '19:00 a 02:00', 'verificado', NULL),
(16, 2, NULL, 'Esquites Parque Hundido', 'Esquites y antojitos en el Parque Hundido, sobre Insurgentes Sur.', 'esquites', 19.37819010, -99.17933140, '14:00 a 21:00', 'verificado', NULL),
(17, 2, NULL, 'Tamales Mercado de Jamaica', 'Tamales y guajolotas a la entrada del Mercado de Jamaica, avenida Morelos.', 'tamales', 19.40860250, -99.12270390, '06:00 a 13:00', 'verificado', NULL),
(18, NULL, 4, 'Tacos de la Plaza de las Tres Culturas', 'Tacos de trompo en la Plaza de las Tres Culturas, Tlatelolco.', 'tacos', 19.45164550, -99.13620510, '13:00 a 22:00', 'recomendado', NULL),
(19, NULL, 5, 'Jugos y Aguas Embarcadero Nativitas', 'Jugos y aguas frescas junto al Embarcadero Nuevo Nativitas, Xochimilco.', 'bebidas', 19.25205580, -99.09335010, '09:00 a 18:00', 'recomendado', NULL),
(20, 3, NULL, 'Tortas Biblioteca Central CU', 'Tortas para estudiantes cerca de la Biblioteca Central, Ciudad Universitaria.', 'tortas', 19.33340050, -99.18733120, '08:00 a 17:00', 'verificado', NULL),
(21, NULL, 4, 'Tortas Metro Chapultepec', 'Tortas a la salida del Metro Chapultepec, avenida Vasconcelos.', 'tortas', 19.41981490, -99.17720060, '07:00 a 16:00', 'recomendado', NULL),
(22, 2, NULL, 'Chilaquiles Basílica', 'Chilaquiles para el desayuno cerca de la Basílica de Guadalupe.', 'chilaquiles', 19.48485830, -99.11785710, '06:00 a 12:00', 'verificado', NULL),
(23, 3, NULL, 'Chilaquiles Avenida Querétaro', 'Chilaquiles de desayuno sobre la avenida Querétaro, colonia Roma Norte.', 'chilaquiles', 19.41412370, -99.16459120, '07:30 a 13:00', 'verificado', NULL),
(24, NULL, 5, 'Esquites Parque de los Venados', 'Esquites y dorilocos junto a la estación Parque de los Venados.', 'esquites', 19.37063290, -99.15878200, '16:00 a 22:00', 'recomendado', NULL),
(25, 2, NULL, 'Churros y Chocolate San Ángel', 'Churros con chocolate en la Plaza de San Jacinto, San Ángel.', 'postres', 19.34450270, -99.19231800, '11:00 a 21:00', 'verificado', NULL),
(26, 3, NULL, 'Tacos de Canasta Mercado San Juan', 'Tacos de canasta junto al Mercado de San Juan Ernesto Pugibet.', 'tacos', 19.42995190, -99.14450590, '08:00 a 15:00', 'verificado', NULL),
(27, NULL, 4, 'Raspados y Helados Parque Lincoln', 'Raspados y helados en el Parque Lincoln, Polanco.', 'postres', 19.42952910, -99.19708230, '12:00 a 20:00', 'recomendado', NULL);

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
(25, 8, 'Esquite preparado', 30.00, TRUE),
-- Antojitos (botanas preparadas) en los puestos de esquites y elotes.
(26, 3, 'Dorilocos', 45.00, TRUE),
(27, 3, 'Tostilocos', 45.00, TRUE),
(28, 3, 'Chicharrón preparado', 35.00, TRUE),
(29, 3, 'Esquite con chicharrón', 45.00, TRUE),
(30, 8, 'Dorilocos', 40.00, TRUE),
(31, 8, 'Tostilocos', 40.00, TRUE),
(32, 8, 'Chicharrón preparado', 30.00, TRUE),
(33, 8, 'Churrumais preparados', 30.00, TRUE),
(34, 8, 'Papas locas', 35.00, TRUE),
(35, 9, 'Tostada de tinga', 35.00, TRUE),
(36, 9, 'Tostada de pata', 35.00, TRUE),
(37, 9, 'Tostada de ceviche', 45.00, TRUE),
(38, 9, 'Taco de cochinita', 25.00, TRUE),
(39, 10, 'Torta de jamón', 55.00, TRUE),
(40, 10, 'Torta de milanesa', 70.00, TRUE),
(41, 10, 'Torta de pierna', 70.00, TRUE),
(42, 10, 'Torta cubana', 90.00, TRUE),
(43, 11, 'Taco de rajas con queso', 18.00, TRUE),
(44, 11, 'Taco de chicharrón en salsa verde', 18.00, TRUE),
(45, 11, 'Taco de papas con chorizo', 18.00, TRUE),
(46, 11, 'Orden de 3 tacos surtidos', 50.00, TRUE),
(47, 12, 'Churro relleno de cajeta', 25.00, TRUE),
(48, 12, 'Churro con chocolate', 30.00, TRUE),
(49, 12, 'Orden de 4 churros', 40.00, TRUE),
(50, 12, 'Chocolate caliente', 30.00, TRUE),
(51, 13, 'Agua de jamaica', 25.00, TRUE),
(52, 13, 'Agua de horchata', 25.00, TRUE),
(53, 13, 'Agua de limón con chía', 25.00, TRUE),
(54, 14, 'Elote con mayonesa y queso', 30.00, TRUE),
(55, 14, 'Esquite chico', 30.00, TRUE),
(56, 14, 'Esquite grande', 45.00, TRUE),
(57, 14, 'Dorilocos', 45.00, TRUE),
(58, 14, 'Chicharrón preparado', 35.00, TRUE),
(59, 15, 'Tamal de pollo en salsa verde', 25.00, TRUE),
(60, 15, 'Tamal de rajas con queso', 25.00, TRUE),
(61, 15, 'Tamal oaxaqueño', 45.00, TRUE),
(62, 15, 'Atole de arroz', 30.00, TRUE),
(63, 15, 'Champurrado', 30.00, TRUE),
(64, 16, 'Esquite chico', 30.00, TRUE),
(65, 16, 'Esquite grande', 45.00, TRUE),
(66, 16, 'Elote asado', 35.00, TRUE),
(67, 16, 'Tostilocos', 45.00, TRUE),
(68, 16, 'Papas locas', 35.00, TRUE),
(69, 17, 'Tamal de mole', 25.00, TRUE),
(70, 17, 'Tamal de rajas', 25.00, TRUE),
(71, 17, 'Tamal de dulce', 22.00, TRUE),
(72, 17, 'Atole de guayaba', 28.00, TRUE),
(73, 17, 'Guajolota (torta de tamal)', 40.00, TRUE),
(74, 18, 'Taco al pastor', 20.00, TRUE),
(75, 18, 'Taco de suadero', 20.00, TRUE),
(76, 18, 'Gringa', 40.00, TRUE),
(77, 19, 'Jugo de naranja', 35.00, TRUE),
(78, 19, 'Agua de tamarindo', 25.00, TRUE),
(79, 19, 'Agua de piña', 25.00, TRUE),
(80, 20, 'Torta de jamón', 50.00, TRUE),
(81, 20, 'Torta de milanesa', 65.00, TRUE),
(82, 20, 'Torta de queso de puerco', 55.00, TRUE),
(83, 20, 'Agua fresca', 20.00, TRUE),
(84, 21, 'Torta de pierna', 65.00, TRUE),
(85, 21, 'Torta de jamón', 50.00, TRUE),
(86, 22, 'Chilaquiles verdes', 75.00, TRUE),
(87, 22, 'Chilaquiles rojos', 75.00, TRUE),
(88, 22, 'Chilaquiles con huevo', 85.00, TRUE),
(89, 22, 'Café de olla', 25.00, TRUE),
(90, 23, 'Chilaquiles con pollo', 90.00, TRUE),
(91, 23, 'Chilaquiles divorciados', 90.00, TRUE),
(92, 23, 'Chilaquiles con huevo', 85.00, TRUE),
(93, 23, 'Jugo de naranja', 35.00, TRUE),
(94, 24, 'Esquite chico', 30.00, TRUE),
(95, 24, 'Dorilocos', 40.00, TRUE),
(96, 25, 'Churro tradicional', 20.00, TRUE),
(97, 25, 'Churro relleno de cajeta', 28.00, TRUE),
(98, 25, 'Chocolate caliente', 35.00, TRUE),
(99, 25, 'Orden de 6 churros', 55.00, TRUE),
(100, 26, 'Taco de canasta de papa', 10.00, TRUE),
(101, 26, 'Taco de canasta de frijol', 10.00, TRUE),
(102, 26, 'Taco de canasta de chicharrón', 10.00, TRUE),
(103, 26, 'Orden de 5 tacos surtidos', 45.00, TRUE),
(104, 27, 'Raspado de tamarindo', 30.00, TRUE),
(105, 27, 'Raspado de limón', 30.00, TRUE),
(106, 27, 'Helado de vainilla', 30.00, TRUE);

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

-- Reseñas de ejemplo (clientes Ana y Beto).
INSERT INTO resenas (puesto_id, usuario_id, calificacion, comentario) VALUES
(1, 4, 5, 'Los chilaquiles verdes están deliciosos y la salsa pica lo justo.'),
(1, 5, 4, 'Muy ricos. A la hora del desayuno hay algo de fila.'),
(2, 4, 4, 'El tamal de rajas y el atole de vainilla, muy buena combinación.'),
(3, 5, 5, 'Esquites con todo, porción generosa.');
