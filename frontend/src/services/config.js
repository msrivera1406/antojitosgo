/**
 * Por defecto el frontend usa la API real de Flask. Para trabajar sin backend, con datos de ejemplo
 * de la misma forma que el contrato: VITE_USAR_DUMMY=true en frontend/.env.local
 */
export const USAR_DUMMY = import.meta.env.VITE_USAR_DUMMY === 'true';
