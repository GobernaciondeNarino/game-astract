<?php
/**
 * wj-load.php — Arranque de la aplicación.
 * Carga la configuración y las funciones compartidas.
 */

if (defined('WJ_LOADED')) {
    return;
}
define('WJ_LOADED', true);

require_once __DIR__ . '/wj-config.php';

date_default_timezone_set(WJ_TIMEZONE);
if (WJ_DEBUG) {
    ini_set('display_errors', '1');
    error_reporting(E_ALL);
} else {
    ini_set('display_errors', '0');
    error_reporting(E_ALL & ~E_DEPRECATED & ~E_NOTICE);
}

require_once WJ_INCLUDES_DIR . '/php/wj-functions.php';
require_once WJ_INCLUDES_DIR . '/php/wj-storage.php';
require_once WJ_INCLUDES_DIR . '/php/wj-settings.php';
require_once WJ_INCLUDES_DIR . '/php/wj-leaderboard.php';
require_once WJ_INCLUDES_DIR . '/php/wj-mailer.php';

wj_ensure_dirs();
