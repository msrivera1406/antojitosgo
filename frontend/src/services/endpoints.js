import { apiFetch } from './api.js';

/** Un solo lugar con todas las rutas de la API, para que los componentes no armen URLs. */
export const authApi = {
  me: () => apiFetch('/api/auth/me'),
  login: (cuerpo) => apiFetch('/api/auth/login', { metodo: 'POST', cuerpo }),
  registro: (cuerpo) => apiFetch('/api/auth/registro', { metodo: 'POST', cuerpo }),
  logout: () => apiFetch('/api/auth/logout', { metodo: 'POST' }),
  perfil: (id) => apiFetch(`/api/usuarios/${id}/perfil`),
};

export const puestosApi = {
  listar: () => apiFetch('/api/puestos'),
  categorias: () => apiFetch('/api/puestos/categorias'),
  detalle: (id) => apiFetch(`/api/puestos/${id}`),
  recomendar: (formData) => apiFetch('/api/puestos/recomendar', { metodo: 'POST', formData }),
  crear: (cuerpo) => apiFetch('/api/puestos/crear', { metodo: 'POST', cuerpo }),
  mios: () => apiFetch('/api/puestos/mios'),
  editar: (id, cuerpo) => apiFetch(`/api/puestos/${id}`, { metodo: 'PUT', cuerpo }),
  agregarProducto: (id, cuerpo) => apiFetch(`/api/puestos/${id}/productos`, { metodo: 'POST', cuerpo }),
  editarProducto: (id, cuerpo) => apiFetch(`/api/productos/${id}`, { metodo: 'PATCH', cuerpo }),
};

export const pedidosApi = {
  crear: (cuerpo) => apiFetch('/api/pedidos', { metodo: 'POST', cuerpo }),
  delPuesto: (puestoId, estado) =>
    apiFetch(`/api/pedidos/puesto/${puestoId}${estado ? `?estado=${estado}` : ''}`),
  cambiarEstado: (id, estado) => apiFetch(`/api/pedidos/${id}/estado`, { metodo: 'PATCH', cuerpo: { estado } }),
};

export const cuponesApi = {
  mios: (puestoId) => apiFetch(`/api/cupones/mios${puestoId ? `?puesto_id=${puestoId}` : ''}`),
};

export const iaApi = {
  contexto: (lat, lng) => apiFetch(`/api/ia/contexto?lat=${lat}&lng=${lng}`),
  token: () => apiFetch('/api/ia/token'),
};
