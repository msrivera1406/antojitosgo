import { useState } from 'react';
import { LogIn, UserPlus } from 'lucide-react';
import Boton from '../ui/Boton.jsx';
import Campo from '../ui/Campo.jsx';
import Alerta from '../ui/Alerta.jsx';
import CampoContrasena from './CampoContrasena.jsx';
import SelectorRol from './SelectorRol.jsx';
import { validarAcceso } from '../../lib/validaciones.js';

/**
 * Formulario de entrar o crear cuenta (`modo`: 'login' | 'registro').
 * Si el servidor responde con error, se muestra su mensaje y se conserva lo que la persona escribió.
 */
export default function FormularioAcceso({ modo, onEnviar }) {
  const esRegistro = modo === 'registro';
  const [datos, setDatos] = useState({ nombre: '', email: '', password: '', rol: 'cliente' });
  const [errores, setErrores] = useState({});
  const [errorServidor, setErrorServidor] = useState('');
  const [enviando, setEnviando] = useState(false);

  const poner = (campo) => (valor) => setDatos((d) => ({ ...d, [campo]: valor }));

  const enviar = async (e) => {
    e.preventDefault();
    if (enviando) return;
    const resultado = validarAcceso(datos, modo);
    setErrores(resultado.errores);
    setErrorServidor('');
    if (!resultado.ok) return;
    setEnviando(true);
    try {
      await onEnviar(
        esRegistro
          ? { nombre: datos.nombre.trim(), email: datos.email.trim(), password: datos.password, rol: datos.rol }
          : { email: datos.email.trim(), password: datos.password },
      );
    } catch (err) {
      setErrorServidor(err.mensaje ?? 'No pudimos completar la acción. Inténtalo de nuevo.');
      setEnviando(false);
    }
  };

  return (
    <form onSubmit={enviar} noValidate className="space-y-5">
      {errorServidor && <Alerta tipo="error">{errorServidor}</Alerta>}

      {esRegistro && (
        <Campo
          etiqueta="Tu nombre"
          error={errores.nombre}
          hijo={(p) => <input {...p} type="text" value={datos.nombre} onChange={(e) => poner('nombre')(e.target.value)} autoComplete="name" />}
        />
      )}
      <Campo
        etiqueta="Correo electrónico"
        error={errores.email}
        hijo={(p) => (
          <input {...p} type="email" inputMode="email" value={datos.email} onChange={(e) => poner('email')(e.target.value)} autoComplete="email" />
        )}
      />
      <CampoContrasena
        valor={datos.password}
        onChange={poner('password')}
        error={errores.password}
        autoComplete={esRegistro ? 'new-password' : 'current-password'}
      />
      {esRegistro && <SelectorRol valor={datos.rol} onChange={poner('rol')} error={errores.rol} />}

      <Boton type="submit" tamano="grande" className="w-full" cargando={enviando} icono={esRegistro ? UserPlus : LogIn}>
        {esRegistro ? 'Crear cuenta' : 'Entrar'}
      </Boton>
    </form>
  );
}
