import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { rutaLoginConNext } from '../../lib/rutas.js';
import Cargando from '../ui/Cargando.jsx';

/** Exige sesión. Sin ella lleva a /login?next=<ruta actual>. La seguridad real vive en el servidor. */
export default function RutaProtegida({ children }) {
  const { usuario, cargando } = useAuth();
  const { pathname, search } = useLocation();
  if (cargando) return <Cargando texto="Revisando tu sesión" className="min-h-dvh" />;
  if (!usuario) return <Navigate to={rutaLoginConNext(pathname + search)} replace />;
  return children;
}
