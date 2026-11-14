/** Marcado del asistente de Int. 3 (templates/partials/boton_ia.html) sin las etiquetas de Jinja.
 * Es HTML estático del equipo, sin datos de usuario. Si cambia el parcial, hay que copiarlo aquí. */
export const MARCADO_IA = `
<div id="zona-ia" data-ia>
  <p id="ia-aviso" class="ia-aviso" role="status" aria-live="polite" hidden></p>

  <div id="ia-burbuja" class="ia-burbuja" aria-live="polite" hidden>
    <p id="ia-entrada" class="ia-entrada"></p>
    <p id="ia-transcripcion" class="ia-transcripcion"></p>
  </div>

  <p class="ia-etiqueta">Asistente de IA</p>

  <div class="ia-botones">
    <button id="btn-chat" class="ia-btn ia-btn-chat" type="button" aria-label="Escribirle al asistente" aria-expanded="false" aria-controls="panel-chat">
      <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><path fill="currentColor" d="M4 4h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H9l-5 4v-4H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"/></svg>
    </button>
    <button id="btn-ia" class="ia-btn ia-btn-voz" type="button" data-estado="inactivo" aria-label="Hablar con el asistente">
      <span class="ia-anillo" aria-hidden="true"></span>
      <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true"><path fill="currentColor" d="M12 15a4 4 0 0 0 4-4V6a4 4 0 0 0-8 0v5a4 4 0 0 0 4 4zm6-4a6 6 0 0 1-12 0H4a8 8 0 0 0 7 7.93V22h2v-3.07A8 8 0 0 0 20 11h-2z"/></svg>
    </button>
  </div>
  <p id="ia-estado" class="ia-estado" aria-live="polite"></p>
</div>

<section id="ia-consentimiento" class="ia-consentimiento" role="dialog" aria-labelledby="ia-consent-titulo" aria-describedby="ia-consent-texto" hidden>
  <h2 id="ia-consent-titulo">Antes de hablar</h2>
  <p id="ia-consent-texto">Antojito es un asistente de inteligencia artificial, no una persona. Para conversar, tu voz y tu ubicación aproximada se envían a Google (Gemini) para generar la respuesta. Antojito no guarda tu audio. El micrófono solo está activo mientras el botón está en verde o azul.</p>
  <div class="ia-consent-botones">
    <button id="ia-consent-ok" type="button">Entiendo, continuar</button>
    <button id="ia-consent-chat" type="button" class="ia-secundario">Prefiero escribir</button>
  </div>
</section>

<section id="panel-chat" class="ia-chat" role="dialog" aria-label="Chat con el asistente" hidden>
  <header class="ia-chat-cabecera">
    <h2>Antojito <span class="ia-chip">asistente de IA</span></h2>
    <button id="chat-cerrar" class="ia-chat-cerrar" type="button" aria-label="Cerrar el chat">&times;</button>
  </header>
  <div id="chat-mensajes" class="ia-chat-mensajes" role="log" aria-live="polite" aria-relevant="additions"></div>
  <form id="chat-form" class="ia-chat-form" autocomplete="off">
    <label for="chat-entrada" class="ia-solo-lectores">Tu mensaje</label>
    <input id="chat-entrada" type="text" maxlength="500" placeholder="¿Qué se te antoja?" enterkeyhint="send">
    <button id="chat-enviar" type="submit">Enviar</button>
  </form>
  <p class="ia-chat-nota">Asistente de inteligencia artificial. Tus mensajes y tu ubicación aproximada se procesan con Gemini (Google) y Antojito no los guarda. No da consejo médico ni sobre alergias.</p>
</section>
`;
