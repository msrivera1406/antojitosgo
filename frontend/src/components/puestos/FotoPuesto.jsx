import { useState } from 'react';
import { fotoSegura } from '../../lib/fotos.js';
import IconoCategoria from '../ui/IconoCategoria.jsx';

const FONDOS = {
  chilaquiles: 'from-primario-100 to-crema-200 text-primario-700',
  esquites: 'from-aviso-suave to-crema-200 text-aviso',
  tacos: 'from-primario-200 to-crema-100 text-primario-800',
  tamales: 'from-verificado-suave to-crema-100 text-verificado',
  tortas: 'from-crema-200 to-tinta-100 text-tinta-700',
  postres: 'from-crema-200 to-primario-100 text-primario-600',
  bebidas: 'from-comunidad-suave to-crema-100 text-comunidad',
};

/**
 * Foto del puesto. Si no hay foto, o no es una ruta propia, muestra un fondo cálido con el icono
 * de la categoría. Las fotos de comida reales son las protagonistas cuando existen.
 */
export default function FotoPuesto({ puesto, className = '', iconoClase = 'h-10 w-10' }) {
  const [fallo, setFallo] = useState(false);
  const url = fotoSegura(puesto.foto_url);

  if (url && !fallo) {
    return <img src={url} alt={`Foto de ${puesto.nombre}`} loading="lazy" onError={() => setFallo(true)} className={`object-cover ${className}`} />;
  }
  return (
    <div
      role="img"
      aria-label={`Sin foto de ${puesto.nombre}`}
      className={`flex items-center justify-center bg-gradient-to-br ${FONDOS[puesto.categoria] ?? FONDOS.tacos} ${className}`}
    >
      <IconoCategoria categoria={puesto.categoria} className={iconoClase} />
    </div>
  );
}
