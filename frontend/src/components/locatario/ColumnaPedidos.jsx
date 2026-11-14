import TarjetaPedido from './TarjetaPedido.jsx';

export default function ColumnaPedidos({ titulo, lista, vacio, nuevos, avanzandoId, onAvanzar }) {
  return (
    <section aria-label={titulo} className="space-y-3">
      <h3 className="flex items-center justify-between text-titulo-3">
        {titulo}
        <span className="rounded-full bg-primario-100 px-3 py-0.5 text-base font-black text-primario-800">{lista.length}</span>
      </h3>
      {lista.length === 0 ? (
        <p className="rounded-tarjeta border-2 border-dashed border-tinta-200 p-6 text-center text-tinta-600">{vacio}</p>
      ) : (
        lista.map((p) => (
          <TarjetaPedido key={p.id} pedido={p} nuevo={nuevos.includes(p.id)} avanzando={avanzandoId === p.id} onAvanzar={onAvanzar} />
        ))
      )}
    </section>
  );
}
