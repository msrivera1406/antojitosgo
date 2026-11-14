import { Link } from 'react-router-dom';
import { LoaderCircle } from 'lucide-react';

const BASE =
  'inline-flex min-h-toque select-none items-center justify-center gap-2 rounded-suave px-5 py-2.5 text-base font-bold ' +
  'transition duration-150 active:scale-[0.98] disabled:cursor-not-allowed disabled:active:scale-100';

const VARIANTES = {
  primario:
    'bg-primario-600 text-white shadow-tarjeta hover:bg-primario-700 disabled:bg-tinta-200 disabled:text-tinta-500 disabled:shadow-none',
  secundario:
    'border-2 border-primario-600 bg-white text-primario-700 hover:bg-primario-50 disabled:border-tinta-200 disabled:bg-white disabled:text-tinta-500',
  terciario: 'text-primario-700 hover:bg-primario-50 disabled:text-tinta-400 disabled:hover:bg-transparent',
  peligro: 'bg-peligro text-white hover:bg-red-800 disabled:bg-tinta-200 disabled:text-tinta-500',
};

const TAMANOS = { normal: '', grande: 'min-h-[3.25rem] px-6 text-subtitulo', chico: 'px-3.5 py-1.5 text-etiqueta' };

/**
 * Botón con tres jerarquías (primario, secundario, terciario). Con `to` se comporta como enlace.
 * `cargando` bloquea el botón y muestra un indicador sin cambiar su ancho.
 */
export default function Boton({
  variante = 'primario', tamano = 'normal', cargando = false, icono: Icono, to, className = '',
  children, disabled, type = 'button', ...resto
}) {
  const clases = `${BASE} ${VARIANTES[variante]} ${TAMANOS[tamano]} ${className}`;
  const contenido = (
    <>
      {cargando ? <LoaderCircle className="h-5 w-5 animate-spin" aria-hidden="true" /> : Icono && <Icono className="h-5 w-5" aria-hidden="true" />}
      <span>{children}</span>
    </>
  );
  if (to) {
    return (
      <Link to={to} className={clases} {...resto}>
        {contenido}
      </Link>
    );
  }
  return (
    <button type={type} className={clases} disabled={disabled || cargando} aria-busy={cargando || undefined} {...resto}>
      {contenido}
    </button>
  );
}
