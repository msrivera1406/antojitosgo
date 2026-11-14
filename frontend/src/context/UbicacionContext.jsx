import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { CENTRO_CDMX, AREA_METROPOLITANA, PRECISION_MAX_METROS } from '../lib/mapaConfig.js';
import { aceptarLectura, dentroDelArea, estadoDesdeError, normalizarRumbo } from '../lib/geo.js';

const UbicacionContext = createContext(null);
const OPCIONES_GPS = { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 };

const AVISOS = {
  denegado: 'Sin permiso de ubicación. Actívalo en el navegador para ver puestos cerca de ti.',
  no_disponible: 'No pudimos obtener tu ubicación. Mostramos el centro de la Ciudad de México.',
  timeout: 'Tu ubicación tardó demasiado en responder. Mostramos el centro de la Ciudad de México.',
  fuera_de_area: 'Estás fuera del área metropolitana de la Ciudad de México. Por ahora AntojitosGo solo cubre esa zona.',
};

/**
 * Ubicación del usuario. Solo empieza a seguirla cuando la persona lo pide con un botón (nunca de forma
 * silenciosa) y no se guarda en ningún servidor. Se expone en window.AntojitoUbicacion para el asistente.
 * Estados: 'sin-pedir' | 'buscando' | 'lista' | 'denegado' | 'no_disponible' | 'timeout' | 'fuera_de_area'
 */
export function UbicacionProvider({ children }) {
  const [lectura, setLectura] = useState(null);
  const [estado, setEstado] = useState('sin-pedir');
  const [avisoVisible, setAvisoVisible] = useState(true);
  const vigilanteRef = useRef(null);
  const lecturaRef = useRef(null);
  const rumboRef = useRef(null);

  const detener = () => {
    if (vigilanteRef.current !== null) navigator.geolocation.clearWatch(vigilanteRef.current);
    vigilanteRef.current = null;
  };

  const solicitar = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setEstado('no_disponible');
      setAvisoVisible(true);
      return;
    }
    detener();
    setEstado('buscando');
    setAvisoVisible(true);
    vigilanteRef.current = navigator.geolocation.watchPosition(
      (p) => {
        const nueva = {
          lat: p.coords.latitude,
          lng: p.coords.longitude,
          precision: p.coords.accuracy,
          rumbo: p.coords.heading,
        };
        if (!aceptarLectura(lecturaRef.current, nueva, PRECISION_MAX_METROS)) return;
        // El rumbo del GPS solo es válido en movimiento: si falta, se conserva el último.
        const rumbo = normalizarRumbo(nueva.rumbo);
        if (rumbo !== null) rumboRef.current = rumbo;
        const siguiente = { ...nueva, rumbo: rumboRef.current };
        lecturaRef.current = siguiente;
        setLectura(siguiente);
        setEstado(dentroDelArea(siguiente, AREA_METROPOLITANA) ? 'lista' : 'fuera_de_area');
      },
      (error) => {
        // Un fallo transitorio no invalida una posición ya obtenida.
        if (lecturaRef.current && error.code !== 1) return;
        setEstado(estadoDesdeError(error.code));
      },
      OPCIONES_GPS,
    );
  }, []);

  useEffect(() => detener, []);

  const dentro = lectura !== null && dentroDelArea(lectura, AREA_METROPOLITANA);
  const ubicacion = dentro ? { lat: lectura.lat, lng: lectura.lng } : null;

  useEffect(() => {
    window.AntojitoUbicacion = ubicacion ? { ...ubicacion } : undefined;
  }, [ubicacion?.lat, ubicacion?.lng]); // eslint-disable-line react-hooks/exhaustive-deps

  const valor = useMemo(
    () => ({
      ubicacion,
      precision: dentro ? lectura.precision : null,
      rumbo: dentro ? lectura.rumbo : null,
      estado,
      aviso: avisoVisible ? AVISOS[estado] ?? '' : '',
      descartarAviso: () => setAvisoVisible(false),
      solicitar,
      centro: ubicacion ?? { lat: CENTRO_CDMX[1], lng: CENTRO_CDMX[0] },
    }),
    [ubicacion?.lat, ubicacion?.lng, dentro, lectura, estado, avisoVisible, solicitar], // eslint-disable-line react-hooks/exhaustive-deps
  );
  return <UbicacionContext.Provider value={valor}>{children}</UbicacionContext.Provider>;
}

export function useUbicacion() {
  const ctx = useContext(UbicacionContext);
  if (!ctx) throw new Error('useUbicacion debe usarse dentro de UbicacionProvider');
  return ctx;
}
