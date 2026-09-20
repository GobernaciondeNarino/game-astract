# Diseño de la interfaz

## Fuentes de identidad

- **Manual de Identidad Visual (MIV) — Gobernación de Nariño, junio 2024**: tipografía principal
  *Hind Madurai* (títulos en Bold, cuerpo Regular), secundaria *Source Sans*; colores de marca
  verde `#10A13B` y amarillo `#FFD500`; grises `#383838` y `#4D4D4D`; logotipo horizontal con
  espacio de reserva y contraste adecuado sobre fondos claros.
- **Manual de Usabilidad y Estructura de los Sitios Web, marzo 2025**: encabezados Hind Madurai
  Bold 28–40 px, cuerpo sans-serif 16 px en gris oscuro `#4A4A4A`, azul institucional `#003366`,
  acentos verdes, SSL obligatorio, accesibilidad (Resolución 1519 de 2020) y compatibilidad móvil.
- **Requisitos del reto**: fondo `#fffcf3`, botones y líneas `#348afb`, estética futurista,
  contenedor `100% × 100vh` sin desplazamiento.

## Sistema de tokens

| Rol | Valor | Uso |
| --- | --- | --- |
| Fondo | `#060c1b` | Fondo general, cabecera (HUD) y modales; retícula fina azul al 6 % |
| Superficie | `#0b1428` / `#0d1a33` | Tarjetas, campos de texto y fichas 3D |
| Acento | `#348afb` (azul) | Botones primarios, líneas, bordes de fichas, aristas 3D, etiquetas |
| Texto | `#e8eefc` / `#b7c3dc` / `#8a9bbd` | Títulos, cuerpo y texto secundario (contraste ≥ 7:1 sobre el fondo) |
| Señal positiva | `#22c05c` | Acierto, nivel completado (ajuste luminoso del verde MIV para fondo oscuro) |
| Señal de alerta | `#ff4d63` | Fallo, acciones destructivas |
| Destaque | `#f5923e` (naranja) y `#ffd500` (amarillo MIV) | Figuras de portada, ciclo de color de objetos, sello y estrellas |

Tipografía: **Chakra Petch** (Google Fonts) para títulos, etiquetas y botones en mayúsculas con
tracking amplio; **Hind Madurai** (tipografía institucional) para el cuerpo de texto. Escala:
96/64 px título de portada, 26 px títulos de modal, 20 px pregunta, 16 px cuerpo, 12–13 px
etiquetas en mayúsculas.

## Bisel y esquineras

Botones, insignias y fichas 3D comparten un mismo trazo: cuadrado con las esquinas
superior-izquierda e inferior-derecha cortadas en diagonal (`clip-path` en HTML, `ExtrudeGeometry`
de una forma biselada en three.js). Las tarjetas (ranking, niveles, modales) llevan esquineras
azules en L arriba-izquierda y abajo-derecha. Las tarjetas de opción dibujan el borde biselado como
un anillo (polígono con hueco) para que el render 3D del lienzo inferior se vea a través de ellas.

## Elemento distintivo

Un solo lienzo WebGL renderiza, mediante *scissor viewports*, la portada (figuras 3D flotantes:
anillo hexagonal, estrella, triángulo, toro, cruz y flecha), la escena principal y las cuatro
opciones dentro de tarjetas HTML translúcidas. Al seleccionar una opción, esta se coloca en el
hueco del «?» de la escena principal (con marco azul) para comprobar la continuidad; al confirmar,
el marco pasa a verde o, si se falló, el hueco muestra la respuesta correcta.

## Decisiones de usabilidad

- Controles de al menos 44 px; teclas 1–4 / A–D y Enter como alternativa al ratón.
- Selección y confirmación en dos pasos para evitar respuestas accidentales (un fallo termina la
  partida).
- Feedback dentro de la interfaz (toast, colores de borde, previsualización) y modales solo para
  hitos: fallo con explicación y nivel completado con diploma.
- Temporizador que se detiene en modales y cuando la pestaña se oculta.
- En pantallas verticales las secuencias se muestran en 2×2 con numeración; el panel de
  axiomas del nivel 4 es plegable; la portada oculta las figuras flotantes por debajo de 700 px
  y permite desplazamiento interno sin que el contenedor principal se desplace.
- `prefers-reduced-motion` desactiva transiciones; el balanceo de los cubos se detiene en cuanto
  el usuario interactúa con la escena.

## Diploma

Formato A4 apaisado (1754 × 1240 px, 150 ppp): marco doble azul con esquinas reforzadas,
retícula de puntos, banda diagonal, logotipo institucional, título «DIPLOMA», nombre del
participante, texto del logro, puntaje y tiempo, sello hexagonal amarillo con el número de nivel,
fecha, código de verificación y línea de firma opcional configurable desde el panel.
