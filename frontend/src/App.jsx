import { RouterProvider, createBrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import { UbicacionProvider } from './context/UbicacionContext.jsx';
import AppShell from './components/layout/AppShell.jsx';
import Inicio from './pages/Inicio.jsx';
import Login from './pages/Login.jsx';
import Recomendar from './pages/Recomendar.jsx';
import Puesto from './pages/Puesto.jsx';
import Locatario from './pages/Locatario.jsx';
import Perfil from './pages/Perfil.jsx';
import NoEncontrada from './pages/NoEncontrada.jsx';
import RutaProtegida from './components/auth/RutaProtegida.jsx';

/**
 * Rutas iguales a las vistas que sirve Flask. Solo /login y /registro son públicas: todo lo demás pide
 * iniciar sesión y, al entrar, regresa a la pantalla que la persona quería ver (?next=).
 */
const privada = (elemento) => <RutaProtegida>{elemento}</RutaProtegida>;

const router = createBrowserRouter([
  { path: '/login', element: <Login /> },
  { path: '/registro', element: <Login /> },
  {
    element: privada(<AppShell />),
    children: [
      { path: '/', element: <Inicio /> },
      { path: '/puesto/:id', element: <Puesto /> },
      { path: '/recomendar', element: <Recomendar /> },
      { path: '/locatario', element: <Locatario /> },
      { path: '/perfil', element: <Perfil /> },
      { path: '*', element: <NoEncontrada /> },
    ],
  },
]);

export default function App() {
  return (
    <AuthProvider>
      <UbicacionProvider>
        <RouterProvider router={router} />
      </UbicacionProvider>
    </AuthProvider>
  );
}
