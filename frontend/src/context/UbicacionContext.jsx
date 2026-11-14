import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { CENTRO_CDMX } from '../services/config.js';

const UbicacionContext = createContext(null);
const TIEMPO_MAX_MS = 8000;

/**
 * Pide la ubicación solo cuando se solicita (nunca de forma silenciosa) y guarda la última
 * posición en memoria. La expone en window.AntojitoUbicacion para el asistente de voz (spec 03).
 * Estados: 'sin-pedir' | 'buscando' | 'lista' | 'no-disponible'
 */
export function UbicacionProvider({ children }) {
  const [ubicacion, setUbicacion] = useState(null);
  const [estado, setEstado] = useState('sin-pedir');
  const [aviso, setAviso] = useState('');
  const pedida = useRef(false);

  const solicitar = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setEstado('no-disponible');
      setAviso('Tu navegador no permite ubicarte. Mostramos el centro de la Ciudad de México.');
      return;
    }
    setEstado('buscando');
    setAviso('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUbicacion({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setEstado('lista');
      },
      () => {
        setEstado('no-disponible');
        setAviso('No pudimos usar tu ubicación. Mostramos el centro de la Ciudad de México.');
      },
      { enableHighAccuracy: true, timeout: TIEMPO_MAX_MS, maximumAge: 60000 },
    );
  }, []);

  const pedirUnaVez = useCallback(() => {
    if (pedida.current) return;
    pedida.current = true;
    solicitar();
  }, [solicitar]);

  useEffect(() => {
    window.AntojitoUbicacion = ubicacion ? { ...ubicacion } : undefined;
  }, [ubicacion]);

  const valor = useMemo(
    () => ({
      ubicacion,
      estado,
      aviso,
      descartarAviso: () => setAviso(''),
      solicitar,
      pedirUnaVez,
      centro: ubicacion ?? { lat: CENTRO_CDMX.lat, lng: CENTRO_CDMX.lng },
    }),
    [ubicacion, estado, aviso, solicitar, pedirUnaVez],
  );
  return <UbicacionContext.Provider value={valor}>{children}</UbicacionContext.Provider>;
}

export function useUbicacion() {
  const ctx = useContext(UbicacionContext);
  if (!ctx) throw new Error('useUbicacion debe usarse dentro de UbicacionProvider');
  return ctx;
}
