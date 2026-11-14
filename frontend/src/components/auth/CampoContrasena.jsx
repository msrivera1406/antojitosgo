import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import Campo from '../ui/Campo.jsx';

/** Contraseña con botón para mostrarla u ocultarla (ayuda a quien se equivoca al teclear en el celular). */
export default function CampoContrasena({ valor, onChange, error, etiqueta = 'Contraseña', autoComplete }) {
  const [visible, setVisible] = useState(false);
  return (
    <Campo
      etiqueta={etiqueta}
      error={error}
      ayuda="Mínimo 8 caracteres."
      hijo={(props) => (
        <div className="relative">
          <input
            {...props}
            type={visible ? 'text' : 'password'}
            value={valor}
            onChange={(e) => onChange(e.target.value)}
            autoComplete={autoComplete}
            className={`${props.className} pr-14`}
          />
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            aria-pressed={visible}
            className="absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full text-tinta-600 hover:bg-tinta-100"
          >
            {visible ? <EyeOff className="h-5 w-5" aria-hidden="true" /> : <Eye className="h-5 w-5" aria-hidden="true" />}
          </button>
        </div>
      )}
    />
  );
}
