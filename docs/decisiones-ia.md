# Decisiones de ética, privacidad y sesgo del asistente de IA

Registro pedido por `.kiro/steering/etica-legal-sin-sesgos.md` (sección 7). Spec 03, Integrante 3.
Fecha: 2026-11-14. Estas notas son de ingeniería, no asesoría legal: el aviso de privacidad y los términos deben validarse con una persona con formación jurídica.

## Qué datos salen de nuestro servidor y a quién

| Destino | Qué se envía | Para qué | Precisión / límites |
|---|---|---|---|
| Google (Gemini, voz) | Audio del micrófono, la ubicación aproximada y la lista de puestos cercanos (nombre, categoría, estatus, horario, distancia, productos y precios, si está abierto), hora y clima | Generar la respuesta hablada | Ubicación redondeada a 3 decimales (~110 m) por el cliente y en el prompt. Sin nombre, correo, teléfono, pedidos ni identificadores de usuario |
| Google (Gemini, chat) | Los mensajes de la persona (máx. 10 anteriores y el nuevo), la ubicación aproximada y el mismo contexto de puestos | Generar la respuesta de texto | Igual que arriba. El servidor ignora cualquier otro campo que llegue en la petición (hay una prueba) |
| Open-Meteo | Latitud y longitud | Obtener temperatura y lluvia | Redondeadas a 2 decimales (~1 km) en el servidor, además del redondeo del cliente |

## Qué se guarda

- **Audio:** no se guarda ni pasa por nuestro servidor. Va del navegador directo a Google con un token de un solo uso.
- **Mensajes del chat:** no se guardan. El historial vive solo en la memoria de la página.
- **Ubicación:** no se guarda. Llega como parámetro de la petición. Los registros de acceso del servidor pueden mostrar la URL con coordenadas (ya redondeadas): en producción conviene desactivar o recortar esos registros. Pendiente para Int. 1 en el despliegue.
- **Consentimiento de voz:** se recuerda en `localStorage` del propio navegador (clave `antojito_ia_voz_v1`), no en el servidor.

## Consentimiento y transparencia

- Antes de la primera sesión de voz se muestra un aviso: es una IA, la voz y la ubicación aproximada se envían a Google, Antojito no guarda el audio, y el micrófono solo está activo con el botón en verde o azul. Hay una opción "Prefiero escribir".
- El micrófono y la ubicación se piden solo después de un toque; nunca al cargar la página.
- Hay una etiqueta visible "Asistente de IA", la etiqueta accesible del botón dice que es inteligencia artificial, y el chat lleva una nota sobre cómo se procesan los mensajes.

## Recomendaciones sin sesgo

- Los puestos se ordenan solo por distancia. El estado abierto o cerrado, la categoría pedida, el clima y la hora los usa el modelo como criterios objetivos.
- Al modelo solo se le envían campos objetivos de cada puesto (lista blanca). No recibe descripciones libres, fotos, reseñas, dueño, fechas ni quién recomendó el puesto, para que un puesto sin fotos o reseñas no quede en desventaja y para reducir la inyección de instrucciones por texto de usuarios.
- El prompt exige neutralidad (sin estereotipos de barrios, clases sociales, personas, orígenes ni tipos de comida), trato igual a todos los puestos, lenguaje sin asumir género, y no presionar para comprar.
- Límites del agente: no da consejo médico, nutricional, legal ni financiero, no afirma que un platillo sea seguro para alergias o dietas, y rechaza con amabilidad lo ofensivo o fuera de alcance.
- Pruebas: la lista blanca de campos, que el prompt no cambia si solo cambian campos no objetivos, que el orden lo da la distancia y no el estatus ni el menú, y que el chat no reenvía datos personales extra al modelo.

## Alternativa no vocal

El chat de texto tiene las mismas funciones de recomendación que la voz y se abre solo si el micrófono no está disponible, se niega o el servicio de voz está saturado.

## Pendientes conocidos

- Aviso de privacidad y términos publicados (responsabilidad del equipo; el aviso de voz de este asistente no los reemplaza).
- Evaluar cómo rinde el reconocimiento de voz con acentos y voces diversas con personas reales; el chat existe como alternativa.
- Vista de lista accesible del mapa (Int. 2).
