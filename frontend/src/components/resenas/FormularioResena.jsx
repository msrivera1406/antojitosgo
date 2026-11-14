import { useState } from 'react';
import { Send } from 'lucide-react';
import Boton from '../ui/Boton.jsx';
import Campo from '../ui/Campo.jsx';
import Alerta from '../ui/Alerta.jsx';
import SelectorEstrellas from './SelectorEstrellas.jsx';

export const MAX_COMENTARIO = 500;

/** Crear o editar la reseña propia. Conserva lo escrito si el servidor responde con error. */
export default function FormularioResena({ inicial, onGuardar }) {
  const [calificacion, setCalificacion] = useState(inicial?.calificacion ?? 0);
  const [comentario, setComentario] = useState(inicial?.comentario ?? '');
  const [error, setError] = useState('');
  const [errorServidor, setErrorServidor] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [guardada, setGuardada] = useState(false);

  const enviar = async (e) => {
    e.preventDefault();
    if (guardando) return;
    setError('');
    setErrorServidor('');
    setGuardada(false);
    if (calificacion < 1) {
      setError('Elige de 1 a 5 estrellas.');
      return;
    }
    if (comentario.length > MAX_COMENTARIO) return;
    setGuardando(true);
    try {
      await onGuardar({ calificacion, comentario: comentario.trim() });
      setGuardada(true);
    } catch (err) {
      setErrorServidor(err.mensaje ?? 'No pudimos guardar tu reseña. Inténtalo de nuevo.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <form onSubmit={enviar} noValidate className="space-y-4">
      {errorServidor && <Alerta tipo="error">{errorServidor}</Alerta>}
      {guardada && <Alerta tipo="exito">Gracias. Tu reseña ya se publicó.</Alerta>}
      <SelectorEstrellas valor={calificacion} onChange={setCalificacion} error={error} />
      <Campo
        etiqueta="Tu comentario"
        opcional
        ayuda="Cuenta qué pediste y qué te pareció."
        hijo={(p) => (
          <div className="space-y-1">
            <textarea {...p} rows={3} value={comentario} onChange={(e) => setComentario(e.target.value)} />
            <p className={`text-right text-etiqueta font-bold ${comentario.length > MAX_COMENTARIO ? 'text-peligro' : 'text-tinta-600'}`}>
              {comentario.length} de {MAX_COMENTARIO}
            </p>
          </div>
        )}
      />
      <Boton type="submit" icono={Send} cargando={guardando} className="w-full sm:w-auto">
        {inicial ? 'Actualizar mi reseña' : 'Publicar reseña'}
      </Boton>
    </form>
  );
}
