import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bot, ChevronRight, Mic, Send, Square, X } from 'lucide-react';
import Boton from '../ui/Boton.jsx';
import IconoBoton from '../ui/IconoBoton.jsx';
import Etiqueta from '../ui/Etiqueta.jsx';
import IndicadorVoz from './IndicadorVoz.jsx';
import { ESTADOS_ASISTENTE } from './EstadoAsistente.js';

/**
 * Panel del asistente. Antes de activar el micrófono se informa que es una IA y que el audio lo
 * procesa un proveedor externo. Siempre hay una alternativa de texto con las mismas funciones.
 */
export default function PanelAsistente({ asistente, puestos, onCerrar }) {
  const { estado, transcripcion, sugerencias, mensajeError, iniciar, detener, enviarTexto } = asistente;
  const [texto, setTexto] = useState('');
  const enCurso = estado === 'conectando' || estado === 'escuchando' || estado === 'hablando';

  const enviar = (e) => {
    e.preventDefault();
    enviarTexto(texto);
    setTexto('');
  };

  return (
    <section
      id="panel-asistente"
      role="dialog"
      aria-label="Asistente de AntojitosGo"
      className="animate-subir flex max-h-[min(34rem,70dvh)] w-[min(22rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-panel bg-white shadow-elevada"
    >
      <header className="flex items-center justify-between gap-2 border-b border-tinta-100 px-4 py-2">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primario-100 text-primario-700">
            <Bot className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-subtitulo leading-tight">Asistente</h2>
            <p className="text-[0.8125rem] font-semibold text-tinta-600">Inteligencia artificial</p>
          </div>
        </div>
        <IconoBoton icono={X} etiqueta="Cerrar asistente" onClick={onCerrar} />
      </header>

      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        <div className="flex flex-wrap items-center gap-2">
          <Etiqueta tono={estado === 'error' ? 'peligro' : enCurso ? 'primario' : 'neutro'} icono={estado === 'hablando' ? undefined : Mic}>
            {ESTADOS_ASISTENTE[estado].corto}
          </Etiqueta>
          {estado === 'escuchando' && <span className="text-etiqueta font-bold text-primario-800">Micrófono activo</span>}
          {estado === 'hablando' && <IndicadorVoz className="text-primario-700" />}
        </div>

        {estado === 'inactivo' && !transcripcion && (
          <div className="space-y-2 text-tinta-700">
            <p>Dime qué se te antoja y te recomiendo puestos abiertos cerca de ti.</p>
            <p className="text-etiqueta text-tinta-600">
              Hablas con una inteligencia artificial, no con una persona. Si usas la voz, tu audio y tu ubicación aproximada se procesan en un servicio externo. No se guardan.
            </p>
          </div>
        )}

        {estado === 'error' && <p className="font-semibold text-peligro">{mensajeError || ESTADOS_ASISTENTE.error.largo}</p>}

        {transcripcion && (
          <p aria-live="polite" className="rounded-tarjeta rounded-tl-md bg-crema-100 p-3.5 text-tinta-800">
            {transcripcion}
          </p>
        )}

        {sugerencias.length > 0 && (
          <ul className="space-y-2">
            {sugerencias.map((s) => {
              const puesto = puestos.find((p) => p.id === s.id);
              const verificado = puesto?.estatus === 'verificado';
              return (
                <li key={s.id} className="rounded-suave border border-tinta-200 p-3">
                  <p className="font-extrabold text-tinta-900">{s.nombre}</p>
                  <p className="text-etiqueta text-tinta-600">{s.motivo}</p>
                  {verificado && (
                    <Link to={`/puesto/${s.id}`} className="mt-1 inline-flex min-h-toque items-center gap-1 font-bold text-primario-700">
                      Ver menú
                      <ChevronRight className="h-4 w-4" aria-hidden="true" />
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="space-y-3 border-t border-tinta-100 p-4">
        <Boton
          className="w-full"
          variante={enCurso ? 'secundario' : 'primario'}
          icono={enCurso ? Square : Mic}
          onClick={enCurso ? detener : iniciar}
        >
          {enCurso ? ESTADOS_ASISTENTE[estado].accion : estado === 'error' ? 'Reintentar con voz' : 'Hablar con el asistente'}
        </Boton>
        <form onSubmit={enviar} className="flex items-center gap-2">
          <label htmlFor="texto-asistente" className="sr-only">
            O escribe lo que se te antoja
          </label>
          <input
            id="texto-asistente"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="O escribe lo que se te antoja"
            maxLength={200}
            className="min-h-toque min-w-0 flex-1 rounded-full border-2 border-tinta-200 px-4 text-base placeholder:text-tinta-500 focus:border-primario-600 focus:outline-none focus:ring-4 focus:ring-primario-100"
          />
          <button
            type="submit"
            aria-label="Enviar"
            disabled={!texto.trim()}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primario-600 text-white transition hover:bg-primario-700 disabled:bg-tinta-200 disabled:text-tinta-500"
          >
            <Send className="h-5 w-5" aria-hidden="true" />
          </button>
        </form>
      </div>
    </section>
  );
}
