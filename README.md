# Reto de Razonamiento Abstracto

Juego interactivo en 3D (three.js + PHP) de la **Gobernación de Nariño** para ejercitar el
razonamiento abstracto en cuatro niveles progresivos, con ranking de participantes y diplomas
descargables o enviados por correo.

Basado en el documento [El Razonamiento Abstracto: mecanismos cognitivos, desarrollo y
aplicaciones](docs/razonamiento-abstracto.md), del que se toman los cuatro tipos de ejercicio:

| Nivel | Nombre | Ejercicio | Mecanismo cognitivo |
| --- | --- | --- | --- |
| 1 | Básico | Secuencia 2D lineal (4 recuadros) | Progresión de una dimensión |
| 2 | Medio | Matriz 2D 3×3 | Reglas simultáneas: XOR, unión, intersección, resta, progresiones y rotación |
| 3 | Avanzado | Objetos 3D lineales (cubos) | Memoria de trabajo espacial x, y, z con dos reglas paralelas |
| 4 | Genial | Cubo 3×3×3 | Tres axiomas anclados a los ejes (ramificación cognitiva) |

## Reglas del juego

1. Al iniciar se pide el **nombre del participante**; el resultado se guarda en el ranking de los
   10 mejores (mayor puntaje primero y, a igual puntaje, menor tiempo).
2. Cada nivel tiene **10 ejercicios** tomados al azar de un banco interno de **50 por nivel**;
   las preguntas y el orden de las opciones son aleatorios en cada sesión.
3. Cada nivel se **desbloquea al completar el anterior** (el progreso se recuerda por nombre en el
   navegador).
4. Un acierto suma `100 × nivel` puntos. Al **fallar** se muestra la respuesta correcta con su
   explicación y la partida termina.
5. Al completar un nivel se entrega un **diploma** (PDF o PNG) que también puede **enviarse por
   correo** si el administrador configuró la cuenta de Gmail.
6. Los objetos se pueden **aumentar o reducir** (botones + / −, rueda del ratón o pellizco) y en
   los niveles 3D se pueden girar arrastrando.
7. La interfaz ocupa `width: 100%; height: 100vh` sin desplazamiento, con estilo futurista sobre
   fondo `#fffcf3` y botones y líneas `#348afb`, tipografía Hind Madurai y la paleta del Manual
   de Identidad Visual de la Gobernación (ver [docs/diseno.md](docs/diseno.md)).

## Estructura (estilo WordPress con prefijo `wj-`)

```
index.php              Página del juego
wj-api.php             API JSON: configuración, ranking, puntajes y envío de diplomas
wj-config.php          Configuración general (rutas, identidad, límites, clave secreta)
wj-load.php            Arranque: carga configuración e includes
wj-admin/              Panel de administración (correo Gmail, ranking, sitio y diploma, seguridad)
wj-content/            Datos generados: config/, data/, uploads/ (logotipo), diplomas/
wj-includes/           Código compartido: php/, js/game/, js/vendor/ (three.js, jsPDF), css/, vendor/ (PHPMailer)
docs/                  Documentación (.md)
tests/                 Prueba end-to-end con Playwright
```

## Instalación en Plesk

Copia todo el contenido del repositorio en la carpeta del dominio (`httpdocs`) y abre el sitio.
No requiere base de datos ni Composer: los datos se guardan en archivos JSON protegidos dentro de
`wj-content/`. Guía completa en [docs/instalacion-plesk.md](docs/instalacion-plesk.md).

Panel de administración: `https://tu-dominio/wj-admin/` (usuario `admin`, contraseña inicial
`admin`; cámbiala en **Seguridad** el primer día). La cuenta de Gmail y su **contraseña de
aplicación** se configuran en **Correo (Gmail)** (`wj-admin/wj-mail-config.php`).

## Desarrollo local

```bash
php -S 127.0.0.1:8080 -t .        # servidor local → http://127.0.0.1:8080
npm install                       # herramientas de desarrollo (repomix, playwright, chrome-devtools-mcp)
npm run test:e2e                  # prueba end-to-end en Chromium (capturas en tests/output/)
npm run repomix                   # empaqueta el repositorio para análisis con IA
```

## Herramientas instaladas

Repomix, las skills de Anthropic, Chrome DevTools MCP, Claude Code Security Review y la skill
de diseño `apple-design` están configuradas en el repositorio. Detalles y uso en
[docs/herramientas.md](docs/herramientas.md).

## Licencias de terceros

- [three.js](https://threejs.org) — MIT (`wj-includes/js/vendor/three/LICENSE`)
- [jsPDF](https://github.com/parallax/jsPDF) — MIT (`wj-includes/js/vendor/jspdf-LICENSE`)
- [PHPMailer](https://github.com/PHPMailer/PHPMailer) — LGPL 2.1 (`wj-includes/vendor/phpmailer/LICENSE`)
- [apple-design-skill](https://github.com/dickwu/apple-design-skill) — ver `.claude/skills/apple-design/README.md`
