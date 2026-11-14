import { useCallback, useEffect, useRef, useState } from 'react';
import { SUGERENCIAS_IA } from '../services/mock/datos.js';

/**
 * SIMULACIÓN del asistente de voz mientras la spec 03 entrega gemini_live.js.
 * Contrato que debe respetar el hook real:
 *   estado          'inactivo' | 'conectando' | 'escuchando' | 'hablando' | 'error'
 *   transcripcion   texto breve de lo último que dijo el agente
 *   sugerencias     [{ id, nombre, motivo }] puestos mencionados
 *   mensajeError    texto cuando estado === 'error'
 *   iniciar(), detener(), enviarTexto(texto)
 */
export function useAsistenteDummy() {
  const [estado, setEstado] = useState('inactivo');
  const [transcripcion, setTranscripcion] = useState('');
  const [sugerencias, setSugerencias] = useState([]);
  const temporizadores = useRef([]);

  const limpiar = () => {
    temporizadores.current.forEach(clearTimeout);
    temporizadores.current = [];
  };
  const despues = (ms, fn) => temporizadores.current.push(setTimeout(fn, ms));

  const responder = useCallback(() => {
    setEstado('hablando');
    setTranscripcion('Para esta hora te recomiendo estos dos puestos que están abiertos cerca de ti.');
    setSugerencias(SUGERENCIAS_IA);
    despues(3500, () => setEstado('inactivo'));
  }, []);

  const iniciar = useCallback(() => {
    limpiar();
    setSugerencias([]);
    setTranscripcion('');
    setEstado('conectando');
    despues(900, () => setEstado('escuchando'));
    despues(4200, responder);
  }, [responder]);

  const detener = useCallback(() => {
    limpiar();
    setEstado('inactivo');
  }, []);

  const enviarTexto = useCallback(
    (texto) => {
      if (!texto.trim()) return;
      limpiar();
      setSugerencias([]);
      setEstado('conectando');
      despues(700, responder);
    },
    [responder],
  );

  useEffect(() => limpiar, []);

  return { estado, transcripcion, sugerencias, mensajeError: '', iniciar, detener, enviarTexto };
}
