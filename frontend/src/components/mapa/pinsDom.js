/**
 * Elementos DOM de los marcadores del mapa. Verificado: círculo verde con escudo. Recomendado: rombo
 * azul con signo de pregunta. Se distinguen por forma e icono, no solo por color. Sin emojis.
 */
const SVG = 'class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"';

const ICONO_VERIFICADO = `<svg ${SVG}><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/></svg>`;
const ICONO_RECOMENDADO = `<svg ${SVG}><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/></svg>`;

const CLASE_CUERPO = 'flex h-9 w-9 items-center justify-center border-2 border-white text-white shadow-elevada transition-transform duration-150';

export function crearElementoPin(puesto) {
  const verificado = puesto.estatus === 'verificado';
  const boton = document.createElement('button');
  boton.type = 'button';
  boton.className = 'relative flex h-11 w-11 items-center justify-center';
  boton.setAttribute('aria-label', `${puesto.nombre}, ${verificado ? 'verificado' : 'recomendación de la comunidad'}`);
  boton.dataset.estatus = puesto.estatus;

  // Halo para cuando el asistente recomienda este puesto (oculto por defecto).
  const halo = document.createElement('span');
  halo.dataset.halo = '';
  halo.setAttribute('aria-hidden', 'true');
  halo.className = 'pin-halo pointer-events-none absolute inset-0 hidden rounded-full';
  boton.appendChild(halo);

  const cuerpo = document.createElement('span');
  cuerpo.dataset.cuerpo = '';
  cuerpo.className = `${CLASE_CUERPO} ${verificado ? 'rounded-full bg-verificado' : 'rotate-45 rounded-[0.6rem] bg-comunidad'}`;
  const icono = document.createElement('span');
  icono.className = verificado ? '' : '-rotate-45';
  icono.innerHTML = verificado ? ICONO_VERIFICADO : ICONO_RECOMENDADO;
  cuerpo.appendChild(icono);
  boton.appendChild(cuerpo);
  return boton;
}

export function marcarPinSeleccionado(elemento, activo) {
  const cuerpo = elemento.querySelector('[data-cuerpo]');
  cuerpo.classList.toggle('scale-125', activo);
  cuerpo.classList.toggle('ring-4', activo);
  cuerpo.classList.toggle('ring-primario-300', activo);
  elemento.style.zIndex = activo ? '10' : '';
  elemento.setAttribute('aria-pressed', String(activo));
}

/**
 * Resalta un pin recomendado por el asistente: halo dorado que late, aro y tamaño mayor.
 * Es distinto del pin seleccionado (aro rojo) y se anuncia en la etiqueta accesible.
 */
export function marcarPinDestacado(elemento, activo) {
  const cuerpo = elemento.querySelector('[data-cuerpo]');
  elemento.querySelector('[data-halo]').classList.toggle('hidden', !activo);
  cuerpo.classList.toggle('pin-cuerpo-destacado', activo);
  if (activo) elemento.style.zIndex = '20';
  else if (elemento.getAttribute('aria-pressed') !== 'true') elemento.style.zIndex = '';
  const base = elemento.getAttribute('aria-label').replace(/\. Recomendado por el asistente$/, '');
  elemento.setAttribute('aria-label', activo ? `${base}. Recomendado por el asistente` : base);
}

/** Punto "Tú estás aquí" con flecha de rumbo opcional. */
export function crearElementoUsuario() {
  const raiz = document.createElement('div');
  raiz.className = 'relative h-6 w-6';
  raiz.setAttribute('role', 'img');
  raiz.setAttribute('aria-label', 'Tú estás aquí');
  raiz.innerHTML = `
    <div data-flecha class="absolute left-1/2 -top-2 hidden -translate-x-1/2 border-x-[7px] border-b-[12px] border-x-transparent border-b-primario-600"></div>
    <div class="h-6 w-6 rounded-full border-[3px] border-white bg-primario-600 shadow-elevada"></div>`;
  return raiz;
}

/** Pin de punto elegido (formularios): gota con punta hacia abajo. */
export function crearElementoPunto() {
  const el = document.createElement('div');
  el.setAttribute('role', 'img');
  el.setAttribute('aria-label', 'Ubicación marcada');
  el.className = 'h-8 w-8';
  el.innerHTML = `<svg viewBox="0 0 24 24" class="h-8 w-8 drop-shadow" aria-hidden="true"><path d="M12 22s7-6.2 7-12a7 7 0 1 0-14 0c0 5.800 7 12 7 12Z" class="fill-primario-600 stroke-white" stroke-width="1.5"/><circle cx="12" cy="10" r="2.6" class="fill-white"/></svg>`;
  return el;
}
