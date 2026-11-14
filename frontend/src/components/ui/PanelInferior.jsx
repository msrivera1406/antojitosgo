import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import IconoBoton from './IconoBoton.jsx';

/**
 * Panel que sube desde abajo en móvil y se acomoda como tarjeta lateral en pantallas grandes.
 * No es modal: deja el mapa visible detrás. Escape lo cierra y el foco pasa al título al abrir.
 */
export default function PanelInferior({ abierto, onCerrar, titulo, children, className = '' }) {
  const tituloRef = useRef(null);

  useEffect(() => {
    if (!abierto) return undefined;
    tituloRef.current?.focus();
    const alTeclear = (e) => e.key === 'Escape' && onCerrar();
    document.addEventListener('keydown', alTeclear);
    return () => document.removeEventListener('keydown', alTeclear);
  }, [abierto, onCerrar]);

  if (!abierto) return null;
  return (
    <section
      role="dialog"
      aria-label={titulo}
      className={`animate-subir z-30 overflow-y-auto rounded-t-panel bg-white shadow-panel md:rounded-panel md:shadow-elevada ${className}`}
    >
      <div className="sticky top-0 z-10 flex items-center justify-between gap-2 bg-white px-5 pb-1 pt-3">
        <span aria-hidden="true" className="absolute left-1/2 top-2 h-1.5 w-10 -translate-x-1/2 rounded-full bg-tinta-200 md:hidden" />
        <h2 ref={tituloRef} tabIndex={-1} className="mt-2 text-titulo-3 focus:outline-none">
          {titulo}
        </h2>
        <IconoBoton icono={X} etiqueta="Cerrar" onClick={onCerrar} className="mt-2" />
      </div>
      <div className="px-5 pb-6">{children}</div>
    </section>
  );
}
