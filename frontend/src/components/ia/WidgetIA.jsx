import { useEffect, useRef } from 'react';
import { MARCADO_IA } from './marcadoIA.js';

const ID_SCRIPT = 'antojito-gemini-live';
const ID_CSS = 'antojito-ia-css';

/**
 * Asistente de voz y chat real (spec 03, Integrante 3). Inserta el mismo marcado del parcial de Jinja
 * y carga /static/js/gemini_live.js y /static/css/ia.css una sola vez. Se monta en AppShell, que no se
 * desmonta al navegar, porque el script se enlaza al DOM una única vez al cargar.
 * `visible` oculta el asistente en las páginas donde no aplica sin desmontarlo.
 */
export default function WidgetIA({ visible }) {
  const contenedor = useRef(null);

  useEffect(() => {
    const raiz = contenedor.current;
    if (!raiz.firstChild) raiz.innerHTML = MARCADO_IA; // HTML estático, sin datos de usuario
    if (!document.getElementById(ID_CSS)) {
      const css = document.createElement('link');
      css.id = ID_CSS;
      css.rel = 'stylesheet';
      css.href = '/static/css/ia.css';
      document.head.appendChild(css);
    }
    if (!document.getElementById(ID_SCRIPT)) {
      const script = document.createElement('script');
      script.id = ID_SCRIPT;
      script.type = 'module';
      script.src = '/static/js/gemini_live.js';
      document.body.appendChild(script);
    }
  }, []);

  // Si se oculta con una sesión de voz abierta, se detiene para no dejar el micrófono activo.
  useEffect(() => {
    if (!visible) globalThis.AntojitoIA?.detener?.();
  }, [visible]);

  return <div ref={contenedor} data-widget-ia hidden={!visible} />;
}
