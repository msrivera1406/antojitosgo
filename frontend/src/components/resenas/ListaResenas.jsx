import { MessageSquare } from 'lucide-react';
import EstadoVacio from '../ui/EstadoVacio.jsx';
import Estrellas from './Estrellas.jsx';
import { fechaCorta } from '../../lib/formato.js';

/** Reseñas de la más reciente a la más antigua. El texto se muestra como texto, nunca como HTML. */
export default function ListaResenas({ resenas }) {
  if (resenas.length === 0) {
    return (
      <EstadoVacio icono={MessageSquare} titulo="Aún no hay reseñas">
        Sé la primera persona en contar cómo te fue en este puesto.
      </EstadoVacio>
    );
  }
  return (
    <ul className="divide-y divide-tinta-100">
      {resenas.map((r) => (
        <li key={r.id} className="space-y-1.5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-extrabold text-tinta-900">{r.autor}</span>
            <span className="text-etiqueta text-tinta-600">{fechaCorta(r.creado_en)}</span>
          </div>
          <Estrellas valor={r.calificacion} tamano="h-4 w-4" />
          {r.comentario && <p className="text-tinta-800">{r.comentario}</p>}
        </li>
      ))}
    </ul>
  );
}
