export const MAX_NOMBRE = 120;
export const MAX_RESENA = 500;
export const MAX_FOTO_BYTES = 5 * 1024 * 1024;
export const TIPOS_FOTO = ['image/jpeg', 'image/png', 'image/webp'];

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validarRecomendacion({ nombre, categoria, latitud, longitud, descripcion, foto } = {}) {
  const errores = {};
  const nombreLimpio = (nombre ?? '').trim();
  if (!nombreLimpio) errores.nombre = 'Escribe el nombre del puesto.';
  else if (nombreLimpio.length > MAX_NOMBRE) errores.nombre = `Máximo ${MAX_NOMBRE} caracteres.`;
  if (!categoria) errores.categoria = 'Elige una categoría.';
  if (!Number.isFinite(latitud) || !Number.isFinite(longitud)) {
    errores.ubicacion = 'Marca en el mapa dónde está el puesto.';
  }
  if ((descripcion ?? '').length > MAX_RESENA) errores.descripcion = `Máximo ${MAX_RESENA} caracteres.`;
  if (foto) {
    if (!TIPOS_FOTO.includes(foto.type)) errores.foto = 'La foto debe ser JPG, PNG o WebP.';
    else if (foto.size > MAX_FOTO_BYTES) errores.foto = 'La foto pesa más de 5 MB.';
  }
  return { ok: Object.keys(errores).length === 0, errores };
}

/** modo: 'login' | 'registro' */
export function validarAcceso({ email, password, nombre, rol } = {}, modo = 'login') {
  const errores = {};
  if (!EMAIL.test((email ?? '').trim())) errores.email = 'Escribe un correo válido, por ejemplo ana@correo.com.';
  if ((password ?? '').length < 8) errores.password = 'La contraseña debe tener al menos 8 caracteres.';
  if (modo === 'registro') {
    if (!(nombre ?? '').trim()) errores.nombre = 'Escribe tu nombre.';
    if (rol !== 'cliente' && rol !== 'locatario') errores.rol = 'Elige cómo vas a usar AntojitosGo.';
  }
  return { ok: Object.keys(errores).length === 0, errores };
}

export function validarPuesto({ nombre, categoria, horario, latitud, longitud } = {}) {
  const errores = {};
  if (!(nombre ?? '').trim()) errores.nombre = 'Escribe el nombre del puesto.';
  else if (nombre.trim().length > MAX_NOMBRE) errores.nombre = `Máximo ${MAX_NOMBRE} caracteres.`;
  if (!categoria) errores.categoria = 'Elige una categoría.';
  if (!(horario ?? '').trim()) errores.horario = 'Indica tu horario, por ejemplo 17:00 a 23:00.';
  if (!Number.isFinite(latitud) || !Number.isFinite(longitud)) errores.ubicacion = 'Marca la ubicación en el mapa.';
  return { ok: Object.keys(errores).length === 0, errores };
}

export function validarProducto({ nombre, precio } = {}) {
  const errores = {};
  if (!(nombre ?? '').trim()) errores.nombre = 'Escribe el nombre del producto.';
  const numero = Number(precio);
  if (!Number.isFinite(numero) || numero <= 0) errores.precio = 'El precio debe ser mayor que 0.';
  return { ok: Object.keys(errores).length === 0, errores };
}
