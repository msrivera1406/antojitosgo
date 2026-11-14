import { Outlet, ScrollRestoration } from 'react-router-dom';
import Encabezado from './Encabezado.jsx';
import NavegacionInferior from './NavegacionInferior.jsx';

/** Estructura común: enlace para saltar al contenido, cabecera, contenido y navegación inferior. */
export default function AppShell() {
  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-suave focus:bg-white focus:px-4 focus:py-3 focus:font-bold focus:text-primario-800 focus:shadow-elevada"
      >
        Saltar al contenido
      </a>
      <Encabezado />
      <main id="contenido" tabIndex={-1} className="flex flex-1 flex-col pb-nav focus:outline-none md:pb-0">
        <Outlet />
      </main>
      <NavegacionInferior />
      <ScrollRestoration />
    </div>
  );
}
