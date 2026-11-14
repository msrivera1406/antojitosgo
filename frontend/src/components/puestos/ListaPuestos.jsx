import TarjetaPuesto from './TarjetaPuesto.jsx';

export default function ListaPuestos({ puestos, seleccionadoId, onElegir }) {
  return (
    <ul className="space-y-3">
      {puestos.map((p) => (
        <li key={p.id}>
          <TarjetaPuesto puesto={p} seleccionado={p.id === seleccionadoId} onElegir={onElegir} />
        </li>
      ))}
    </ul>
  );
}
