# Frontend de AntojitosGo (React + Tailwind)

Interfaz Mobile-First que sigue `.kiro/steering/diseno-ux-ui.md` y `.kiro/steering/etica-legal-sin-sesgos.md`. Sustituye a las plantillas Jinja y al JavaScript puro que describía la spec 02. El contrato de API sigue siendo `.kiro/steering/antojito-contrato-compartido.md`.

## Arrancar
```bash
cd frontend
npm install
npm run dev      # http://localhost:5173 (proxy de /api hacia Flask en :5000)
npm test         # lógica pura con node --test (Node 18+)
npm run build    # genera frontend/dist
```

## Datos de ejemplo
Por defecto `VITE_USAR_DUMMY=true`: no hace falta backend. Las respuestas simuladas están en `src/services/mock/` con la forma del contrato. Para usar la API real, crea `frontend/.env.local` con `VITE_USAR_DUMMY=false`.
En modo de pruebas, cualquier correo con contraseña de 8 o más caracteres entra. Un correo que empiece con "marco" entra como locatario.

## Estructura
```
src/lib/          Lógica pura y probada (filtros, validaciones, carrito, lealtad, rutas seguras)
src/services/     apiFetch, endpoints y datos de ejemplo
src/context/      Sesión y ubicación (expone window.AntojitoUbicacion)
src/hooks/        Carga, sondeo con pausa por visibilidad, carrito en sessionStorage
src/components/   ui, layout, puestos, mapa, ia, pedidos, locatario, perfil, auth
src/pages/        Inicio, Login, Recomendar, Puesto, Locatario, Perfil
```
Los tokens de color, tipografía, radios y sombras viven en `tailwind.config.js`.

## Pendientes de integración
* **Mapa (tarea aparte):** `src/components/mapa/MapaPuestos.jsx` y `SelectorPunto.jsx` son espacios reservados. Sus comentarios describen el contrato (props) para sustituirlos por Leaflet y OpenStreetMap sin tocar las páginas. Deben mostrar la atribución de OpenStreetMap.
* **Asistente de voz (spec 03):** `src/hooks/useAsistenteDummy.js` simula los estados. El hook real de Gemini Live debe devolver la misma forma.
* **Servir desde Flask:** `app.py` (Int. 1) debe servir `frontend/dist/index.html` para las rutas `/`, `/puesto/<id>`, `/recomendar`, `/locatario`, `/perfil`, `/login` y `/registro`, y los archivos de `dist/assets`.
* **Paleta:** `AntojitosGo.pdf`, `Typography.pdf` y `Composición.pdf` no están en el repo. Los colores de `tailwind.config.js` son una propuesta cálida (rojo, rosados, grises cálidos) que debe ajustarse a la paleta oficial.
* **Fotos:** sin foto, cada tarjeta muestra el icono de su categoría. Con `foto_url` bajo `/static/uploads/` se muestra la foto.
