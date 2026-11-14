import { useNavigate } from 'react-router-dom';
import { LogOut, MapPinPlus } from 'lucide-react';
import Pagina from '../components/layout/Pagina.jsx';
import RutaProtegida from '../components/auth/RutaProtegida.jsx';
import Cargando from '../components/ui/Cargando.jsx';
import Alerta from '../components/ui/Alerta.jsx';
import Boton from '../components/ui/Boton.jsx';
import TarjetaInsignia from '../components/perfil/TarjetaInsignia.jsx';
import ComoSeGanan from '../components/perfil/ComoSeGanan.jsx';
import { authApi } from '../services/endpoints.js';
import { useCarga } from '../hooks/useCarga.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useTitulo } from '../hooks/useTitulo.js';

function ContenidoPerfil() {
  const { usuario, cerrarSesion } = useAuth();
  const navegar = useNavigate();
  const perfil = useCarga(() => authApi.perfil(usuario.id), [usuario.id]);

  if (perfil.cargando) return <Cargando texto="Cargando tu perfil" className="flex-1" />;
  if (perfil.error) {
    return (
      <Pagina estrecha>
        <Alerta tipo="error" titulo="No pudimos cargar tu perfil" accion={<Boton variante="secundario" tamano="chico" onClick={() => perfil.recargar()}>Reintentar</Boton>}>
          {perfil.error.mensaje}
        </Alerta>
      </Pagina>
    );
  }

  return (
    <Pagina estrecha>
      <TarjetaInsignia nombre={usuario.nombre} puntos={perfil.datos.puntos ?? usuario.puntos} />
      <div className="space-y-3 rounded-tarjeta bg-white p-5 shadow-tarjeta">
        <h2 className="seccion-titulo">Ayuda a la comunidad</h2>
        <p className="text-tinta-700">¿Conoces un puesto que no está en el mapa? Recomiéndalo y gana 50 puntos. También puedes dejar reseñas en cualquier puesto.</p>
        <div className="grid gap-2 sm:grid-cols-2">
          <Boton to="/recomendar" icono={MapPinPlus}>Recomendar un puesto</Boton>
          <Boton to="/" variante="secundario">Explorar el mapa</Boton>
        </div>
      </div>
      <ComoSeGanan />
      <Boton
        variante="secundario"
        icono={LogOut}
        className="w-full"
        onClick={async () => {
          await cerrarSesion();
          navegar('/');
        }}
      >
        Cerrar sesión
      </Boton>
    </Pagina>
  );
}

export default function Perfil() {
  useTitulo('Mi perfil');
  return (
    <RutaProtegida>
      <ContenidoPerfil />
    </RutaProtegida>
  );
}
