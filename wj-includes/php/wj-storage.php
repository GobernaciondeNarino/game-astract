<?php
/**
 * Almacenamiento JSON en archivos protegidos.
 *
 * Cada colección se guarda como wj-content/{data|config}/<nombre>.json.php con un
 * prefijo "<?php exit; ?>" para que el servidor web nunca exponga su contenido,
 * incluso si .htaccess no se aplica (por ejemplo, con nginx en Plesk).
 */

function wj_storage_path(string $name): string
{
    $safe = preg_replace('/[^a-z0-9_-]/i', '', $name) ?? 'store';
    $dir = in_array($safe, ['mail', 'admin', 'site'], true) ? WJ_CONFIG_DIR : WJ_DATA_DIR;
    return $dir . '/' . $safe . '.json.php';
}

const WJ_STORAGE_PREFIX = "<?php exit; ?>\n";

function wj_storage_read(string $name, $default = [])
{
    $path = wj_storage_path($name);
    if (!is_file($path)) {
        return $default;
    }
    $fh = @fopen($path, 'rb');
    if (!$fh) {
        return $default;
    }
    flock($fh, LOCK_SH);
    $raw = stream_get_contents($fh);
    flock($fh, LOCK_UN);
    fclose($fh);
    if ($raw === false) {
        return $default;
    }
    if (strncmp($raw, WJ_STORAGE_PREFIX, strlen(WJ_STORAGE_PREFIX)) === 0) {
        $raw = substr($raw, strlen(WJ_STORAGE_PREFIX));
    }
    $data = json_decode($raw, true);
    return is_array($data) ? $data : $default;
}

function wj_storage_write(string $name, array $data): bool
{
    $path = wj_storage_path($name);
    $dir = dirname($path);
    if (!is_dir($dir)) {
        @mkdir($dir, 0755, true);
    }
    $json = json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
    if ($json === false) {
        return false;
    }
    $fh = @fopen($path, 'cb');
    if (!$fh) {
        return false;
    }
    flock($fh, LOCK_EX);
    ftruncate($fh, 0);
    rewind($fh);
    $ok = fwrite($fh, WJ_STORAGE_PREFIX . $json) !== false;
    fflush($fh);
    flock($fh, LOCK_UN);
    fclose($fh);
    @chmod($path, 0640);
    return $ok;
}
