// Enlaces para abrir un destino en la app de mapas preferida. Funciones puras, sin DOM.

/** 'ios' | 'android' | 'otro'. iPadOS se hace pasar por Mac, se distingue por la pantalla táctil. */
export function detectarPlataforma({ userAgent = '', maxTouchPoints = 0 } = {}) {
  if (/android/i.test(userAgent)) return 'android';
  if (/iphone|ipad|ipod/i.test(userAgent)) return 'ios';
  if (/macintosh/i.test(userAgent) && maxTouchPoints > 1) return 'ios';
  return 'otro';
}

const esCoordenada = (n) => typeof n === 'number' && Number.isFinite(n);

/**
 * Opciones de "Cómo llegar" para un destino {lat, lng, nombre}.
 * Devuelve [{ id, etiqueta, url }]. Lanza si las coordenadas no son números válidos.
 */
export function opcionesNavegacion({ lat, lng, nombre = '' }, plataforma = 'otro') {
  if (!esCoordenada(lat) || !esCoordenada(lng)) throw new Error('Coordenadas no válidas');
  const punto = `${lat},${lng}`;
  const opciones = [
    {
      id: 'google',
      etiqueta: 'Google Maps',
      url: `https://www.google.com/maps/dir/?api=1&destination=${punto}`,
    },
    { id: 'waze', etiqueta: 'Waze', url: `https://waze.com/ul?ll=${punto}&navigate=yes` },
  ];
  if (plataforma === 'ios') {
    opciones.push({
      id: 'apple',
      etiqueta: 'Apple Maps',
      url: `https://maps.apple.com/?daddr=${punto}`,
    });
  }
  if (plataforma === 'android') {
    // Abre el selector del sistema con las apps de mapas instaladas. Los paréntesis delimitan la etiqueta del URI.
    const etiqueta = encodeURIComponent(nombre.replace(/[()]/g, ' ').trim());
    opciones.push({
      id: 'otra',
      etiqueta: 'Otra app…',
      url: etiqueta ? `geo:${punto}?q=${punto}(${etiqueta})` : `geo:${punto}?q=${punto}`,
    });
  }
  return opciones;
}
