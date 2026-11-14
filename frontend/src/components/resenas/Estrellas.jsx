import { Star } from 'lucide-react';

/** Calificación en estrellas, solo lectura. El valor también se da en texto para lectores de pantalla. */
export default function Estrellas({ valor, tamano = 'h-5 w-5', className = '' }) {
  const lleno = Math.round(Number(valor) || 0);
  return (
    <span role="img" aria-label={`${valor ?? 0} de 5 estrellas`} className={`inline-flex items-center gap-0.5 ${className}`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          aria-hidden="true"
          className={`${tamano} ${n <= lleno ? 'fill-aviso text-aviso' : 'fill-transparent text-tinta-300'}`}
        />
      ))}
    </span>
  );
}
