/**
 * Mientras el backend no esté listo, el frontend usa datos de ejemplo con la misma forma
 * del contrato compartido. Para usar la API real: VITE_USAR_DUMMY=false en frontend/.env.local
 */
export const USAR_DUMMY = import.meta.env.VITE_USAR_DUMMY !== 'false';

export const CENTRO_CDMX = { lat: 19.4326, lng: -99.1332, zoom: 13 };
