// Íconos por categoría (las mismas de config.CATEGORIAS en el backend).
export const ICONOS_CATEGORIA = {
  chilaquiles: '🥘',
  esquites: '🌽',
  tacos: '🌮',
  tamales: '🫔',
  tortas: '🥪',
  postres: '🍩',
  bebidas: '🥤',
};

export const iconoDeCategoria = (categoria) => ICONOS_CATEGORIA[categoria] ?? '🍴';
