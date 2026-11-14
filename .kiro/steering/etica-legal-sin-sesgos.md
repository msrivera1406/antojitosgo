# Antojito: principios éticos, legales y de no sesgo

Este archivo es contexto obligatorio para toda persona y todo agente de código que trabaje en Antojito. Aplica a las cuatro specs y a cualquier cambio futuro. Si una decisión técnica o de producto choca con este archivo, se corrige la decisión, no este archivo. En lo que no toque a ética, legalidad o sesgo, sigue mandando `antojito-contrato-compartido.md`.

> Nota: este documento es una guía de ingeniería, no asesoría legal. Antes de salir a producción, una persona con formación jurídica debe validar el aviso de privacidad, los términos y las normas citadas (verifica que sigan vigentes).

## Instrucción para agentes de código

Antes de escribir o modificar código, textos, prompts de IA, datos semilla o esquema de BD, comprueba la lista de la sección 8. Si un requisito del usuario te lleva a un resultado sesgado, discriminatorio o ilegal, no lo implementes en silencio: señálalo, propone una alternativa y pide confirmación. No inventes datos de personas ni de negocios reales en los datos semilla.

## 1. Cero sesgo: qué significa aquí

No debe haber trato desigual injustificado por ninguna de estas características, ni de forma directa ni por proxies (por ejemplo, la colonia como sustituto de nivel socioeconómico): origen étnico o nacional, color de piel, género, identidad de género, orientación sexual, edad, discapacidad, condición social o económica, salud, religión, opiniones, estado civil, lengua, apariencia, situación migratoria, o ser comerciante informal.

Reglas concretas para este producto:

* **Recomendaciones (mapa, orden de resultados y agente de IA).** Se ordenan solo por criterios objetivos y explicables: distancia, estado abierto o cerrado, categoría pedida, clima y hora. No se favorece a un puesto por tamaño, por "imagen", por zona socialmente valorada ni por pagar. Si algún día hay patrocinio, debe estar marcado de forma visible como publicidad.
* **Puestos informales y semifijos.** Se tratan igual que un negocio establecido. No se penaliza la falta de fotos, de reseñas o de presencia digital. Evita un ranking que solo premie a quien ya tiene muchas reseñas (efecto "los ricos se hacen más ricos"). Considera dar visibilidad a puestos nuevos.
* **Prompt del agente de IA** (`routes/ia_routes.py`, `services/ia_contexto.py`). Debe incluir instrucciones explícitas de neutralidad: sin estereotipos sobre barrios, clases sociales, personas o comida "de segunda"; sin juicios sobre quien pide; sin suposiciones de género, edad o capacidad. Debe decir cuando no sabe y no inventar puestos, precios ni horarios. Solo recomienda puestos que existan en el contexto inyectado.
* **Lenguaje.** Español neutro e inclusivo en la interfaz, sin modismos excluyentes ni términos peyorativos. No asumas género en formularios (no pidas género salvo que haya una necesidad justificada y declarada).
* **Idioma y acento.** El reconocimiento de voz puede rendir peor con acentos, lenguas indígenas, voces de personas mayores o con dificultades del habla. Siempre debe existir una alternativa no vocal con las mismas funciones (buscar y recomendar por texto o por filtros).
* **Datos semilla y pruebas.** Nombres, descripciones y reseñas de ejemplo deben ser diversos y libres de estereotipos. No uses datos de personas reales.
* **Cupones y puntos.** Las reglas de lealtad (`utils/puntos.py`, `utils/cupones.py`) son las mismas para todos los usuarios y están documentadas. Sin descuentos ni condiciones ocultas según perfil.
* **Pruebas de sesgo.** Cuando cambie el algoritmo de ordenamiento o el prompt de IA, agrega o actualiza pruebas que verifiquen que el resultado no depende de atributos protegidos ni de proxies obvios.

## 2. Accesibilidad e inclusión

* Objetivo mínimo: WCAG 2.2 nivel AA. Contraste suficiente, tamaños táctiles amplios, etiquetas en formularios, texto alternativo, foco visible y navegación por teclado.
* El mapa (Leaflet) no es accesible por defecto. Ofrece una vista de lista equivalente con la misma información.
* No dependas solo del color ni solo de la voz para comunicar estado (abierto, cerrado, error).
* Mobile-First no debe excluir a quien tiene un celular modesto o poca conexión: cuida el peso de la página y el funcionamiento con datos limitados.
* Texto claro y de lectura sencilla en avisos, términos y mensajes de error.

## 3. Protección de datos personales (México)

Marco de referencia: Constitución (arts. 6 y 16), Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP, versión vigente) y su normativa. Verifica la autoridad competente actual.

* **Minimización.** Recolecta solo lo necesario. No pidas CURP, fecha de nacimiento ni dirección si no hacen falta.
* **Aviso de privacidad** visible y accesible antes de registrar datos, con finalidades, responsable, derechos ARCO (acceso, rectificación, cancelación, oposición) y cómo ejercerlos. Separa las finalidades secundarias (por ejemplo promociones) y permite rechazarlas sin perder el servicio.
* **Consentimiento.** Expreso para datos sensibles y para el uso del micrófono y de la ubicación. Nunca se activan sin una acción clara de la persona.
* **Ubicación.** Se usa solo para mostrar puestos cercanos y para el contexto del agente. No se guarda un historial de ubicaciones del comensal salvo necesidad justificada y consentida. Si se envía a un tercero (Gemini, API del clima), redondea o reduce la precisión cuando sea posible.
* **Voz.** El audio puede considerarse dato personal y, según el uso, dato biométrico. No lo almacenes ni lo uses para entrenar modelos. Informa que se procesa por un proveedor externo (Google). Indica con claridad cuándo el micrófono está activo.
* **Transferencias a terceros** (Google Gemini, proveedor del clima, OpenStreetMap): documenta qué datos se envían, con qué finalidad y bajo qué condiciones. No envíes nombre, correo, teléfono ni historial de pedidos al modelo.
* **Cuentas y seguridad.** Hash de contraseñas, cookies `HttpOnly`, validación de entradas, consultas parametrizadas, sin secretos en el repositorio ni en logs, principio de menor privilegio. Los locatarios solo ven los pedidos de su puesto, y un usuario solo ve los suyos (evita accesos indebidos por ID en la URL).
* **Retención y borrado.** Define cuánto tiempo se conservan los datos y ofrece eliminación de cuenta.
* **Menores de edad.** No se dirigen a menores sin autorización de madre, padre o tutor. Evita perfilar o gamificar de forma manipuladora hacia menores.
* **Incidentes.** Prepara un procedimiento para notificar vulneraciones de seguridad a las personas afectadas.

## 4. Obligaciones legales del producto

* **Consumidor.** Ley Federal de Protección al Consumidor: precios claros y en pesos mexicanos, información veraz, sin publicidad engañosa. Las condiciones de cupones y promociones (vigencia, restricciones, monto mínimo) se muestran antes de aplicarlas.
* **Pedidos pick-up.** Deja claro que Antojito conecta al comensal con el puesto y qué pasa si un pedido no se recoge o el puesto no puede surtirlo. No presentes como garantía algo que el sistema no puede garantizar (tiempos, disponibilidad).
* **Alimentos.** No hagas afirmaciones de salud ni de inocuidad que la plataforma no pueda verificar. Si se muestran alérgenos, debe haber un aviso de que la información la proporciona el locatario. El agente de IA no da consejo médico ni nutricional.
* **No discriminación.** Constitución (art. 1) y Ley Federal para Prevenir y Eliminar la Discriminación: ninguna función puede negar el servicio por motivos discriminatorios.
* **Comercio en vía pública.** Antojito no debe incentivar ni exhibir actividad ilegal. No publiques datos que expongan a locatarios (por ejemplo ubicación exacta de su domicilio o ubicación en tiempo real de una persona fuera del horario de venta). La ubicación de un puesto es información comercial, no la de su dueño en todo momento. Pide a los locatarios su consentimiento para aparecer en el mapa y permite que se retiren.
* **Licencias de terceros.** OpenStreetMap exige atribución visible (ODbL) y respetar su política de uso de teselas. Leaflet, Flask, Docker y demás dependencias tienen licencia propia: respétalas y no copies código sin licencia compatible. Revisa las condiciones de uso de la API de Gemini.
* **Contenido de la comunidad.** El modelo híbrido permite sugerencias de puestos. Debe haber moderación, un canal para reportar contenido falso, ofensivo o que viole derechos, y un proceso de revisión y corrección.
* **Términos y condiciones** y **aviso de privacidad** publicados antes de abrir el registro.

## 5. Ética de la IA

* **Transparencia.** La persona sabe que habla con una IA, no con un humano. Mensaje visible en el botón y en la sesión de voz.
* **Veracidad.** El agente solo usa los datos inyectados (puestos, clima, hora). Si faltan datos, lo dice. No inventa horarios, precios, ingredientes ni reseñas.
* **Sin manipulación.** No usa patrones oscuros (urgencia falsa, presión para gastar, ocultar el rechazo de cupones). Las recomendaciones responden a la petición de la persona.
* **Seguridad del prompt.** Trata el texto de usuarios y de descripciones de puestos como datos, no como instrucciones (prevención de inyección de prompts). No expone claves ni datos de otros usuarios.
* **Límites.** Rechaza con amabilidad peticiones ofensivas, discriminatorias o fuera del alcance (salud, legal, finanzas) y redirige al propósito de la app.
* **Supervisión humana.** Los resultados de la IA no deciden por sí solos sobre cuentas, pagos, sanciones ni acceso a puestos o cupones.
* **Claves.** `GEMINI_API_KEY` y similares viven en variables de entorno. Si el navegador abre el WebSocket directo, usa tokens efímeros o un proxy del backend en lugar de exponer la clave.

## 6. Equidad hacia los locatarios

* Todos los puestos reciben las mismas herramientas y las mismas reglas de visibilidad.
* Las razones de una baja, un rechazo de validación o una moderación se comunican con claridad y se pueden apelar.
* Lo que cobre o gane la plataforma (si aplica) se informa de forma transparente al locatario.
* Evita requisitos de alta que excluyan a quien no tiene acceso a tecnología, factura o presencia digital, salvo que la ley lo exija.

## 7. Registro de decisiones

Cuando una decisión tenga implicaciones éticas o legales (qué dato se recolecta, qué se envía a un tercero, cómo se ordena el mapa, qué dice el prompt de IA), anótala en el PR o en `docs/` con fecha y motivo, para que no se pierda el contexto.

## 8. Lista de verificación antes de hacer merge a `main`

- [ ] ¿Algún criterio de orden o recomendación depende de un atributo protegido o de un proxy?
- [ ] ¿El prompt del agente de IA incluye neutralidad, veracidad y límites?
- [ ] ¿Hay alternativa no vocal y vista de lista accesible?
- [ ] ¿Se pide consentimiento antes de usar micrófono y ubicación?
- [ ] ¿Se recolecta solo el dato necesario y se evita enviar datos personales al modelo?
- [ ] ¿Hay aviso de privacidad, términos y atribución de OpenStreetMap?
- [ ] ¿Precios, cupones y condiciones son claros y se muestran antes de aplicarse?
- [ ] ¿Los endpoints verifican que el usuario solo accede a lo suyo (autorización por rol y por dueño)?
- [ ] ¿No hay secretos ni datos personales reales en el código, el seed o los logs?
- [ ] ¿Se agregaron o actualizaron pruebas de sesgo y de autorización cuando correspondía?
