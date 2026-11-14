import { useState } from 'react';
import { Save } from 'lucide-react';
import Boton from '../ui/Boton.jsx';
import Campo from '../ui/Campo.jsx';
import Alerta from '../ui/Alerta.jsx';
import SelectorPunto from '../mapa/SelectorPunto.jsx';
import { nombreDeCategoria } from '../ui/IconoCategoria.jsx';
import { validarPuesto, MAX_NOMBRE } from '../../lib/validaciones.js';

/** Alta o edición de un puesto. `inicial` trae los datos al editar. */
export default function FormularioPuesto({ categorias, inicial, onGuardar, textoBoton = 'Guardar puesto' }) {
  const [datos, setDatos] = useState({
    nombre: inicial?.nombre ?? '',
    categoria: inicial?.categoria ?? '',
    descripcion: inicial?.descripcion ?? '',
    horario: inicial?.horario ?? '',
    punto: inicial ? { latitud: inicial.latitud, longitud: inicial.longitud } : null,
  });
  const [errores, setErrores] = useState({});
  const [errorServidor, setErrorServidor] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [guardado, setGuardado] = useState(false);

  const poner = (campo) => (valor) => {
    setGuardado(false);
    setDatos((d) => ({ ...d, [campo]: valor }));
  };

  const enviar = async (e) => {
    e.preventDefault();
    if (guardando) return;
    const r = validarPuesto({ ...datos, latitud: datos.punto?.latitud, longitud: datos.punto?.longitud });
    setErrores(r.errores);
    setErrorServidor('');
    if (!r.ok) return;
    setGuardando(true);
    try {
      await onGuardar({
        nombre: datos.nombre.trim(),
        categoria: datos.categoria,
        descripcion: datos.descripcion.trim(),
        horario: datos.horario.trim(),
        latitud: datos.punto.latitud,
        longitud: datos.punto.longitud,
      });
      setGuardado(true);
    } catch (err) {
      setErrorServidor(err.mensaje ?? 'No pudimos guardar los cambios.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <form onSubmit={enviar} noValidate className="space-y-5">
      {errorServidor && <Alerta tipo="error">{errorServidor}</Alerta>}
      {guardado && <Alerta tipo="exito">Guardamos los cambios de tu puesto.</Alerta>}

      <Campo
        etiqueta="Nombre del puesto"
        error={errores.nombre}
        hijo={(p) => <input {...p} maxLength={MAX_NOMBRE + 20} value={datos.nombre} onChange={(e) => poner('nombre')(e.target.value)} />}
      />
      <Campo
        etiqueta="Categoría"
        error={errores.categoria}
        hijo={(p) => (
          <select {...p} value={datos.categoria} onChange={(e) => poner('categoria')(e.target.value)}>
            <option value="">Elige una categoría</option>
            {categorias.map((c) => (
              <option key={c} value={c}>
                {nombreDeCategoria(c)}
              </option>
            ))}
          </select>
        )}
      />
      <Campo
        etiqueta="Horario"
        ayuda="Por ejemplo: 17:00 a 23:00"
        error={errores.horario}
        hijo={(p) => <input {...p} value={datos.horario} onChange={(e) => poner('horario')(e.target.value)} />}
      />
      <Campo
        etiqueta="Descripción"
        opcional
        hijo={(p) => <textarea {...p} rows={3} value={datos.descripcion} onChange={(e) => poner('descripcion')(e.target.value)} />}
      />
      <Campo
        etiqueta="Ubicación del puesto"
        ayuda="Marca el lugar donde te instalas."
        error={errores.ubicacion}
        hijo={(p) => <SelectorPunto id={p.id} valor={datos.punto} onChange={poner('punto')} error={errores.ubicacion} />}
      />

      <Boton type="submit" tamano="grande" icono={Save} cargando={guardando} className="w-full sm:w-auto">
        {textoBoton}
      </Boton>
    </form>
  );
}
