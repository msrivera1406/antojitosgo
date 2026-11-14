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

## Alcance
AntojitosGo sirve para **descubrir puestos en el mapa, consultar su menú y dejar reseñas**. No hay pedidos, carrito, pagos ni cupones en la interfaz. Los locatarios administran su menú, sus datos y ven sus reseñas.

## Datos de ejemplo
Por defecto el frontend usa la API real de Flask. Para trabajar sin backend crea `frontend/.env.local` con `VITE_USAR_DUMMY=true`: las respuestas simuladas están en `src/services/mock/`. En ese modo cualquier correo con contraseña de 8 o más caracteres entra, y un correo que empiece con "marco" entra como locatario.

## Con Docker
`docker compose up --build` levanta la BD, Flask (:5000), phpMyAdmin (:8080) y Vite (:5173, con proxy de `/api` y `/static` hacia Flask). Abre http://localhost:5173. Usuarios de prueba en `database.sql` (por ejemplo `ana@antojito.mx` / `Cliente1234`).

## Estructura
```
src/lib/          Lógica pura y probada (filtros, validaciones, geo, navegación, rutas seguras)
src/services/     apiFetch, endpoints y datos de ejemplo
src/context/      Sesión y ubicación (expone window.AntojitoUbicacion)
src/components/   ui, layout, puestos, mapa, resenas, ia, locatario, perfil, auth
src/pages/        Inicio, Login, Recomendar, Puesto, Locatario, Perfil
```
Los tokens de color, tipografía, radios y sombras viven en `tailwind.config.js`.

## Integración
* **Mapa:** MapLibre GL con teselas de OpenStreetMap (`src/components/mapa/`).
* **Asistente:** con backend se monta el widget real de Int. 3 (`static/js/gemini_live.js`) desde `src/components/ia/WidgetIA.jsx`. Si cambia `templates/partials/boton_ia.html`, hay que copiar el marcado en `src/components/ia/marcadoIA.js`.
* **Flask:** `app.py` sirve `frontend/dist` en las rutas de vistas si existe (`npm run build`).
