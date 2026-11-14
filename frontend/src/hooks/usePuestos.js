import { useMemo, useState } from 'react';
import { puestosApi } from '../services/endpoints.js';
import { filtrarPuestos } from '../lib/filtros.js';
import { useCarga } from './useCarga.js';

const FILTROS_INICIALES = { categoria: null, estatus: 'todos', texto: '' };

/** Carga la lista una sola vez y filtra en el cliente, sin nuevas peticiones. */
export function usePuestos() {
  const lista = useCarga(() => puestosApi.listar(), []);
  const categorias = useCarga(() => puestosApi.categorias(), []);
  const [filtros, setFiltros] = useState(FILTROS_INICIALES);

  const filtrados = useMemo(() => filtrarPuestos(lista.datos ?? [], filtros), [lista.datos, filtros]);

  return {
    todos: lista.datos ?? [],
    filtrados,
    categorias: categorias.datos ?? [],
    cargando: lista.cargando,
    error: lista.error,
    recargar: lista.recargar,
    filtros,
    cambiarFiltros: (parcial) => setFiltros((f) => ({ ...f, ...parcial })),
    limpiarFiltros: () => setFiltros(FILTROS_INICIALES),
  };
}
