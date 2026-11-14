import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authApi } from '../services/endpoints.js';
import { ApiError } from '../services/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [cargando, setCargando] = useState(true);

  const refrescar = useCallback(async () => {
    try {
      setUsuario(await authApi.me());
    } catch (e) {
      if (!(e instanceof ApiError) || e.status !== 401) console.warn('No se pudo consultar la sesión');
      setUsuario(null);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    refrescar();
  }, [refrescar]);

  const iniciarSesion = useCallback(async (datos) => {
    const u = await authApi.login(datos);
    setUsuario(u);
    return u;
  }, []);

  const registrar = useCallback(async (datos) => {
    const u = await authApi.registro(datos);
    setUsuario(u);
    return u;
  }, []);

  const cerrarSesion = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      setUsuario(null);
    }
  }, []);

  const valor = useMemo(
    () => ({ usuario, cargando, refrescar, iniciarSesion, registrar, cerrarSesion }),
    [usuario, cargando, refrescar, iniciarSesion, registrar, cerrarSesion],
  );
  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
