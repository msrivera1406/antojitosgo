import { ApiError } from '../api.js';
import {
  CATEGORIAS, PUESTOS, PRODUCTOS, USUARIOS, CUPONES, PROGRESO, PEDIDOS_CLIENTE, PEDIDOS_PUESTO,
} from './datos.js';

/**
 * Simula el backend con la forma del contrato compartido. Es solo para desarrollo del frontend.
 * La sesión vive en localStorage; cualquier contraseña de 8 o más caracteres es válida.
 */
const CLAVE_SESION = 'antojitosgo_dummy_sesion';
const LATENCIA_MS = 350;

const estado = {
  puestos: structuredClone(PUESTOS),
  productos: structuredClone(PRODUCTOS),
  pedidosCliente: structuredClone(PEDIDOS_CLIENTE),
  pedidosPuesto: structuredClone(PEDIDOS_PUESTO),
  cupones: structuredClone(CUPONES),
  siguienteId: 1000,
  propios: new Set([2]),
};

const pausa = (ms = LATENCIA_MS) => new Promise((r) => setTimeout(r, ms));

function leerSesion() {
  try {
    return JSON.parse(localStorage.getItem(CLAVE_SESION));
  } catch {
    return null;
  }
}
const guardarSesion = (u) => localStorage.setItem(CLAVE_SESION, JSON.stringify(u));
const exigirSesion = () => {
  const u = leerSesion();
  if (!u) throw new ApiError(401, 'Inicia sesión para continuar');
  return u;
};

const nuevoCodigo = () => `ANT-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`;

function perfilDe(usuario) {
  return {
    usuario,
    puntos: usuario.puntos,
    cupones: estado.cupones,
    progreso: PROGRESO,
    pedidos: estado.pedidosCliente,
  };
}

export async function responderDummy(metodo, url, cuerpo) {
  await pausa();
  const [ruta, consulta = ''] = url.split('?');
  const params = new URLSearchParams(consulta);
  let m;

  if (ruta === '/api/auth/me' && metodo === 'GET') return exigirSesion();

  if (ruta === '/api/auth/login' && metodo === 'POST') {
    const email = (cuerpo?.email ?? '').toLowerCase();
    if ((cuerpo?.password ?? '').length < 8) throw new ApiError(401, 'Correo o contraseña incorrectos');
    const base = email.startsWith('marco') ? USUARIOS.locatario : USUARIOS.cliente;
    const usuario = { ...base, email: cuerpo.email };
    guardarSesion(usuario);
    return usuario;
  }

  if (ruta === '/api/auth/registro' && metodo === 'POST') {
    if (cuerpo?.email === USUARIOS.cliente.email) throw new ApiError(409, 'Ese correo ya tiene una cuenta');
    const usuario = { id: ++estado.siguienteId, nombre: cuerpo.nombre, email: cuerpo.email, rol: cuerpo.rol, puntos: 0 };
    guardarSesion(usuario);
    return usuario;
  }

  if (ruta === '/api/auth/logout' && metodo === 'POST') {
    localStorage.removeItem(CLAVE_SESION);
    return { ok: true };
  }

  if (ruta === '/api/puestos/categorias') return CATEGORIAS;
  if (ruta === '/api/puestos' && metodo === 'GET') return estado.puestos;

  if (ruta === '/api/puestos/mios') {
    const u = exigirSesion();
    return u.rol === 'locatario' ? estado.puestos.filter((p) => estado.propios.has(p.id)) : [];
  }

  if (ruta === '/api/puestos/recomendar' && metodo === 'POST') {
    const u = exigirSesion();
    const puesto = {
      id: ++estado.siguienteId,
      nombre: cuerpo.get('nombre'),
      descripcion: cuerpo.get('descripcion') ?? '',
      categoria: cuerpo.get('categoria'),
      latitud: Number(cuerpo.get('latitud')),
      longitud: Number(cuerpo.get('longitud')),
      horario: '',
      estatus: 'recomendado',
      foto_url: null,
    };
    estado.puestos.push(puesto);
    guardarSesion({ ...u, puntos: u.puntos + 50 });
    PROGRESO.recomendaciones.actual = Math.min(PROGRESO.recomendaciones.actual + 1, PROGRESO.recomendaciones.meta);
    const completa = PROGRESO.recomendaciones.actual >= PROGRESO.recomendaciones.meta;
    if (completa) PROGRESO.recomendaciones.actual = 0;
    return {
      puesto,
      puntos_ganados: 50,
      puntos_totales: u.puntos + 50,
      cupon_ganado: completa
        ? { id: 99, codigo: 'CUP-X7H2KD', monto: 15, origen: 'recomendacion', puesto: null, vence_en: new Date(Date.now() + 30 * 86400000).toISOString() }
        : null,
    };
  }

  if (ruta === '/api/puestos/crear' && metodo === 'POST') {
    const u = exigirSesion();
    if (u.rol === 'cliente') throw new ApiError(403, 'No tienes permiso para esta acción');
    const puesto = { id: ++estado.siguienteId, foto_url: null, ...cuerpo, estatus: 'verificado' };
    estado.puestos.push(puesto);
    estado.productos[puesto.id] = [];
    estado.propios.add(puesto.id);
    return puesto;
  }

  if ((m = ruta.match(/^\/api\/puestos\/(\d+)$/))) {
    const id = Number(m[1]);
    const puesto = estado.puestos.find((p) => p.id === id);
    if (!puesto) throw new ApiError(404, 'No encontramos lo que buscas');
    if (metodo === 'PUT') {
      Object.assign(puesto, cuerpo);
      return puesto;
    }
    return { ...puesto, productos: estado.productos[id] ?? [] };
  }

  if ((m = ruta.match(/^\/api\/puestos\/(\d+)\/productos$/)) && metodo === 'POST') {
    const id = Number(m[1]);
    const producto = { id: ++estado.siguienteId, nombre: cuerpo.nombre, precio: Number(cuerpo.precio), disponible: true };
    estado.productos[id] = [...(estado.productos[id] ?? []), producto];
    return producto;
  }

  if ((m = ruta.match(/^\/api\/productos\/(\d+)$/)) && metodo === 'PATCH') {
    const id = Number(m[1]);
    for (const lista of Object.values(estado.productos)) {
      const p = lista.find((x) => x.id === id);
      if (p) return Object.assign(p, cuerpo);
    }
    throw new ApiError(404, 'No encontramos lo que buscas');
  }

  if ((m = ruta.match(/^\/api\/usuarios\/(\d+)\/perfil$/))) return perfilDe(exigirSesion());

  if (ruta === '/api/cupones/mios') {
    exigirSesion();
    const puestoId = Number(params.get('puesto_id'));
    return estado.cupones.filter((c) => !puestoId || !c.puesto || c.puesto.id === puestoId);
  }

  if (ruta === '/api/pedidos' && metodo === 'POST') {
    exigirSesion();
    const puesto = estado.puestos.find((p) => p.id === cuerpo.puesto_id);
    if (!puesto) throw new ApiError(404, 'No encontramos lo que buscas');
    if (puesto.estatus !== 'verificado') throw new ApiError(409, 'Este puesto aún no acepta pedidos');
    const catalogo = estado.productos[puesto.id] ?? [];
    let subtotal = 0;
    const items = cuerpo.items.map((it) => {
      const prod = catalogo.find((p) => p.id === it.producto_id);
      if (!prod || !prod.disponible) throw new ApiError(400, 'Un producto ya no está disponible');
      subtotal += prod.precio * it.cantidad;
      return { producto_id: prod.id, nombre: prod.nombre, cantidad: it.cantidad, subtotal: prod.precio * it.cantidad };
    });
    let cupon = null;
    let descuento = 0;
    if (cuerpo.cupon_id) {
      const c = estado.cupones.find((x) => x.id === cuerpo.cupon_id);
      if (!c) throw new ApiError(400, 'Cupón no válido');
      if (subtotal < c.monto * 3) throw new ApiError(400, `Compra mínima de $${c.monto * 3} para usar este cupón`);
      descuento = Math.min(c.monto, subtotal);
      cupon = { id: c.id, codigo: c.codigo, monto: c.monto };
      estado.cupones = estado.cupones.filter((x) => x.id !== c.id);
    }
    const pedido = {
      id: ++estado.siguienteId, codigo_pickup: nuevoCodigo(), estado: 'pendiente',
      subtotal, descuento_aplicado: descuento, total: subtotal - descuento,
      creado_en: new Date().toISOString(), cupon, puesto: { id: puesto.id, nombre: puesto.nombre }, items,
    };
    estado.pedidosCliente.unshift(pedido);
    return { pedido, cupon_usado: cupon };
  }

  if ((m = ruta.match(/^\/api\/pedidos\/puesto\/(\d+)$/))) {
    const u = exigirSesion();
    if (u.rol === 'cliente') throw new ApiError(403, 'No tienes permiso para esta acción');
    return estado.pedidosPuesto.filter((p) => p.estado !== 'entregado');
  }

  if ((m = ruta.match(/^\/api\/pedidos\/(\d+)\/estado$/)) && metodo === 'PATCH') {
    exigirSesion();
    const pedido = estado.pedidosPuesto.find((p) => p.id === Number(m[1]));
    if (!pedido) throw new ApiError(404, 'No encontramos lo que buscas');
    const siguiente = { pendiente: 'listo', listo: 'entregado' }[pedido.estado];
    if (siguiente !== cuerpo.estado) throw new ApiError(409, 'Ese cambio de estado no es válido');
    pedido.estado = siguiente;
    const puntos = siguiente === 'entregado' ? 10 * Math.floor(pedido.total / 50) : 0;
    return { pedido, puntos_otorgados: puntos, cupon_ganado: null };
  }

  throw new ApiError(404, 'No encontramos lo que buscas');
}
