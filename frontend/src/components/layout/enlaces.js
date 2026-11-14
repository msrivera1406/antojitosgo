import { Map, User, Store, LogIn } from 'lucide-react';

/** Enlaces de navegación según la sesión. `Salir` se maneja aparte porque es una acción, no una ruta. */
export function enlacesDeNavegacion(usuario) {
  const enlaces = [{ to: '/', etiqueta: 'Mapa', icono: Map, fin: true }];
  if (usuario) enlaces.push({ to: '/perfil', etiqueta: 'Perfil', icono: User });
  if (usuario && (usuario.rol === 'locatario' || usuario.rol === 'admin')) {
    enlaces.push({ to: '/locatario', etiqueta: 'Mi puesto', icono: Store });
  }
  if (!usuario) enlaces.push({ to: '/login', etiqueta: 'Entrar', icono: LogIn });
  return enlaces;
}
