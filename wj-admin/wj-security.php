<?php
/**
 * wj-admin/wj-security.php — Cambio de contraseña del administrador.
 */
require_once dirname(__DIR__) . '/wj-load.php';
wj_admin_require();

$notice = '';
$error = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!wj_csrf_check()) {
        $error = 'La sesión expiró. Vuelve a intentarlo.';
    } else {
        $current = (string) ($_POST['current'] ?? '');
        $new = (string) ($_POST['new'] ?? '');
        $repeat = (string) ($_POST['repeat'] ?? '');
        if (!wj_admin_check(WJ_ADMIN_USER, $current)) {
            $error = 'La contraseña actual no es correcta.';
        } elseif (strlen($new) < 10) {
            $error = 'La nueva contraseña debe tener al menos 10 caracteres.';
        } elseif ($new !== $repeat) {
            $error = 'Las contraseñas no coinciden.';
        } elseif (wj_set_admin_password($new)) {
            $notice = 'Contraseña actualizada.';
        } else {
            $error = 'No se pudo guardar. Revisa los permisos de wj-content/config.';
        }
    }
}
$csrf = wj_csrf_token();
$wjTitle = 'Seguridad';
$wjActive = 'security';
require __DIR__ . '/wj-admin-header.php';
?>
<h1 class="wj-h1">Seguridad</h1>
<?php if ($notice): ?><div class="wj-alert wj-alert--ok"><?= wj_e($notice) ?></div><?php endif; ?>
<?php if ($error): ?><div class="wj-alert wj-alert--error"><?= wj_e($error) ?></div><?php endif; ?>
<div class="wj-grid wj-grid--2">
  <form method="post" class="wj-card" autocomplete="off">
    <input type="hidden" name="wj_csrf" value="<?= wj_e($csrf) ?>">
    <h2>Cambiar contraseña</h2>
    <p class="wj-muted">Usuario: <strong><?= wj_e(WJ_ADMIN_USER) ?></strong> (definido en <code>wj-config.php</code>).</p>
    <label>Contraseña actual<input type="password" name="current" required autocomplete="current-password"></label>
    <label>Nueva contraseña (mínimo 10 caracteres)<input type="password" name="new" required minlength="10" autocomplete="new-password"></label>
    <label>Repetir nueva contraseña<input type="password" name="repeat" required minlength="10" autocomplete="new-password"></label>
    <div class="wj-actions"><button class="wj-btn wj-btn--primary" type="submit">Guardar contraseña</button></div>
  </form>
  <section class="wj-card">
    <h2>Recomendaciones</h2>
    <ul class="wj-steps">
      <li>Cambia <code>WJ_SECRET_KEY</code> en <code>wj-config.php</code> por una cadena aleatoria larga.</li>
      <li>Publica el sitio únicamente con certificado SSL (HTTPS), como exige el manual de sitios web de la entidad.</li>
      <li>Verifica que <code>wj-content/config</code> y <code>wj-content/data</code> no sean accesibles desde el navegador.</li>
      <li>Si olvidas la contraseña, elimina <code>wj-content/config/admin.json.php</code> por FTP o Plesk: se restablecerá la contraseña por defecto.</li>
    </ul>
  </section>
</div>
<?php require __DIR__ . '/wj-admin-footer.php'; ?>
