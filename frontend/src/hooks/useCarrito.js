import { useCallback, useEffect, useState } from 'react';
import { agregarProducto, cambiarCantidad, quitarProducto, sanearCarrito } from '../lib/carrito.js';

const clave = (puestoId) => `antojitosgo_carrito_${puestoId}`;

/** Carrito de un solo puesto, conservado en sessionStorage para sobrevivir a una recarga. */
export function useCarrito(puestoId) {
  const [carrito, setCarrito] = useState(() => {
    try {
      return sanearCarrito(JSON.parse(sessionStorage.getItem(clave(puestoId))));
    } catch {
      return [];
    }
  });

  useEffect(() => {
    sessionStorage.setItem(clave(puestoId), JSON.stringify(carrito));
  }, [carrito, puestoId]);

  const agregar = useCallback((producto) => setCarrito((c) => agregarProducto(c, producto)), []);
  const cambiar = useCallback((id, n) => setCarrito((c) => cambiarCantidad(c, id, n)), []);
  const quitar = useCallback((id) => setCarrito((c) => quitarProducto(c, id)), []);
  const vaciar = useCallback(() => setCarrito([]), []);

  return { carrito, agregar, cambiar, quitar, vaciar };
}
