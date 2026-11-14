import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Pagina from '../components/layout/Pagina.jsx';
import Cargando from '../components/ui/Cargando.jsx';
import Alerta from '../components/ui/Alerta.jsx';
import FormularioRecomendar from '../components/puestos/FormularioRecomendar.jsx';
import ResultadoRecomendacion from '../components/puestos/ResultadoRecomendacion.jsx';
import { puestosApi } from '../services/endpoints.js';
import { useCarga } from '../hooks/useCarga.js';
import { useAuth } from '../context/AuthContext.jsx';
import { rutaLoginConNext } from '../lib/rutas.js';
import { useTitulo } from '../hooks/useTitulo.js';

export default function Recomendar() {
  useTitulo('Recomendar un puesto');
  const navegar = useNavigate();
  const { pathname } = useLocation();
  const { refrescar } = useAuth();
  const categorias = useCarga(() => puestosApi.categorias(), []);
  const [resultado, setResultado] = useState(null);

  const enviar = async (formData) => {
    try {
      const respuesta = await puestosApi.recomendar(formData);
      setResultado(respuesta);
      refrescar();
    } catch (e) {
      if (e.status === 401) navegar(rutaLoginConNext(pathname), { replace: true });
      throw e;
    }
  };

  if (resultado) {
    return (
      <Pagina estrecha>
        <ResultadoRecomendacion resultado={resultado} />
      </Pagina>
    );
  }

  return (
    <Pagina
      estrecha
      volverA="/"
      volverTexto="Volver al mapa"
      titulo="Recomienda un puesto"
      subtitulo="Ayuda a la comunidad a descubrir un buen lugar y gana 50 puntos."
    >
      {categorias.cargando && <Cargando texto="Preparando el formulario" />}
      {categorias.error && (
        <Alerta tipo="error" titulo="No pudimos cargar las categorías">
          Revisa tu conexión e inténtalo de nuevo.
        </Alerta>
      )}
      {categorias.datos && (
        <div className="rounded-panel bg-white p-5 shadow-tarjeta sm:p-6">
          <FormularioRecomendar categorias={categorias.datos} onEnviar={enviar} />
        </div>
      )}
    </Pagina>
  );
}
