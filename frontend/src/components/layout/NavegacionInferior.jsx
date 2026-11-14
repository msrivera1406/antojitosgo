import { NavLink, useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { enlacesDeNavegacion } from './enlaces.js';

const BASE = 'flex min-h-[3.5rem] flex-1 flex-col items-center justify-center gap-0.5 rounded-suave text-[0.8125rem] font-bold transition active:scale-95';

/** Navegación inferior para móvil: se alcanza con el pulgar. Etiqueta siempre visible junto al icono. */
export default function NavegacionInferior() {
  const { usuario, cerrarSesion } = useAuth();
  const navegar = useNavigate();
  const enlaces = enlacesDeNavegacion(usuario);

  return (
    <nav
      aria-label="Principal"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-tinta-100 bg-white pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <div className="mx-auto flex h-nav max-w-xl items-stretch gap-1 px-2 py-1.5">
        {enlaces.map(({ to, etiqueta, icono: Icono, fin }) => (
          <NavLink
            key={to}
            to={to}
            end={fin}
            className={({ isActive }) => `${BASE} ${isActive ? 'bg-primario-50 text-primario-800' : 'text-tinta-600 hover:bg-tinta-50'}`}
          >
            <Icono className="h-6 w-6" aria-hidden="true" />
            {etiqueta}
          </NavLink>
        ))}
        {usuario && (
          <button
            type="button"
            onClick={async () => {
              await cerrarSesion();
              navegar('/');
            }}
            className={`${BASE} text-tinta-600 hover:bg-tinta-50`}
          >
            <LogOut className="h-6 w-6" aria-hidden="true" />
            Salir
          </button>
        )}
      </div>
    </nav>
  );
}
