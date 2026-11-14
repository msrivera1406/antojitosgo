import { Wheat, Sandwich, Beef, Croissant, IceCreamCone, Coffee, Utensils, Egg } from 'lucide-react';

export const ICONOS_CATEGORIA = {
  chilaquiles: Egg,
  esquites: Wheat,
  tacos: Beef,
  tamales: Croissant,
  tortas: Sandwich,
  postres: IceCreamCone,
  bebidas: Coffee,
};

export const NOMBRES_CATEGORIA = {
  chilaquiles: 'Chilaquiles',
  esquites: 'Esquites',
  tacos: 'Tacos',
  tamales: 'Tamales',
  tortas: 'Tortas',
  postres: 'Postres',
  bebidas: 'Bebidas',
};

export function iconoDeCategoria(categoria) {
  return ICONOS_CATEGORIA[categoria] ?? Utensils;
}

export function nombreDeCategoria(categoria) {
  return NOMBRES_CATEGORIA[categoria] ?? categoria;
}

export default function IconoCategoria({ categoria, className = 'h-5 w-5' }) {
  const Icono = iconoDeCategoria(categoria);
  return <Icono className={className} aria-hidden="true" />;
}
