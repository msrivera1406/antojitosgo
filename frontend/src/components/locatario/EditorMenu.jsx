import { useState } from 'react';
import { Pencil, Plus, Check, X, Utensils } from 'lucide-react';
import Boton from '../ui/Boton.jsx';
import Campo from '../ui/Campo.jsx';
import Alerta from '../ui/Alerta.jsx';
import Interruptor from '../ui/Interruptor.jsx';
import EstadoVacio from '../ui/EstadoVacio.jsx';
import { puestosApi } from '../../services/endpoints.js';
import { validarProducto } from '../../lib/validaciones.js';
import { dinero } from '../../lib/formato.js';

/** Un renglón del menú: interruptor de disponibilidad inmediato y edición de nombre y precio. No se eliminan productos. */
function RenglonProducto({ producto, onActualizar }) {
  const [editando, setEditando] = useState(false);
  const [borrador, setBorrador] = useState({ nombre: producto.nombre, precio: String(producto.precio) });
  const [errores, setErrores] = useState({});
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);

  const cambiarDisponible = async (disponible) => {
    setError('');
    onActualizar({ ...producto, disponible }); // optimista
    try {
      await puestosApi.editarProducto(producto.id, { disponible });
    } catch (e) {
      onActualizar(producto);
      setError(e.mensaje);
    }
  };

  const guardar = async (e) => {
    e.preventDefault();
    const r = validarProducto(borrador);
    setErrores(r.errores);
    if (!r.ok) return;
    setGuardando(true);
    setError('');
    try {
      const nuevo = await puestosApi.editarProducto(producto.id, { nombre: borrador.nombre.trim(), precio: Number(borrador.precio) });
      onActualizar({ ...producto, ...nuevo });
      setEditando(false);
    } catch (err) {
      setError(err.mensaje);
    } finally {
      setGuardando(false);
    }
  };

  if (editando) {
    return (
      <li className="py-3">
        <form onSubmit={guardar} noValidate className="space-y-3 rounded-suave bg-crema-100 p-3">
          <Campo etiqueta="Nombre" error={errores.nombre} hijo={(p) => <input {...p} value={borrador.nombre} onChange={(e) => setBorrador({ ...borrador, nombre: e.target.value })} />} />
          <Campo
            etiqueta="Precio en pesos"
            error={errores.precio}
            hijo={(p) => <input {...p} inputMode="decimal" value={borrador.precio} onChange={(e) => setBorrador({ ...borrador, precio: e.target.value })} />}
          />
          {error && <Alerta tipo="error">{error}</Alerta>}
          <div className="flex gap-2">
            <Boton type="submit" cargando={guardando} icono={Check} tamano="chico">
              Guardar
            </Boton>
            <Boton variante="terciario" tamano="chico" icono={X} onClick={() => setEditando(false)}>
              Cancelar
            </Boton>
          </div>
        </form>
      </li>
    );
  }

  return (
    <li className="space-y-1 py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className={`font-extrabold ${producto.disponible ? 'text-tinta-900' : 'text-tinta-600'}`}>{producto.nombre}</p>
          <p className="font-bold text-primario-800">{dinero(producto.precio)}</p>
        </div>
        <button
          type="button"
          onClick={() => setEditando(true)}
          aria-label={`Editar ${producto.nombre}`}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-tinta-700 hover:bg-tinta-100"
        >
          <Pencil className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>
      <Interruptor activo={producto.disponible} onChange={cambiarDisponible} etiqueta={`Disponibilidad de ${producto.nombre}`} />
      {error && <p role="alert" className="text-etiqueta font-bold text-peligro">{error}</p>}
    </li>
  );
}

export default function EditorMenu({ puestoId, productos, onCambio }) {
  const [nuevo, setNuevo] = useState({ nombre: '', precio: '' });
  const [errores, setErrores] = useState({});
  const [error, setError] = useState('');
  const [agregando, setAgregando] = useState(false);

  const agregar = async (e) => {
    e.preventDefault();
    const r = validarProducto(nuevo);
    setErrores(r.errores);
    if (!r.ok) return;
    setAgregando(true);
    setError('');
    try {
      const creado = await puestosApi.agregarProducto(puestoId, { nombre: nuevo.nombre.trim(), precio: Number(nuevo.precio) });
      onCambio([...productos, creado]);
      setNuevo({ nombre: '', precio: '' });
    } catch (err) {
      setError(err.mensaje);
    } finally {
      setAgregando(false);
    }
  };

  const actualizar = (p) => onCambio(productos.map((x) => (x.id === p.id ? p : x)));

  return (
    <div className="space-y-6">
      <section className="rounded-panel bg-white p-5 shadow-tarjeta">
        <h2 className="text-titulo-3">Tu menú</h2>
        {productos.length === 0 ? (
          <EstadoVacio icono={Utensils} titulo="Aún no tienes productos">
            Agrega tu primer producto para empezar a recibir pedidos.
          </EstadoVacio>
        ) : (
          <ul className="divide-y divide-tinta-100">
            {productos.map((p) => (
              <RenglonProducto key={p.id} producto={p} onActualizar={actualizar} />
            ))}
          </ul>
        )}
      </section>

      <form onSubmit={agregar} noValidate className="space-y-4 rounded-panel bg-white p-5 shadow-tarjeta">
        <h2 className="text-titulo-3">Agregar un producto</h2>
        {error && <Alerta tipo="error">{error}</Alerta>}
        <Campo etiqueta="Nombre" error={errores.nombre} hijo={(p) => <input {...p} value={nuevo.nombre} onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })} />} />
        <Campo
          etiqueta="Precio en pesos"
          error={errores.precio}
          hijo={(p) => <input {...p} inputMode="decimal" value={nuevo.precio} onChange={(e) => setNuevo({ ...nuevo, precio: e.target.value })} />}
        />
        <Boton type="submit" icono={Plus} cargando={agregando} className="w-full sm:w-auto">
          Agregar producto
        </Boton>
      </form>
    </div>
  );
}
