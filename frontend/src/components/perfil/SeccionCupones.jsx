import { Ticket } from 'lucide-react';
import EstadoVacio from '../ui/EstadoVacio.jsx';
import CuponCard from './CuponCard.jsx';
import ComoSeGanan from './ComoSeGanan.jsx';

export default function SeccionCupones({ cupones }) {
  return (
    <section aria-labelledby="titulo-cupones" className="space-y-3">
      <h2 id="titulo-cupones" className="seccion-titulo">
        Mis cupones
      </h2>
      {cupones.length === 0 ? (
        <EstadoVacio icono={Ticket} titulo="Todavía no tienes cupones">
          Gánalos recomendando puestos o pidiendo varias veces en el mismo puesto.
        </EstadoVacio>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {cupones.map((c) => (
            <li key={c.id}>
              <CuponCard cupon={c} />
            </li>
          ))}
        </ul>
      )}
      <ComoSeGanan />
    </section>
  );
}
