<?php
/**
 * Funciones de utilidad compartidas por el juego y el panel de administración.
 */

/** Crea las carpetas de datos si no existen. */
function wj_ensure_dirs(): void
{
    foreach ([WJ_DATA_DIR, WJ_CONFIG_DIR, WJ_UPLOADS_DIR, WJ_DIPLOMAS_DIR] as $dir) {
        if (!is_dir($dir)) {
            @mkdir($dir, 0755, true);
        }
    }
}

/** URL base pública (respeta subcarpetas en Plesk). */
function wj_base_url(): string
{
    $https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
        || (isset($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https');
    $scheme = $https ? 'https' : 'http';
    $host = $_SERVER['HTTP_HOST'] ?? 'localhost';
    $script = $_SERVER['SCRIPT_NAME'] ?? '/index.php';
    $dir = rtrim(str_replace('\\', '/', dirname($script)), '/');
    // Si se llama desde wj-admin, subir un nivel.
    if (substr($dir, -9) === '/wj-admin') {
        $dir = substr($dir, 0, -9);
    }
    return $scheme . '://' . $host . $dir;
}

/** Escapa HTML. */
function wj_e(?string $value): string
{
    return htmlspecialchars((string) $value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

/** Respuesta JSON y fin de la ejecución. */
function wj_json(array $payload, int $status = 200): void
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

/** Lee el cuerpo JSON de la petición. */
function wj_json_input(int $maxBytes = 6291456): array
{
    $raw = file_get_contents('php://input', false, null, 0, $maxBytes + 1);
    if ($raw === false || strlen($raw) > $maxBytes) {
        wj_json(['ok' => false, 'error' => 'Cuerpo de la petición demasiado grande.'], 413);
    }
    if ($raw === '') {
        return [];
    }
    $data = json_decode($raw, true);
    if (!is_array($data)) {
        wj_json(['ok' => false, 'error' => 'JSON inválido.'], 400);
    }
    return $data;
}

/** Limpia un nombre de participante. */
function wj_clean_name(string $name): string
{
    $name = trim(strip_tags($name));
    $name = preg_replace('/[\x00-\x1F\x7F]/u', '', $name) ?? '';
    $name = preg_replace('/\s+/u', ' ', $name) ?? '';
    return wj_substr($name, 40);
}

/** Dirección IP del cliente. */
function wj_client_ip(): string
{
    $ip = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
    return preg_replace('/[^0-9a-fA-F:.]/', '', $ip) ?? '0.0.0.0';
}

/**
 * Limitador simple por clave (IP + acción) basado en archivo.
 * Devuelve true si la acción está permitida.
 */
function wj_rate_limit(string $key, int $max, int $window): bool
{
    $store = wj_storage_read('ratelimit', []);
    $now = time();
    $bucket = array_values(array_filter($store[$key] ?? [], fn($t) => ($now - (int) $t) < $window));
    if (count($bucket) >= $max) {
        $store[$key] = $bucket;
        wj_storage_write('ratelimit', $store);
        return false;
    }
    $bucket[] = $now;
    $store[$key] = $bucket;
    // Limpieza de claves antiguas.
    foreach ($store as $k => $times) {
        $store[$k] = array_values(array_filter($times, fn($t) => ($now - (int) $t) < 86400));
        if (!$store[$k]) {
            unset($store[$k]);
        }
    }
    wj_storage_write('ratelimit', $store);
    return true;
}

/** Inicia la sesión PHP con opciones seguras. */
function wj_session_start(): void
{
    if (session_status() === PHP_SESSION_ACTIVE) {
        return;
    }
    $secure = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off');
    session_set_cookie_params([
        'lifetime' => 0,
        'path' => '/',
        'secure' => $secure,
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    session_name('wjsess');
    session_start();
}

/** Token CSRF para formularios del panel. */
function wj_csrf_token(): string
{
    wj_session_start();
    if (empty($_SESSION['wj_csrf'])) {
        $_SESSION['wj_csrf'] = bin2hex(random_bytes(16));
    }
    return $_SESSION['wj_csrf'];
}

function wj_csrf_check(): bool
{
    wj_session_start();
    $sent = $_POST['wj_csrf'] ?? '';
    return is_string($sent) && !empty($_SESSION['wj_csrf']) && hash_equals($_SESSION['wj_csrf'], $sent);
}

/** Longitud de cadena UTF-8 con respaldo si mbstring no está disponible. */
function wj_strlen(string $value): int
{
    if (function_exists('mb_strlen')) {
        return mb_strlen($value, 'UTF-8');
    }
    return strlen(utf8_decode($value));
}

/** Recorta una cadena UTF-8 con respaldo si mbstring no está disponible. */
function wj_substr(string $value, int $length): string
{
    if (function_exists('mb_substr')) {
        return mb_substr($value, 0, $length, 'UTF-8');
    }
    return substr($value, 0, $length);
}

/** Convierte un texto en un identificador ASCII seguro para nombres de archivo. */
function wj_slug(string $text): string
{
    $ascii = function_exists('iconv') ? @iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $text) : $text;
    if (!$ascii) {
        $ascii = $text;
    }
    $slug = strtolower(trim(preg_replace('/[^a-z0-9]+/i', '-', $ascii) ?? '', '-'));
    return $slug !== '' ? $slug : 'participante';
}

/** Formatea segundos como mm:ss. */
function wj_format_time(int $seconds): string
{
    $m = intdiv($seconds, 60);
    $s = $seconds % 60;
    return sprintf('%02d:%02d', $m, $s);
}

/** Genera un código corto para diplomas. */
function wj_diploma_code(string $name, int $level): string
{
    $raw = strtoupper(substr(hash_hmac('sha256', $name . '|' . $level . '|' . date('Ymd'), WJ_SECRET_KEY), 0, 10));
    return 'RA-' . $level . '-' . substr($raw, 0, 5) . '-' . substr($raw, 5, 5);
}
