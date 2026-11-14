/** Datos de ejemplo con la forma del contrato compartido. No son negocios ni personas reales. */

export const CATEGORIAS = ['chilaquiles', 'esquites', 'tacos', 'tamales', 'tortas', 'postres', 'bebidas'];

export const PUESTOS = [
  { id: 1, nombre: 'Esquites La Esquina', descripcion: 'Esquites con mayonesa, queso cotija y chile en polvo. Elote asado por pieza.', categoria: 'esquites', latitud: 19.4352, longitud: -99.1412, horario: '17:00 a 23:00', estatus: 'verificado', foto_url: null },
  { id: 2, nombre: 'Tacos Los Cuates', descripcion: 'Tacos al pastor, suadero y campechanos con salsa verde y roja.', categoria: 'tacos', latitud: 19.4284, longitud: -99.1277, horario: '18:00 a 01:00', estatus: 'verificado', foto_url: null },
  { id: 3, nombre: 'Tamales del Mercado', descripcion: 'Tamales de rajas, mole y verde con un atole caliente para acompañar.', categoria: 'tamales', latitud: 19.4391, longitud: -99.1205, horario: '06:00 a 11:00', estatus: 'verificado', foto_url: null },
  { id: 4, nombre: 'Chilaquiles Buen Día', descripcion: 'Chilaquiles verdes o rojos con huevo o pollo, para empezar bien la mañana.', categoria: 'chilaquiles', latitud: 19.4219, longitud: -99.1352, horario: '07:00 a 12:00', estatus: 'verificado', foto_url: null },
  { id: 5, nombre: 'Tortas de la Plaza', descripcion: 'Tortas de milanesa, cochinita y jamón en pan telera recién tostado.', categoria: 'tortas', latitud: 19.4331, longitud: -99.1498, horario: '12:00 a 17:00', estatus: 'recomendado', foto_url: null },
  { id: 6, nombre: 'Churros Santa Clara', descripcion: 'Churros calientes rellenos de cajeta o chocolate.', categoria: 'postres', latitud: 19.4262, longitud: -99.1169, horario: '16:00 a 22:00', estatus: 'recomendado', foto_url: null },
  { id: 7, nombre: 'Atole y Champurrado Don Beto', descripcion: 'Atoles de sabores y champurrado espeso. Ideal para las tardes frías.', categoria: 'bebidas', latitud: 19.4448, longitud: -99.1331, horario: '05:30 a 10:30', estatus: 'recomendado', foto_url: null },
  { id: 8, nombre: 'Esquites y Elotes Reforma', descripcion: 'Elotes preparados y esquites con la salsa de la casa.', categoria: 'esquites', latitud: 19.4268, longitud: -99.1672, horario: '16:00 a 22:30', estatus: 'recomendado', foto_url: null },
];

export const PRODUCTOS = {
  1: [
    { id: 11, nombre: 'Esquite chico', precio: 35, disponible: true },
    { id: 12, nombre: 'Esquite grande', precio: 50, disponible: true },
    { id: 13, nombre: 'Elote asado', precio: 30, disponible: true },
    { id: 14, nombre: 'Esquite con chicharrón', precio: 55, disponible: false },
  ],
  2: [
    { id: 21, nombre: 'Taco al pastor', precio: 18, disponible: true },
    { id: 22, nombre: 'Taco de suadero', precio: 18, disponible: true },
    { id: 23, nombre: 'Campechano', precio: 22, disponible: true },
    { id: 24, nombre: 'Gringa', precio: 45, disponible: true },
  ],
  3: [
    { id: 31, nombre: 'Tamal de rajas', precio: 25, disponible: true },
    { id: 32, nombre: 'Tamal de mole', precio: 25, disponible: true },
    { id: 33, nombre: 'Atole de vainilla', precio: 20, disponible: true },
  ],
  4: [
    { id: 41, nombre: 'Chilaquiles verdes con huevo', precio: 70, disponible: true },
    { id: 42, nombre: 'Chilaquiles rojos con pollo', precio: 80, disponible: true },
    { id: 43, nombre: 'Café de olla', precio: 25, disponible: true },
  ],
};

export const USUARIOS = {
  cliente: { id: 1, nombre: 'Ana', email: 'ana@correo.com', rol: 'cliente', puntos: 120 },
  locatario: { id: 2, nombre: 'Marco', email: 'marco@correo.com', rol: 'locatario', puntos: 40 },
};

const en = (dias) => new Date(Date.now() + dias * 86400000).toISOString();
const hace = (min) => new Date(Date.now() - min * 60000).toISOString();

export const CUPONES = [
  { id: 4, codigo: 'CUP-7K2Q9X', monto: 15, origen: 'recomendacion', puesto: null, vence_en: en(22) },
  { id: 5, codigo: 'CUP-M3N8TW', monto: 20, origen: 'consumo', puesto: { id: 2, nombre: 'Tacos Los Cuates' }, vence_en: en(9) },
];

export const PROGRESO = {
  recomendaciones: { actual: 2, meta: 5, contables_hoy_restantes: 1 },
  consumo: [
    { puesto_id: 2, puesto_nombre: 'Tacos Los Cuates', actual: 4, meta: 5 },
    { puesto_id: 1, puesto_nombre: 'Esquites La Esquina', actual: 1, meta: 5 },
  ],
};

export const PEDIDOS_CLIENTE = [
  { id: 31, codigo_pickup: 'ANT-482', estado: 'listo', subtotal: 70, descuento_aplicado: 0, total: 70, creado_en: hace(14), cupon: null, puesto: { id: 1, nombre: 'Esquites La Esquina' } },
  { id: 30, codigo_pickup: 'ANT-117', estado: 'pendiente', subtotal: 54, descuento_aplicado: 0, total: 54, creado_en: hace(4), cupon: null, puesto: { id: 2, nombre: 'Tacos Los Cuates' } },
  { id: 22, codigo_pickup: 'ANT-305', estado: 'entregado', subtotal: 90, descuento_aplicado: 15, total: 75, creado_en: hace(3000), cupon: { id: 3, codigo: 'CUP-A2B4C6', monto: 15 }, puesto: { id: 2, nombre: 'Tacos Los Cuates' } },
  { id: 19, codigo_pickup: 'ANT-064', estado: 'entregado', subtotal: 105, descuento_aplicado: 0, total: 105, creado_en: hace(9000), cupon: null, puesto: { id: 4, nombre: 'Chilaquiles Buen Día' } },
];

export const PEDIDOS_PUESTO = [
  { id: 41, codigo_pickup: 'ANT-208', estado: 'pendiente', subtotal: 105, descuento_aplicado: 0, total: 105, creado_en: hace(3), cliente: { nombre: 'Ana' }, items: [{ producto_id: 21, nombre: 'Taco al pastor', cantidad: 3, subtotal: 54 }, { producto_id: 24, nombre: 'Gringa', cantidad: 1, subtotal: 45 }, { producto_id: 22, nombre: 'Taco de suadero', cantidad: 1, subtotal: 18 }] },
  { id: 40, codigo_pickup: 'ANT-731', estado: 'pendiente', subtotal: 44, descuento_aplicado: 0, total: 44, creado_en: hace(7), cliente: { nombre: 'Luis' }, items: [{ producto_id: 23, nombre: 'Campechano', cantidad: 2, subtotal: 44 }] },
  { id: 38, codigo_pickup: 'ANT-452', estado: 'listo', subtotal: 90, descuento_aplicado: 15, total: 75, creado_en: hace(18), cliente: { nombre: 'Sofía' }, items: [{ producto_id: 21, nombre: 'Taco al pastor', cantidad: 5, subtotal: 90 }] },
];

export const SUGERENCIAS_IA = [
  { id: 2, nombre: 'Tacos Los Cuates', motivo: 'Está abierto ahora y es una buena opción para esta hora de la noche.' },
  { id: 1, nombre: 'Esquites La Esquina', motivo: 'Un antojo caliente y ligero si hace fresco.' },
];
