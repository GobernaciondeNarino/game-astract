# Instalación en Plesk

## Requisitos

- PHP 7.4 o superior (recomendado 8.1+) con las extensiones habituales: `json`, `openssl`
  (necesaria para SMTP con TLS), `mbstring` (opcional), `gd` o `fileinfo` (para validar el
  logotipo subido).
- Apache o nginx. Las carpetas de datos están protegidas por `.htaccess` **y** por el prefijo
  `<?php exit; ?>` de cada archivo, así que también son seguras con nginx.
- Certificado SSL activo (obligatorio según el Manual de Usabilidad y Estructura de los Sitios
  Web de la Gobernación de Nariño).

## Pasos

1. En Plesk abre **Archivos** (o usa FTP/SFTP) y copia **todo el contenido del repositorio**
   dentro de `httpdocs/` (o de la subcarpeta del dominio que prefieras, por ejemplo
   `httpdocs/reto/`). Puedes omitir `node_modules/`, `tests/` y `docs/` si quieres un despliegue
   mínimo.
2. Comprueba que el usuario de PHP pueda escribir en `wj-content/config`, `wj-content/data`,
   `wj-content/uploads` y `wj-content/diplomas` (en Plesk, los archivos subidos por el
   Administrador de archivos ya pertenecen al usuario del sistema del dominio; si usaste FTP con
   otro usuario, ajusta permisos a `755` para carpetas).
3. Abre `https://tu-dominio/` — el juego debe cargar. El **tablero** de `wj-admin/index.php`
   muestra el estado de escritura de carpetas, OpenSSL y la URL pública.
4. Edita `wj-config.php` y cambia `WJ_SECRET_KEY` por una cadena aleatoria larga.
5. Entra a `https://tu-dominio/wj-admin/` con `admin` / `admin` y cambia la contraseña en
   **Seguridad**.
6. En **Correo (Gmail)** configura el envío de diplomas (ver abajo) y usa **Enviar correo de
   prueba**.
7. En **Sitio y diploma** ajusta el nombre del reto, la dependencia, quien firma el diploma y el
   logotipo (por defecto se incluye el logotipo horizontal de la Gobernación de Nariño extraído
   del Manual de Identidad Visual).

## Configurar el correo de aplicación de Gmail

1. Ingresa a <https://myaccount.google.com/security> con la cuenta que enviará los diplomas
   (Gmail o Google Workspace institucional).
2. Activa la **Verificación en dos pasos**.
3. Entra a <https://myaccount.google.com/apppasswords>, crea una contraseña de aplicación
   (nombre sugerido: *Reto Razonamiento Abstracto*) y copia los 16 caracteres.
4. En `wj-admin/wj-mail-config.php` escribe:
   - Servidor: `smtp.gmail.com`
   - Puerto: `587` con **STARTTLS** (o `465` con **SSL**)
   - Cuenta de Gmail: la dirección completa
   - Contraseña de aplicación: los 16 caracteres (sin espacios)
   - Marca **Habilitar el envío de diplomas por correo** y guarda.
5. La contraseña se guarda solo en el servidor (`wj-content/config/mail.json.php`) y nunca se
   vuelve a mostrar. Para cambiarla, escribe una nueva; para conservarla, deja el campo vacío.

Si el envío falla, revisa que el hosting permita conexiones salientes a los puertos 587/465 y
que el administrador de Google Workspace tenga habilitadas las contraseñas de aplicación.

## Archivos de datos

| Archivo | Contenido |
| --- | --- |
| `wj-content/config/mail.json.php` | Configuración SMTP (contraseña de aplicación) |
| `wj-content/config/admin.json.php` | Hash de la contraseña del administrador |
| `wj-content/config/site.json.php` | Nombre del reto, entidad, firma y logotipo |
| `wj-content/data/leaderboard.json.php` | Resultados (hasta 500; el juego muestra 10) |
| `wj-content/data/ratelimit.json.php` | Control de intentos de login y envíos de correo |

Para restablecer la contraseña del administrador elimina `admin.json.php`; para reiniciar el
ranking usa **Ranking → Reiniciar** en el panel o elimina `leaderboard.json.php`.

## Ajustes rápidos en `wj-config.php`

| Constante | Uso |
| --- | --- |
| `WJ_SITE_NAME`, `WJ_ENTITY_NAME`, `WJ_ENTITY_AREA` | Identidad por defecto (editable también desde el panel) |
| `WJ_QUESTIONS_PER_LEVEL`, `WJ_BANK_PER_LEVEL` | 10 ejercicios por sesión sobre un banco de 50 |
| `WJ_POINTS_PER_ANSWER` | Puntos por acierto (se multiplican por el nivel) |
| `WJ_LEADERBOARD_SIZE` | Tamaño del ranking público |
| `WJ_MAIL_RATE_LIMIT` / `WJ_MAIL_RATE_WINDOW` | Envíos de diploma permitidos por IP y ventana |
| `WJ_DEBUG` | `true` muestra errores PHP (solo en desarrollo) |

## Actualizaciones

Vuelve a copiar los archivos del repositorio **sin sobrescribir** `wj-content/config/`,
`wj-content/data/` ni `wj-content/uploads/` para conservar configuración, ranking y logotipo.
No hace falta vaciar la caché de los navegadores: `index.php` añade a cada script, módulo y hoja
de estilos un sufijo `?v=` con la versión y la fecha de modificación del archivo (también en el
mapa de importación de los módulos), de modo que cualquier archivo actualizado se descarga de
nuevo automáticamente.
