import { useEffect, useRef, useState } from 'react';
import { aceptarLectura, estadoDesdeError, normalizarRumbo } from '../lib/geo.js';
import { PRECISION_MAX_METROS } from '../lib/config.js';

/**
 * Único punto de la app que habla con la API de geolocalización.
 * Hoy usa navigator.geolocation. Para pasar a Capacitor (iOS/Android nativo) solo hay que
 * cambiar la implementación de `iniciarSeguimiento` por Geolocation.watchPosition del plugin.
 *
 * Estados: 'solicitando' | 'activo' | 'denegado' | 'no_disponible' | 'timeout'
 * Devuelve { posicion: {lat, lng} | null, precision (m) | null, rumbo (0-360) | null, estado }
 */
const OPCIONES = { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 };

function iniciarSeguimiento(alLeer, alFallar) {
  if (!('geolocation' in navigator)) {
    alFallar({ code: 2 });
    return () => {};
  }
  const id = navigator.geolocation.watchPosition(
    (p) =>
      alLeer({
        lat: p.coords.latitude,
        lng: p.coords.longitude,
        precision: p.coords.accuracy,
        rumbo: p.coords.heading,
        velocidad: p.coords.speed,
      }),
    alFallar,
    OPCIONES,
  );
  return () => navigator.geolocation.clearWatch(id);
}

export function useGeolocalizacion() {
  const [estado, setEstado] = useState('solicitando');
  const [lectura, setLectura] = useState(null);
  const rumboRef = useRef(null);
  const lecturaRef = useRef(null);

  useEffect(() => {
    return iniciarSeguimiento(
      (nueva) => {
        if (!aceptarLectura(lecturaRef.current, nueva, PRECISION_MAX_METROS)) return;
        // El rumbo del GPS solo es válido en movimiento. Si no hay, se conserva el último.
        const rumbo = normalizarRumbo(nueva.rumbo);
        if (rumbo !== null) rumboRef.current = rumbo;
        const siguiente = { ...nueva, rumbo: rumboRef.current };
        lecturaRef.current = siguiente;
        setLectura(siguiente);
        setEstado('activo');
      },
      (error) => {
        // Un fallo transitorio (timeout) no invalida una posición ya obtenida.
        if (lecturaRef.current && error.code !== 1) return;
        setEstado(estadoDesdeError(error.code));
      },
    );
  }, []);

  return {
    estado,
    posicion: lectura ? { lat: lectura.lat, lng: lectura.lng } : null,
    precision: lectura ? lectura.precision : null,
    rumbo: lectura ? lectura.rumbo : null,
  };
}
