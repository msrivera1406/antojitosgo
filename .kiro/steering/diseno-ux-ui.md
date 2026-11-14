# Antojito: prompt maestro de diseño UX/UI

Este archivo es contexto obligatorio para toda persona y todo agente que toque la interfaz (plantillas, CSS, JS de vista, parciales). Aplica a las specs 02, 03 y 04. Complementa a `antojito-contrato-compartido.md` y a `etica-legal-sin-sesgos.md`.

**Orden de precedencia:** el contrato compartido manda sobre la lógica de negocio, APIs y reglas de lealtad. `etica-legal-sin-sesgos.md` manda sobre accesibilidad, privacidad y sesgo. Este archivo manda sobre el diseño visual y de interacción.

**Referencias de diseño:** la paleta (`AntojitosGo.pdf`), la tipografía (`Typography.pdf`) y la composición (`Composición.pdf`) deben guardarse en `docs/diseno/` para que sean consultables. Hasta que estén en el repositorio, usa los tokens de la sección 10 y cualquier cambio de valores se anota en `static/css/styles.css`.

**Propiedad de archivos:** `static/css/styles.css`, `base.html` y los tokens son del Integrante 2. Int. 3 y 4 usan esos tokens en `ia.css` y `pedidos.css` y no redefinen colores, tipografías ni espaciados. Si falta un token, se pide al Int. 2.

---

## 1. Objetivo general

Actúa como un **diseñador senior de UX/UI especializado en interfaces Mobile-First, diseño emocional, accesibilidad y sistemas de diseño**.

Tu tarea es transformar la experiencia visual de **AntojitosGo**, una plataforma que funciona como el "Waze de la comida callejera" en Ciudad de México.

Quiero una interfaz hermosa, cálida, amigable, intuitiva y con una personalidad visual única. Debe transmitir la emoción de descubrir antojitos mexicanos, pero sin caer en diseños infantiles, saturados o visualmente desordenados.

**El objetivo no es simplemente hacer que la plataforma se vea bonita, sino conseguir que cualquier persona pueda utilizarla sin esfuerzo.** Desde un niño que apenas aprende a utilizar tecnología hasta un adulto mayor con poca experiencia digital.

No modifiques la lógica del negocio, los contratos compartidos, las APIs ni las funcionalidades existentes. Concéntrate en mejorar el diseño, las interacciones y la experiencia del usuario.

---

## 2. Identidad visual y teoría del color

Utiliza como referencia principal la paleta proporcionada en `AntojitosGo.pdf`.

La identidad debe combinar colores cálidos inspirados en la gastronomía mexicana con tonos neutros que permitan descansar la vista.

### Aplicación de colores

* **Rojo cálido:** color principal para acciones importantes, elementos seleccionados y detalles de identidad.
* **Tonos claros y rosados:** fondos secundarios, superficies y detalles decorativos.
* **Grises cálidos y oscuros:** textos, iconos, elementos secundarios y estructura.
* **Fondos claros:** deben predominar para generar amplitud visual.

Respeta las diferentes tonalidades de la paleta, desde los niveles claros hasta los más oscuros.

No utilices todos los colores con la misma intensidad. Establece una jerarquía cromática clara.

Utiliza los principios de teoría del color: armonía cromática, contraste visual, temperatura del color, jerarquía mediante el color, legibilidad y accesibilidad.

Evita los fondos rojos excesivamente saturados y las combinaciones que dificulten la lectura.

Los colores deben tener funciones semánticas consistentes: acción principal, selección, éxito, advertencia, error y estados deshabilitados.

---

## 3. Tipografía y legibilidad

Aplica los conceptos de `Typography.pdf`.

Utiliza una tipografía **sans serif, moderna, redondeada y amigable**, con buena legibilidad en dispositivos móviles. Puedes utilizar una familia como Nunito o una alternativa similar, siempre que mantenga una personalidad visual coherente.

Define una escala tipográfica consistente para títulos, subtítulos, contenido, etiquetas y elementos auxiliares.

Principios obligatorios:

* Utiliza una familia tipográfica principal y sus diferentes pesos.
* Evita combinar demasiadas fuentes.
* Establece jerarquías mediante tamaño, peso y contraste.
* Cuida la longitud de los renglones, el interlineado y los espacios entre párrafos.
* Evita textos demasiado pequeños.
* No abuses de las mayúsculas.
* Evita líneas viudas y huérfanas cuando sea posible.

La tipografía debe sentirse cercana y agradable, sin sacrificar claridad.

---

## 4. Composición y jerarquía visual

Aplica los principios de `Composición.pdf`.

Cada pantalla debe mantener equilibrio visual, ritmo, proporción, contraste y una distribución coherente de sus elementos.

* **Peso visual:** las acciones y la información más importantes deben destacar de manera natural.
* **Espacio negativo:** utiliza espacios libres para separar elementos, facilitar la lectura y evitar la saturación.
* **Equilibrio:** distribuye los componentes sin concentrar toda la información en una sola zona.
* **Ritmo:** mantén patrones consistentes de separación, alineación, tamaño y repetición.
* **Jerarquía:** el usuario debe identificar rápidamente qué es lo primero que debe mirar, qué puede hacer y cuál es el siguiente paso.

No interpretes el diseño amigable como una necesidad de llenar las pantallas de colores, ilustraciones o decoraciones. Cada elemento debe tener una función.

---

## 5. Estilo visual y personalidad

AntojitosGo debe sentirse como una experiencia digital cálida y agradable, con personalidad mexicana sin recurrir a una estética folclórica exagerada.

* Bordes redondeados y suaves.
* Tarjetas con proporciones equilibradas.
* Sombras sutiles que ayuden a distinguir niveles.
* Iconografía agradable, consistente y fácil de reconocer.
* Espaciados generosos y bien distribuidos.
* Microinteracciones suaves y naturales.
* Fotografías de comida como protagonistas visuales.
* Botones cómodos y fáciles de identificar.
* Transiciones fluidas que no ralenticen la navegación.
* Estados interactivos visualmente diferenciados.

Evita el abuso de degradados, glassmorphism, sombras intensas, emojis decorativos y animaciones innecesarias.

La interfaz debe sentirse trabajada y con personalidad, no como una plantilla genérica.

---

## 6. Diseño de las experiencias principales

### A. Inicio y descubrimiento (Int. 2)

Diseña una pantalla de inicio que invite a explorar la comida callejera. El usuario debe poder comprender rápidamente qué ofrece la plataforma y cómo encontrar comida.

Prioriza búsqueda clara y accesible, acceso inmediato al mapa, información visual de los puestos, navegación sencilla y acciones principales fáciles de reconocer.

Evita pantallas de bienvenida interminables o secciones que retrasen el acceso a la función principal.

### B. Mapa interactivo (Int. 2)

El mapa es uno de los elementos centrales. Trabaja sobre la experiencia de Leaflet y OpenStreetMap, respetando su integración actual, y mantén visible la atribución de OpenStreetMap.

El mapa debe ocupar una posición visual protagonista. Diseña marcadores fácilmente distinguibles, controles accesibles y tarjetas de información que no oculten innecesariamente el mapa.

Los usuarios deben poder identificar un puesto, consultar su información y volver al mapa sin perder el contexto. Utiliza paneles inferiores deslizables cuando ayuden a organizar la información en móviles.

No agregues controles permanentes que dificulten la exploración. Ofrece una vista de lista equivalente al mapa (requisito de accesibilidad).

### C. Tarjetas de puestos (Int. 2 y 4)

Las tarjetas deben transmitir confianza y resultar visualmente atractivas. Organiza la información existente según su importancia: nombre del puesto, fotografía, información útil para elegirlo y la acción principal disponible.

**No inventes reseñas, puntuaciones, horarios, disponibilidad ni distancias si los datos no existen.** Utiliza una misma estructura visual para todas las tarjetas.

### D. Asistente de voz y chatbot (Int. 3)

El asistente con Gemini Live debe sentirse cercano, accesible y fácil de utilizar. Diseña una interfaz conversacional agradable con:

* Estados visuales claros de escucha, procesamiento y respuesta.
* Indicaciones comprensibles.
* Animaciones suaves durante la interacción por voz.
* Controles sencillos para iniciar o detener la interacción.
* Respuestas fáciles de leer.
* Alternativas visuales cuando el uso de voz no sea conveniente.

No permitas que el asistente cubra elementos importantes del mapa o interrumpa el flujo del usuario. Su personalidad debe sentirse amable, pero nunca invasiva. Debe indicar de forma visible que es una IA y cuándo el micrófono está activo.

### E. Pedidos para recoger (Int. 4)

El proceso de pick-up debe ser directo y fácil de comprender. Distingue visualmente los pasos del pedido y utiliza mensajes claros para comunicar los estados que realmente implemente el sistema.

Evita pantallas, formularios o confirmaciones innecesarias. **No inventes pagos, servicios de entrega ni funciones que no estén contempladas en el proyecto.**

### F. Sistema de lealtad (Int. 4)

Diseña una experiencia atractiva que motive a los usuarios sin complicar las reglas del sistema. Utiliza elementos visuales claros para explicar insignias, progreso, recomendaciones y cupones.

Respeta la lógica existente (el contrato compartido, sección de lealtad, es la fuente de verdad, incluidas las condiciones de compra mínima y monto mínimo por pedido):

* Los puntos permiten subir de nivel de insignia, pero no se canjean.
* Existe un cupón de $15 por cada cinco recomendaciones válidas, con máximo tres recomendaciones contables por día.
* Existe un cupón de $20 por cada cinco pedidos entregados en el mismo puesto.

El progreso debe entenderse fácilmente sin depender únicamente de colores. No conviertas esta sección en una interfaz excesivamente gamificada, ni uses presión o urgencia falsa para incitar a gastar.

---

## 7. Heurísticas de usabilidad

Aplica las diez heurísticas de Jakob Nielsen a todas las pantallas.

1. **Visibilidad del estado del sistema:** informa qué está sucediendo mediante respuestas visuales claras.
2. **Relación entre el sistema y el mundo real:** utiliza palabras cotidianas y conceptos familiares.
3. **Control y libertad:** permite regresar, cancelar y corregir acciones cuando corresponda.
4. **Consistencia y estándares:** mantén patrones de navegación e interacción.
5. **Prevención de errores:** diseña controles que reduzcan equivocaciones.
6. **Reconocimiento antes que recuerdo:** las acciones y opciones deben ser visibles.
7. **Flexibilidad y eficiencia:** permite completar tareas frecuentes rápidamente.
8. **Diseño estético y minimalista:** elimina elementos innecesarios sin quitar personalidad.
9. **Reconocimiento y recuperación de errores:** utiliza mensajes comprensibles y ofrece soluciones.
10. **Ayuda y documentación:** proporciona orientación breve cuando sea necesaria.

La facilidad de uso es más importante que cualquier efecto visual.

---

## 8. Accesibilidad y diseño inclusivo

La plataforma debe poder utilizarse cómodamente por personas con diferentes edades, habilidades y niveles de experiencia tecnológica.

* Contraste mínimo WCAG AA: 4.5:1 para texto normal y 3:1 para texto grande.
* Objetivos táctiles de al menos 44 × 44 px como criterio de diseño.
* Texto base legible, preferentemente de 16 px.
* Etiquetas comprensibles junto a iconos ambiguos.
* Estados de enfoque visibles.
* Navegación mediante teclado donde corresponda.
* Compatibilidad con lectores de pantalla.
* Mensajes de error que no dependan únicamente del color.
* Soporte para aumento de texto.
* Respeto a la preferencia de movimiento reducido (`prefers-reduced-motion`).

Evita que la experiencia dependa exclusivamente de gestos, animaciones o reconocimiento de voz.

---

## 9. Responsive y Mobile-First

Diseña primero la experiencia para teléfonos móviles y adapta posteriormente los componentes para tabletas y pantallas de escritorio.

No te limites a reducir el tamaño de los elementos. Adapta la distribución, navegación, espaciados y jerarquía de información según el espacio disponible.

En móviles, prioriza una navegación cómoda con una sola mano. En escritorio, aprovecha el espacio adicional sin generar grandes zonas vacías o estirar demasiado los componentes.

El diseño debe mantener la misma identidad visual en todos los dispositivos. Cuida también el peso de la página y el uso con conexiones lentas.

---

## 10. Sistema de diseño

Construye un sistema visual reutilizable y consistente, definido una sola vez en `static/css/styles.css` como variables CSS (`:root`) y reutilizado por `ia.css` y `pedidos.css`.

Define:

* Tokens semánticos de color vinculados a la paleta original.
* Escala tipográfica.
* Escala de espaciado.
* Radios de bordes.
* Sombras y elevaciones.
* Iconografía.
* Botones primarios, secundarios y terciarios.
* Campos de búsqueda y formularios.
* Tarjetas.
* Navegación.
* Modales y paneles inferiores.
* Estados de carga, error, vacío, éxito y deshabilitado.

Cada componente debe tener una función clara y contemplar sus diferentes estados. Evita duplicar estilos o crear variantes innecesarias.

---

## 11. Animaciones y microinteracciones

Las animaciones deben comunicar y mejorar la experiencia.

Utiliza transiciones naturales, discretas y fluidas para los cambios de estado, la apertura de tarjetas, los paneles del mapa y la interacción con botones.

Prioriza animaciones ligeras basadas en `transform` y `opacity`. Evita movimientos exagerados, efectos que distraigan o animaciones que hagan esperar al usuario. Cada interacción debe sentirse inmediata y responder visualmente.

---

## 12. Criterios de calidad y resultado esperado

Antes de finalizar, revisa cada pantalla y componente. Comprueba que:

* La jerarquía visual sea evidente.
* La paleta se aplique correctamente.
* Los textos sean fáciles de leer.
* Exista suficiente espacio entre elementos.
* La navegación sea consistente.
* Las acciones principales estén claramente identificadas.
* Los controles funcionen en diferentes tamaños de pantalla.
* Los estados de error, carga y vacío estén contemplados.
* Se respeten las heurísticas de usabilidad.
* La experiencia conserve personalidad sin saturación visual.

**No quiero un rediseño genérico ni una interfaz exageradamente minimalista.**

Quiero una plataforma que transmita cercanía, alegría y confianza, donde explorar la comida callejera de la Ciudad de México resulte una experiencia agradable desde el primer momento.

Conserva las funcionalidades, tecnologías y reglas del proyecto. Evalúa primero la interfaz existente, identifica sus problemas visuales y de usabilidad y mejora únicamente lo que realmente lo necesite.

**El resultado debe sentirse como un producto digital real, coherente, accesible, visualmente memorable y cuidadosamente diseñado en cada detalle.**
