import Estrellas from './Estrellas.jsx';

/** Promedio y total. Sin reseñas no se inventa una calificación. */
export default function ResumenCalificacion({ promedio, total, compacto = false }) {
  if (!total) return <p className="text-etiqueta font-semibold text-tinta-600">Sin reseñas todavía</p>;
  return (
    <p className="flex flex-wrap items-center gap-2">
      <span className={`${compacto ? 'text-subtitulo' : 'text-titulo-1'} font-black text-tinta-900`}>{promedio.toFixed(1)}</span>
      <Estrellas valor={promedio} tamano={compacto ? 'h-4 w-4' : 'h-5 w-5'} />
      <span className="text-etiqueta font-semibold text-tinta-600">
        {total} {total === 1 ? 'reseña' : 'reseñas'}
      </span>
    </p>
  );
}
