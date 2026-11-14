# Dependencias de terceros (vendor)

| Archivo | Origen | Licencia |
|---|---|---|
| `genai-3.3.0.mjs` | SDK `@google/genai` 3.3.0, build web con dependencias incluidas, descargado de `https://esm.sh/@google/genai@3.3.0/es2022/genai.bundle.mjs` | Apache-2.0 (Google LLC) |

Se guarda en el repositorio para que el asistente de voz no dependa de un CDN durante la demo.
`gemini_live.js` lo carga desde aquí y, si falla, desde `https://esm.sh/@google/genai@3.3.0`.
Para actualizarlo: descarga la nueva versión con el mismo comando y cambia el nombre del archivo y la constante `SDK_LOCAL` en `gemini_live.js`.
