import { useEffect, useMemo, useRef, useState } from 'react';
import { Navigation, Share2 } from 'lucide-react';
import Boton from '../ui/Boton.jsx';
import { detectarPlataforma, opcionesNavegacion } from '../../lib/navegacion.js';

const CLASE_OPCION =
  'flex min-h-toque w-full items-center gap-2 px-4 text-left font-bold text-primario-800 hover:bg-primario-50';

/** "Cómo llegar": menú sobre el botón con Google Maps, Waze o la app del sistema, y Compartir si el navegador lo permite. */
export default function ComoLlegar({ puesto }) {
  const [abierto, setAbierto] = useState(false);
  const raiz = useRef(null);
  const opciones = useMemo(
    () =>
      opcionesNavegacion(
        { lat: puesto.latitud, lng: puesto.longitud, nombre: puesto.nombre },
        detectarPlataforma({ userAgent: navigator.userAgent, maxTouchPoints: navigator.maxTouchPoints }),
      ),
    [puesto.latitud, puesto.longitud, puesto.nombre],
  );

  // Se cierra con Escape o al tocar fuera.
  useEffect(() => {
    if (!abierto) return undefined;
    const alTeclear = (e) => e.key === 'Escape' && setAbierto(false);
    const alTocar = (e) => !raiz.current?.contains(e.target) && setAbierto(false);
    document.addEventListener('keydown', alTeclear);
    document.addEventListener('pointerdown', alTocar);
    return () => {
      document.removeEventListener('keydown', alTeclear);
      document.removeEventListener('pointerdown', alTocar);
    };
  }, [abierto]);

  const compartir = async () => {
    setAbierto(false);
    try {
      await navigator.share({ title: puesto.nombre, text: `${puesto.nombre} en AntojitosGo`, url: opciones[0].url });
    } catch (e) {
      if (e.name !== 'AbortError') console.warn('No se pudo compartir');
    }
  };

  return (
    <div ref={raiz} className="relative">
      <Boton variante="secundario" icono={Navigation} aria-expanded={abierto} aria-haspopup="true" onClick={() => setAbierto((v) => !v)}>
        Cómo llegar
      </Boton>
      {abierto && (
        <ul className="absolute bottom-full left-0 z-20 mb-2 w-56 divide-y divide-tinta-100 overflow-hidden rounded-suave border border-tinta-200 bg-white shadow-elevada">
          {opciones.map((o) => (
            <li key={o.id}>
              <a href={o.url} target="_blank" rel="noopener noreferrer" className={CLASE_OPCION}>
                {o.etiqueta}
              </a>
            </li>
          ))}
          {'share' in navigator && (
            <li>
              <button type="button" onClick={compartir} className={CLASE_OPCION}>
                <Share2 className="h-4 w-4" aria-hidden="true" />
                Compartir
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
