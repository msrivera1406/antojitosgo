import { useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import Pagina from '../components/layout/Pagina.jsx';
import RutaProtegida from '../components/auth/RutaProtegida.jsx';
import Cargando from '../components/ui/Cargando.jsx';
import Alerta from '../components/ui/Alerta.jsx';
import Boton from '../components/ui/Boton.jsx';
import TarjetaInsignia from '../components/perfil/TarjetaInsignia.jsx';
import PedidosActivos from '../components/perfil/PedidosActivos.jsx';
import ProgresoLealtad from '../components/perfil/ProgresoLealtad.jsx';
import SeccionCupones from '../components/perfil/SeccionCupones.jsx';
import HistorialPedidos from '../components/perfil/HistorialPedidos.jsx';
import { authApi } from '../services/endpoints.js';
import { useCarga } from '../hooks/useCarga.js';
import { useSondeo } from '../hooks/useSondeo.js';
import { useAuth } from '../context/AuthContext.jsx';
import { esActivo } from '../lib/pedidos.js';
import { useTitulo } from '../hooks/useTitulo.js';

const INTERVALO_MS = 15000;

function ContenidoPerfil() {
  const { usuario, cerrarSesion } = useAuth();
  const navegar = useNavigate();
  const perfil = useCarga(() => authApi.perfil(usuario.id), [usuario.id]);
  const datos = perfil.datos;
  const activos = (datos?.pedidos ?? []).filter(esActivo);

  // Mientras haya pedidos activos y la pestaña esté visible, se refresca el estado cada 15 s.
  useSondeo(() => perfil.recargar({ silencioso: true }), INTERVALO_MS, activos.length > 0);

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
      <TarjetaInsignia nombre={usuario.nombre} puntos={datos.puntos} />
      <PedidosActivos pedidos={activos} />
      <ProgresoLealtad progreso={datos.progreso} />
      <SeccionCupones cupones={datos.cupones} />
      <HistorialPedidos pedidos={datos.pedidos} />
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
