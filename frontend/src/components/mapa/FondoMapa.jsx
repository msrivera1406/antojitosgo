import { Map } from 'lucide-react';

/** Fondo del espacio reservado para el mapa. No es un mapa: Leaflet y OpenStreetMap se integran aparte. */
export default function FondoMapa({ texto = 'Aquí se integrará el mapa interactivo' }) {
  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 bg-crema-200"
      style={{
        backgroundImage:
          'linear-gradient(rgba(198,59,44,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(198,59,44,0.07) 1px, transparent 1px)',
        backgroundSize: '44px 44px',
      }}
    >
      <div className="absolute left-1/2 top-4 flex -translate-x-1/2 items-center gap-2 rounded-full bg-white/90 px-4 py-2 text-etiqueta font-bold text-tinta-600 shadow-tarjeta">
        <Map className="h-4 w-4" />
        {texto}
      </div>
    </div>
  );
}
