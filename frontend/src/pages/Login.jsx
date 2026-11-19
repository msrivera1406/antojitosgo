import { useState } from 'react';
import { useNavigate, useSearchParams, useLocation, Navigate } from 'react-router-dom';
import { MarcaPin } from '../components/ui/Logo.jsx';
import Pestanas from '../components/ui/Pestanas.jsx';
import FormularioAcceso from '../components/auth/FormularioAcceso.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { destinoTrasLogin } from '../lib/rutas.js';
import { useTitulo } from '../hooks/useTitulo.js';
import { USAR_DUMMY } from '../services/config.js';

const PESTANAS = [
  { id: 'login', etiqueta: 'Entrar' },
  { id: 'registro', etiqueta: 'Crear cuenta' },
];

export default function Login() {
  const { pathname } = useLocation();
  const [params] = useSearchParams();
  const navegar = useNavigate();
  const { usuario, iniciarSesion, registrar } = useAuth();
  const [modo, setModo] = useState(pathname === '/registro' ? 'registro' : 'login');
  useTitulo(modo === 'registro' ? 'Crear cuenta' : 'Entrar');

  const next = params.get('next');
  if (usuario) return <Navigate to={destinoTrasLogin(usuario, next)} replace />;

  const enviar = async (datos) => {
    const u = modo === 'registro' ? await registrar(datos) : await iniciarSesion(datos);
    navegar(destinoTrasLogin(u, next), { replace: true });
  };

  return (
    <main id="contenido" className="flex min-h-dvh flex-col justify-center bg-crema-50">
    <div className="pagina-estrecha animate-aparecer space-y-6 py-8">
      <header className="flex flex-col items-center gap-3 text-center">
        <MarcaPin className="h-16 w-16" />
        <h1 className="text-titulo-1">{modo === 'registro' ? 'Crea tu cuenta' : 'Te damos la bienvenida'}</h1>
        <p className="text-tinta-600">
          {modo === 'registro' ? 'Descubre puestos, consulta sus menús, deja reseñas y gana puntos al recomendar.' : 'Inicia sesión para explorar el mapa, consultar menús y dejar reseñas.'}
        </p>
      </header>

      <div className="space-y-5 rounded-panel bg-white p-5 shadow-tarjeta sm:p-6">
        <Pestanas opciones={PESTANAS} activa={modo} onChange={setModo} etiqueta="Acceso" />
        <div role="tabpanel" id={`panel-${modo}`} aria-labelledby={`pestana-${modo}`}>
          <FormularioAcceso key={modo} modo={modo} onEnviar={enviar} />
        </div>
      </div>

      {USAR_DUMMY && (
        <p className="text-center text-etiqueta text-tinta-600">
          Modo de pruebas sin servidor: usa cualquier correo y una contraseña de 8 caracteres o más. Con un correo que empiece con "marco" entras como dueño de puesto.
        </p>
      )}
    </div>
    </main>
  );
}
