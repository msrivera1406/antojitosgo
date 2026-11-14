import { useRef, useState } from 'react';
import { Camera, Send, X } from 'lucide-react';
import Boton from '../ui/Boton.jsx';
import Campo from '../ui/Campo.jsx';
import Alerta from '../ui/Alerta.jsx';
import SelectorPunto from '../mapa/SelectorPunto.jsx';
import { nombreDeCategoria } from '../ui/IconoCategoria.jsx';
import { MAX_NOMBRE, MAX_RESENA, validarRecomendacion } from '../../lib/validaciones.js';

/**
 * Formulario para sugerir un puesto. Valida en el cliente, muestra cada error junto a su campo,
 * bloquea el botón mientras envía y conserva lo escrito si el servidor responde con error.
 */
export default function FormularioRecomendar({ categorias, onEnviar }) {
  const [datos, setDatos] = useState({ nombre: '', categoria: '', descripcion: '', punto: null, foto: null });
  const [errores, setErrores] = useState({});
  const [errorServidor, setErrorServidor] = useState('');
  const [enviando, setEnviando] = useState(false);
  const entradaFoto = useRef(null);

  const poner = (campo) => (valor) => setDatos((d) => ({ ...d, [campo]: valor }));

  const enviar = async (e) => {
    e.preventDefault();
    if (enviando) return;
    const { punto, ...resto } = datos;
    const resultado = validarRecomendacion({ ...resto, latitud: punto?.latitud, longitud: punto?.longitud });
    setErrores(resultado.errores);
    setErrorServidor('');
    if (!resultado.ok) return;

    const form = new FormData();
    form.append('nombre', datos.nombre.trim());
    form.append('categoria', datos.categoria);
    form.append('latitud', punto.latitud.toFixed(8));
    form.append('longitud', punto.longitud.toFixed(8));
    if (datos.descripcion.trim()) form.append('descripcion', datos.descripcion.trim());
    if (datos.foto) form.append('foto', datos.foto);

    setEnviando(true);
    try {
      await onEnviar(form);
    } catch (err) {
      setErrorServidor(err.mensaje ?? 'No pudimos enviar tu recomendación. Inténtalo de nuevo.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <form onSubmit={enviar} noValidate className="space-y-6">
      {errorServidor && <Alerta tipo="error">{errorServidor}</Alerta>}

      <Campo
        etiqueta="Nombre del puesto"
        error={errores.nombre}
        hijo={(p) => (
          <input {...p} type="text" maxLength={MAX_NOMBRE + 20} value={datos.nombre} onChange={(e) => poner('nombre')(e.target.value)} />
        )}
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
        etiqueta="¿Dónde está?"
        ayuda="Toca el mapa para colocar el pin o usa tu ubicación actual."
        error={errores.ubicacion}
        hijo={(p) => <SelectorPunto id={p.id} valor={datos.punto} onChange={poner('punto')} error={errores.ubicacion} />}
      />

      <Campo
        etiqueta="Tu reseña breve"
        opcional
        error={errores.descripcion}
        ayuda="Cuéntanos qué vende y por qué te gusta."
        hijo={(p) => (
          <div className="space-y-1">
            <textarea {...p} rows={4} value={datos.descripcion} onChange={(e) => poner('descripcion')(e.target.value)} />
            <p className={`text-right text-etiqueta font-bold ${datos.descripcion.length > MAX_RESENA ? 'text-peligro' : 'text-tinta-600'}`}>
              {datos.descripcion.length} de {MAX_RESENA}
            </p>
          </div>
        )}
      />

      <Campo
        etiqueta="Foto"
        opcional
        error={errores.foto}
        ayuda="JPG, PNG o WebP, de hasta 5 MB."
        hijo={(p) => (
          <div className="space-y-2">
            <input
              {...p}
              ref={entradaFoto}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={(e) => poner('foto')(e.target.files?.[0] ?? null)}
            />
            <div className="flex flex-wrap items-center gap-2">
              <Boton variante="secundario" icono={Camera} onClick={() => entradaFoto.current?.click()}>
                {datos.foto ? 'Cambiar foto' : 'Agregar foto'}
              </Boton>
              {datos.foto && (
                <button
                  type="button"
                  onClick={() => {
                    poner('foto')(null);
                    if (entradaFoto.current) entradaFoto.current.value = '';
                  }}
                  className="inline-flex min-h-toque items-center gap-1.5 rounded-suave px-2 font-bold text-tinta-700 hover:bg-tinta-100"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                  Quitar
                </button>
              )}
            </div>
            {datos.foto && <p className="break-all text-etiqueta font-semibold text-tinta-700">{datos.foto.name}</p>}
          </div>
        )}
      />

      <Boton type="submit" tamano="grande" className="w-full" cargando={enviando} icono={Send}>
        Enviar recomendación
      </Boton>
    </form>
  );
}
