import { useEffect } from 'react';

export function useTitulo(titulo) {
  useEffect(() => {
    document.title = titulo ? `${titulo} | AntojitosGo` : 'AntojitosGo | Antojitos cerca de ti';
  }, [titulo]);
}
