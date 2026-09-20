<?php
/**
 * Ajustes administrables: correo (Gmail), cuenta admin y datos del sitio.
 */

function wj_mail_defaults(): array
{
    return [
        'enabled' => false,
        'smtp_host' => 'smtp.gmail.com',
        'smtp_port' => 587,
        'smtp_secure' => 'tls',      // tls (587) o ssl (465)
        'smtp_user' => '',           // cuenta de Gmail
        'smtp_pass' => '',           // contraseña de aplicación (16 caracteres)
        'from_name' => WJ_ENTITY_NAME,
        'reply_to' => '',
        'subject' => 'Tu diploma del ' . WJ_SITE_NAME,
        'updated_at' => null,
    ];
}

function wj_get_mail_settings(): array
{
    return array_merge(wj_mail_defaults(), wj_storage_read('mail', []));
}

function wj_save_mail_settings(array $values): bool
{
    $current = wj_get_mail_settings();
    $merged = array_merge($current, $values);
    $merged['smtp_port'] = (int) $merged['smtp_port'];
    $merged['smtp_secure'] = in_array($merged['smtp_secure'], ['tls', 'ssl', 'none'], true) ? $merged['smtp_secure'] : 'tls';
    $merged['enabled'] = (bool) $merged['enabled'];
    $merged['updated_at'] = date('c');
    return wj_storage_write('mail', $merged);
}

/** ¿El envío de correo está listo para usarse? */
function wj_mail_ready(): bool
{
    $m = wj_get_mail_settings();
    return $m['enabled'] && $m['smtp_host'] !== '' && $m['smtp_user'] !== '' && $m['smtp_pass'] !== '';
}

function wj_site_defaults(): array
{
    return [
        'site_name' => WJ_SITE_NAME,
        'entity_name' => WJ_ENTITY_NAME,
        'entity_area' => WJ_ENTITY_AREA,
        'signer_name' => '',
        'signer_role' => '',
        'logo' => 'logo-gobernacion.png',
    ];
}

function wj_get_site_settings(): array
{
    return array_merge(wj_site_defaults(), wj_storage_read('site', []));
}

function wj_save_site_settings(array $values): bool
{
    $merged = array_merge(wj_get_site_settings(), $values);
    return wj_storage_write('site', $merged);
}

/** Cuenta de administración. */
function wj_get_admin(): array
{
    $stored = wj_storage_read('admin', []);
    if (empty($stored['password_hash'])) {
        return [
            'user' => WJ_ADMIN_USER,
            'password_hash' => password_hash(WJ_ADMIN_DEFAULT_PASSWORD, PASSWORD_DEFAULT),
            'is_default' => true,
        ];
    }
    return [
        'user' => $stored['user'] ?? WJ_ADMIN_USER,
        'password_hash' => $stored['password_hash'],
        'is_default' => false,
    ];
}

function wj_set_admin_password(string $password): bool
{
    return wj_storage_write('admin', [
        'user' => WJ_ADMIN_USER,
        'password_hash' => password_hash($password, PASSWORD_DEFAULT),
        'updated_at' => date('c'),
    ]);
}

function wj_admin_check(string $user, string $password): bool
{
    $admin = wj_get_admin();
    return hash_equals($admin['user'], $user) && password_verify($password, $admin['password_hash']);
}

function wj_admin_logged_in(): bool
{
    wj_session_start();
    return !empty($_SESSION['wj_admin']) && $_SESSION['wj_admin'] === true;
}

function wj_admin_require(): void
{
    if (!wj_admin_logged_in()) {
        header('Location: index.php');
        exit;
    }
}
