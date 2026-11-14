import { ApiError } from '../api.js';
import { CATEGORIAS, PUESTOS, PRODUCTOS, USUARIOS, RESENAS } from './datos.js';

/**
 * Simula el backend con la forma del contrato. Solo para desarrollo del frontend (VITE_USAR_DUMMY=true).
 * La sesión vive en localStorage; cualquier contraseña de 8 o más caracteres es válida.
 */
const CLAVE_SESION = 'antojitosgo_dummy_sesion';
const LATENCIA_MS = 300;

const estado = {
  puestos: structuredClone(PUESTOS),
  productos: structuredClone(PRODUCTOS),
  resenas: structuredClone(RESENAS),
  propios: new Set([2]),
  siguienteId: 1000,
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

function resumenResenas(puestoId) {
  const lista = estado.resenas[puestoId] ?? [];
  const total = lista.length;
  const promedio = total ? Math.round((lista.reduce((a, r) => a + r.calificacion, 0) / total) * 10) / 10 : null;
  return { total, promedio, lista };
}

export async function responderDummy(metodo, url, cuerpo) {
  await pausa();
  const [ruta] = url.split('?');
  let m;

  if (ruta === '/api/auth/me' && metodo === 'GET') return exigirSesion();

  if (ruta === '/api/auth/login' && metodo === 'POST') {
    if ((cuerpo?.password ?? '').length < 8) throw new ApiError(401, 'Correo o contraseña incorrectos');
    const base = (cuerpo?.email ?? '').toLowerCase().startsWith('marco') ? USUARIOS.locatario : USUARIOS.cliente;
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
    return { puesto, puntos_ganados: 50, puntos_totales: u.puntos + 50, cupon_ganado: null };
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

  if ((m = ruta.match(/^\/api\/puestos\/(\d+)\/resenas$/))) {
    const id = Number(m[1]);
    if (!estado.puestos.some((p) => p.id === id)) throw new ApiError(404, 'No encontramos ese puesto');
    const u = leerSesion();
    if (metodo === 'POST') {
      if (!u) throw new ApiError(401, 'Inicia sesión para continuar');
      if (estado.propios.has(id) && u.rol === 'locatario') throw new ApiError(403, 'No puedes reseñar tu propio puesto');
      const lista = (estado.resenas[id] ??= []);
      const ahora = new Date().toISOString();
      let resena = lista.find((r) => r.usuario_id === u.id);
      const existia = Boolean(resena);
      if (resena) Object.assign(resena, { calificacion: cuerpo.calificacion, comentario: cuerpo.comentario ?? '', actualizado_en: ahora });
      else {
        resena = { id: ++estado.siguienteId, usuario_id: u.id, calificacion: cuerpo.calificacion, comentario: cuerpo.comentario ?? '', autor: u.nombre.split(' ')[0], creado_en: ahora, actualizado_en: ahora };
        lista.unshift(resena);
      }
      const { total, promedio } = resumenResenas(id);
      return { resena, total, promedio, _existia: existia };
    }
    const { total, promedio, lista } = resumenResenas(id);
    return { total, promedio, resenas: lista, mia: u ? lista.find((r) => r.usuario_id === u.id) ?? null : null };
  }

  if ((m = ruta.match(/^\/api\/puestos\/(\d+)$/))) {
    const id = Number(m[1]);
    const puesto = estado.puestos.find((p) => p.id === id);
    if (!puesto) throw new ApiError(404, 'No encontramos ese puesto');
    if (metodo === 'PUT') return Object.assign(puesto, cuerpo);
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

  if (ruta.match(/^\/api\/usuarios\/(\d+)\/perfil$/)) {
    const u = exigirSesion();
    return { ...u };
  }

  throw new ApiError(404, 'No encontramos lo que buscas');
}
