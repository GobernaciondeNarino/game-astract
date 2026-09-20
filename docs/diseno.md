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
| Superficie | `#fffcf3` (crema) | Fondo general con retícula fina azul al 7 % y halos suaves |
| Acento | `#348afb` (azul) | Botones primarios, líneas, bordes de fichas y aristas 3D, etiquetas |
| Tinta | `#0b1f3a` (azul oscuro) | Títulos, símbolos de las matrices, trazos de los bloques |
| Texto | `#16283f` / `#4a4a4a` | Cuerpo y texto secundario (contraste ≥ 7:1 sobre crema) |
| Señal positiva | `#10a13b` (verde MIV) | Acierto, nivel completado |
| Señal de alerta | `#c8102e` | Fallo, acciones destructivas del panel |
| Destaque | `#ffd500` (amarillo MIV) | Sello del diploma, estrellas del nivel 4, tercer color de ciclo |

Tipografía: Hind Madurai (Google Fonts) con respaldo `system-ui`. Escala: 36/30 px títulos,
20 px pregunta, 16 px cuerpo, 12 px eyebrows en mayúsculas con tracking 0.2 em.

## Elemento distintivo

Un solo lienzo WebGL renderiza, mediante *scissor viewports*, la escena principal y las cuatro
opciones dentro de tarjetas HTML translúcidas. Los objetos son la identidad: fichas blancas con
borde azul, cubos de vidrio con aristas cilíndricas, símbolos dibujados en canvas y proyectados
como texturas. La ficha faltante siempre es una silueta punteada con «?».

## Decisiones de usabilidad

- Controles de al menos 44 px; teclas 1–4 / A–D y Enter como alternativa al ratón.
- Selección y confirmación en dos pasos para evitar respuestas accidentales (un fallo termina la
  partida).
- Feedback dentro de la interfaz (toast, colores de borde) y modales solo para hitos: fallo con
  explicación y nivel completado con diploma.
- Temporizador que se detiene en modales y cuando la pestaña se oculta.
- En pantallas verticales las secuencias se muestran en 2×2 con numeración; el panel de
  axiomas del nivel 4 es plegable.
- `prefers-reduced-motion` desactiva transiciones; el balanceo de los cubos se detiene en cuanto
  el usuario interactúa con la escena.

## Diploma

Formato A4 apaisado (1754 × 1240 px, 150 ppp): marco doble azul con esquinas reforzadas,
retícula de puntos, banda diagonal, logotipo institucional, título «DIPLOMA», nombre del
participante, texto del logro, puntaje y tiempo, sello hexagonal amarillo con el número de nivel,
fecha, código de verificación y línea de firma opcional configurable desde el panel.
