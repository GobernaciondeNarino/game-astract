<?php
/**
 * wj-config.php — Configuración principal del juego.
 *
 * Este archivo se puede editar directamente en Plesk (Administrador de archivos).
 * Los valores sensibles (correo de aplicación de Gmail, contraseña del admin)
 * se administran desde /wj-admin y se guardan en wj-content/config/.
 */

// Rutas base ---------------------------------------------------------------
define('WJ_ROOT', __DIR__);
define('WJ_ADMIN_DIR', WJ_ROOT . '/wj-admin');
define('WJ_CONTENT_DIR', WJ_ROOT . '/wj-content');
define('WJ_INCLUDES_DIR', WJ_ROOT . '/wj-includes');
define('WJ_DATA_DIR', WJ_CONTENT_DIR . '/data');
define('WJ_CONFIG_DIR', WJ_CONTENT_DIR . '/config');
define('WJ_UPLOADS_DIR', WJ_CONTENT_DIR . '/uploads');
define('WJ_DIPLOMAS_DIR', WJ_CONTENT_DIR . '/diplomas');

// Identidad ----------------------------------------------------------------
define('WJ_SITE_NAME', 'Razonamiento Abstracto');
define('WJ_ENTITY_NAME', 'Gobernación de Nariño');
define('WJ_ENTITY_AREA', 'Secretaría TIC, Innovación y Gobierno Abierto');
define('WJ_VERSION', '1.0.0');

// Reglas del juego -----------------------------------------------------------
define('WJ_LEVELS', 4);                 // Niveles disponibles
define('WJ_QUESTIONS_PER_LEVEL', 10);   // Ejercicios por sesión y nivel
define('WJ_BANK_PER_LEVEL', 50);        // Ejercicios internos por nivel (rotan 10)
define('WJ_LEADERBOARD_SIZE', 10);      // Tamaño del ranking público
define('WJ_POINTS_PER_ANSWER', 100);    // Puntos por acierto (se multiplican por el nivel)

// Administración -------------------------------------------------------------
// Usuario del panel /wj-admin. La contraseña inicial es WJ_ADMIN_DEFAULT_PASSWORD
// y debe cambiarse desde el panel (Seguridad) en el primer ingreso.
define('WJ_ADMIN_USER', 'admin');
define('WJ_ADMIN_DEFAULT_PASSWORD', 'admin');

// Clave secreta para tokens CSRF y firmas. Cámbiela por una cadena aleatoria larga.
define('WJ_SECRET_KEY', 'cambie-esta-clave-por-una-cadena-aleatoria-larga');

// Límites y seguridad ----------------------------------------------------------
define('WJ_MAIL_RATE_LIMIT', 5);        // Correos de diploma por IP...
define('WJ_MAIL_RATE_WINDOW', 600);     // ...cada N segundos
define('WJ_LOGIN_MAX_ATTEMPTS', 6);     // Intentos de login por IP...
define('WJ_LOGIN_WINDOW', 900);         // ...cada N segundos
define('WJ_MAX_UPLOAD_BYTES', 4 * 1024 * 1024); // Tamaño máximo del diploma adjunto

// Entorno ---------------------------------------------------------------------
define('WJ_TIMEZONE', 'America/Bogota');
define('WJ_DEBUG', false);              // true muestra errores PHP (solo en desarrollo)
