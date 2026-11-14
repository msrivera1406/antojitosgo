import { Link, NavLink, useNavigate } from 'react-router-dom';
import { LogOut, Sparkles } from 'lucide-react';
import Logo from '../ui/Logo.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { enlacesDeNavegacion } from './enlaces.js';

/** Cabecera fija. En pantallas medianas y grandes incluye la navegación; en móvil esta va abajo. */
export default function Encabezado() {
  const { usuario, cerrarSesion } = useAuth();
  const navegar = useNavigate();
  const enlaces = enlacesDeNavegacion(usuario);

  const salir = async () => {
    await cerrarSesion();
    navegar('/');
  };

  return (
    <header className="sticky top-0 z-40 border-b border-tinta-100 bg-white/95">
      <div className="mx-auto flex h-16 w-full max-w-[90rem] items-center justify-between gap-4 px-4 sm:px-6">
        <Link to="/" aria-label="AntojitosGo, ir al inicio" className="rounded-suave">
          <Logo />
        </Link>

        <div className="flex items-center gap-3">
          {usuario && (
            <p className="flex items-center gap-1.5 rounded-full bg-primario-50 px-3 py-1.5 text-etiqueta font-bold text-primario-800">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              <span className="sr-only">Hola {usuario.nombre}, tienes</span>
              {usuario.puntos} <span className="hidden sm:inline">puntos</span>
              <span className="sr-only sm:hidden">puntos</span>
            </p>
          )}

          <nav aria-label="Principal" className="hidden items-center gap-1 md:flex">
            {enlaces.map(({ to, etiqueta, icono: Icono, fin }) => (
              <NavLink
                key={to}
                to={to}
                end={fin}
                className={({ isActive }) =>
                  `inline-flex min-h-toque items-center gap-2 rounded-suave px-3.5 font-bold transition ${
                    isActive ? 'bg-primario-50 text-primario-800' : 'text-tinta-700 hover:bg-tinta-50'
                  }`
                }
              >
                <Icono className="h-5 w-5" aria-hidden="true" />
                {etiqueta}
              </NavLink>
            ))}
            {usuario && (
              <button
                type="button"
                onClick={salir}
                className="inline-flex min-h-toque items-center gap-2 rounded-suave px-3.5 font-bold text-tinta-700 transition hover:bg-tinta-50"
              >
                <LogOut className="h-5 w-5" aria-hidden="true" />
                Salir
              </button>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}
