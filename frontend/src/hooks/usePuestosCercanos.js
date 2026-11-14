import { useCallback, useEffect, useRef, useState } from 'react';
import { obtenerCercanos } from '../lib/api.js';
import {
  CENTRO_CDMX,
  RADIO_CERCANOS_M,
  RADIO_SIN_UBICACION_M,
  REFRESCO,
} from '../lib/config.js';
import { debeRefrescar } from '../lib/geo.js';

const ORIGEN_SIN_UBICACION = { lat: CENTRO_CDMX[1], lng: CENTRO_CDMX[0] };

/**
 * Mantiene la lista de puestos cercanos. Vuelve a consultar cuando el usuario se mueve 50 m
 * o pasan 30 s (ver REFRESCO). Sin ubicación usa el centro de la CDMX con un radio mayor.
 * Devuelve { puestos, estado: 'cargando' | 'ok' | 'error', error, reintentar }.
 * Ante un error conserva los puestos que ya tenía.
 */
export function usePuestosCercanos(posicion) {
  const [puestos, setPuestos] = useState([]);
  const [estado, setEstado] = useState('cargando');
  const [error, setError] = useState(null);
  const ultimaRef = useRef(null);
  const abortoRef = useRef(null);
  const origenRef = useRef(null);

  const origen = posicion ?? ORIGEN_SIN_UBICACION;
  const radio = posicion ? RADIO_CERCANOS_M : RADIO_SIN_UBICACION_M;
  origenRef.current = { origen, radio };

  const cargar = useCallback(async () => {
    const { origen: pos, radio: r } = origenRef.current;
    abortoRef.current?.abort();
    const control = new AbortController();
    abortoRef.current = control;
    ultimaRef.current = { pos, ms: Date.now(), radio: r };
    try {
      const datos = await obtenerCercanos({ ...pos, radio: r }, { signal: control.signal });
      setPuestos(datos);
      setError(null);
      setEstado('ok');
    } catch (e) {
      if (e.name === 'AbortError') return;
      setError(e.message);
      setEstado('error');
    }
  }, []);

  // Al moverse, o al ganar/perder la ubicación.
  useEffect(() => {
    const cambioRadio = ultimaRef.current?.radio !== radio;
    if (cambioRadio || debeRefrescar(ultimaRef.current, origen, Date.now(), REFRESCO)) cargar();
  }, [origen.lat, origen.lng, radio, cargar]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cada 30 s aunque el usuario esté quieto: pueden haberse dado de alta puestos nuevos.
  useEffect(() => {
    const id = setInterval(cargar, REFRESCO.intervaloMs);
    return () => {
      clearInterval(id);
      abortoRef.current?.abort();
    };
  }, [cargar]);

  const reintentar = useCallback(() => {
    setEstado('cargando');
    cargar();
  }, [cargar]);

  return { puestos, estado, error, reintentar };
}
