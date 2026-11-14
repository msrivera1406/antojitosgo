-- Puestos de DEMOSTRACIÓN para probar el mapa. No es la semilla oficial del proyecto (esa es de Int. 1).
-- Los nombres y ubicaciones son ficticios y aproximados. Aplicar con:
--   docker compose exec -T db sh -c 'mysql --default-character-set=utf8mb4 -uroot -p"$MYSQL_ROOT_PASSWORD" antojito_db' < scripts/semilla_demo_puestos.sql
-- Es repetible: borra antes los puestos demo con la marca [demo].
SET NAMES utf8mb4;
USE antojito_db;
DELETE FROM puestos WHERE nombre LIKE '[demo]%';
INSERT INTO puestos (nombre, descripcion, categoria, latitud, longitud, horario, estatus) VALUES
('[demo] Esquites del Zócalo',       'Esquites y elotes con todo',      'esquites',    19.43260000, -99.13320000, '17:00 a 23:00', 'verificado'),
('[demo] Tacos de Canasta Madero',   'Tacos sudados de papa y chicharrón','tacos',     19.43330000, -99.13650000, '08:00 a 14:00', 'verificado'),
('[demo] Tamales de la Alameda',     'Tamales verdes, rojos y de rajas', 'tamales',    19.43540000, -99.14190000, '06:00 a 11:00', 'verificado'),
('[demo] Chilaquiles Roma',          'Chilaquiles con pollo o huevo',    'chilaquiles',19.41900000, -99.16200000, '07:00 a 12:00', 'verificado'),
('[demo] Tortas Condesa',            'Tortas de milanesa y cubana',      'tortas',     19.41150000, -99.17400000, '12:00 a 18:00', 'recomendado'),
('[demo] Atole y Pan Coyoacán',      'Atole de masa y pan dulce',        'bebidas',    19.34960000, -99.16200000, '06:00 a 11:00', 'recomendado'),
('[demo] Churros del Ángel',         'Churros rellenos de cajeta',       'postres',    19.42700000, -99.16770000, '16:00 a 22:00', 'verificado'),
('[demo] Tacos al Pastor Texcoco',   'Pastor de trompo',                 'tacos',      19.51610000, -98.88280000, '18:00 a 01:00', 'recomendado');

-- Menús de los puestos verificados (se borran con el puesto por ON DELETE CASCADE).
INSERT INTO productos (puesto_id, nombre, precio, disponible)
SELECT p.id, m.nombre, m.precio, m.disponible FROM puestos p
JOIN (
  SELECT '[demo] Esquites del Zócalo' AS puesto, 'Esquite chico' AS nombre, 35.00 AS precio, TRUE AS disponible
  UNION ALL SELECT '[demo] Esquites del Zócalo', 'Esquite grande', 50.00, TRUE
  UNION ALL SELECT '[demo] Esquites del Zócalo', 'Elote con todo', 40.00, FALSE
  UNION ALL SELECT '[demo] Tacos de Canasta Madero', 'Taco de papa', 8.00, TRUE
  UNION ALL SELECT '[demo] Tacos de Canasta Madero', 'Taco de chicharrón', 8.00, TRUE
  UNION ALL SELECT '[demo] Tamales de la Alameda', 'Tamal verde', 22.00, TRUE
  UNION ALL SELECT '[demo] Tamales de la Alameda', 'Atole de champurrado', 25.00, TRUE
) m ON m.puesto = p.nombre;
