import { Compass } from 'lucide-react';
import Pagina from '../components/layout/Pagina.jsx';
import EstadoVacio from '../components/ui/EstadoVacio.jsx';
import Boton from '../components/ui/Boton.jsx';
import { useTitulo } from '../hooks/useTitulo.js';

export default function NoEncontrada() {
  useTitulo('Página no encontrada');
  return (
    <Pagina estrecha>
      <EstadoVacio icono={Compass} titulo="No encontramos esta página" accion={<Boton to="/">Volver al mapa</Boton>}>
        Puede que el enlace esté mal escrito o que la página ya no exista.
      </EstadoVacio>
    </Pagina>
  );
}
