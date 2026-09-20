<?php
/**
 * wj-admin/wj-mail-config.php — Configuración del correo de aplicación de Gmail
 * usado para enviar los diplomas.
 *
 * Pasos para obtener la contraseña de aplicación:
 *  1. Ingresa a https://myaccount.google.com/security con la cuenta institucional.
 *  2. Activa la "Verificación en dos pasos".
 *  3. Entra a https://myaccount.google.com/apppasswords y crea una contraseña
 *     de aplicación (nombre sugerido: "Reto Razonamiento Abstracto").
 *  4. Copia los 16 caracteres (sin espacios) en el campo "Contraseña de aplicación".
 */
require_once dirname(__DIR__) . '/wj-load.php';
wj_admin_require();

$settings = wj_get_mail_settings();
$notice = '';
$error = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!wj_csrf_check()) {
        $error = 'La sesión expiró. Vuelve a intentarlo.';
    } elseif (isset($_POST['wj_save'])) {
        $pass = (string) ($_POST['smtp_pass'] ?? '');
        $pass = str_replace(' ', '', $pass);
        $values = [
            'enabled' => !empty($_POST['enabled']),
            'smtp_host' => trim((string) ($_POST['smtp_host'] ?? 'smtp.gmail.com')),
            'smtp_port' => (int) ($_POST['smtp_port'] ?? 587),
            'smtp_secure' => (string) ($_POST['smtp_secure'] ?? 'tls'),
            'smtp_user' => trim((string) ($_POST['smtp_user'] ?? '')),
            'from_name' => trim((string) ($_POST['from_name'] ?? WJ_ENTITY_NAME)),
            'reply_to' => trim((string) ($_POST['reply_to'] ?? '')),
            'subject' => trim((string) ($_POST['subject'] ?? '')),
        ];
        if ($pass !== '') {
            $values['smtp_pass'] = $pass; // Solo se reemplaza si se escribe una nueva.
        }
        if ($values['smtp_user'] !== '' && !filter_var($values['smtp_user'], FILTER_VALIDATE_EMAIL)) {
            $error = 'El usuario SMTP debe ser una dirección de correo válida.';
        } elseif ($values['reply_to'] !== '' && !filter_var($values['reply_to'], FILTER_VALIDATE_EMAIL)) {
            $error = 'El correo de respuesta no es válido.';
        } elseif ($values['smtp_port'] < 1 || $values['smtp_port'] > 65535) {
            $error = 'Puerto inválido.';
        } elseif (wj_save_mail_settings($values)) {
            $notice = 'Configuración guardada.';
            $settings = wj_get_mail_settings();
        } else {
            $error = 'No se pudo escribir en wj-content/config. Revisa los permisos de la carpeta.';
        }
    } elseif (isset($_POST['wj_test'])) {
        $to = trim((string) ($_POST['test_to'] ?? ''));
        if (!filter_var($to, FILTER_VALIDATE_EMAIL)) {
            $error = 'Escribe un correo de destino válido para la prueba.';
        } else {
            $r = wj_send_test_mail($to);
            if ($r['ok']) {
                $notice = 'Correo de prueba enviado a ' . $to . '.';
            } else {
                $error = 'La prueba falló: ' . $r['error'];
            }
        }
    }
}

$csrf = wj_csrf_token();
$wjTitle = 'Correo (Gmail)';
$wjActive = 'mail';
require __DIR__ . '/wj-admin-header.php';
?>
<h1 class="wj-h1">Correo de aplicación de Gmail</h1>
<p class="wj-lead">Los diplomas se envían desde una cuenta de Gmail mediante SMTP con una
<strong>contraseña de aplicación</strong>. La contraseña se guarda cifrada en disco solo para el servidor
(<code>wj-content/config/mail.json.php</code>) y nunca se muestra de nuevo.</p>

<?php if ($notice): ?><div class="wj-alert wj-alert--ok"><?= wj_e($notice) ?></div><?php endif; ?>
<?php if ($error): ?><div class="wj-alert wj-alert--error"><?= wj_e($error) ?></div><?php endif; ?>

<div class="wj-grid wj-grid--2">
  <form method="post" class="wj-card" autocomplete="off">
    <input type="hidden" name="wj_csrf" value="<?= wj_e($csrf) ?>">
    <h2>Servidor SMTP</h2>
    <label class="wj-check">
      <input type="checkbox" name="enabled" value="1" <?= $settings['enabled'] ? 'checked' : '' ?>>
      <span>Habilitar el envío de diplomas por correo</span>
    </label>
    <div class="wj-row">
      <label>Servidor<input type="text" name="smtp_host" value="<?= wj_e($settings['smtp_host']) ?>" required></label>
      <label>Puerto<input type="number" name="smtp_port" value="<?= (int) $settings['smtp_port'] ?>" min="1" max="65535" required></label>
      <label>Cifrado
        <select name="smtp_secure">
          <option value="tls" <?= $settings['smtp_secure'] === 'tls' ? 'selected' : '' ?>>STARTTLS (587)</option>
          <option value="ssl" <?= $settings['smtp_secure'] === 'ssl' ? 'selected' : '' ?>>SSL (465)</option>
          <option value="none" <?= $settings['smtp_secure'] === 'none' ? 'selected' : '' ?>>Sin cifrado</option>
        </select>
      </label>
    </div>
    <label>Cuenta de Gmail (usuario SMTP)
      <input type="email" name="smtp_user" value="<?= wj_e($settings['smtp_user']) ?>" placeholder="cuenta@narino.gov.co o cuenta@gmail.com" required>
    </label>
    <label>Contraseña de aplicación (16 caracteres)
      <input type="password" name="smtp_pass" placeholder="<?= $settings['smtp_pass'] !== '' ? 'Guardada ••••••••••••••••  (deja vacío para conservarla)' : 'xxxx xxxx xxxx xxxx' ?>" autocomplete="new-password">
    </label>
    <div class="wj-row">
      <label>Nombre del remitente<input type="text" name="from_name" value="<?= wj_e($settings['from_name']) ?>"></label>
      <label>Responder a (opcional)<input type="email" name="reply_to" value="<?= wj_e($settings['reply_to']) ?>"></label>
    </div>
    <label>Asunto del correo<input type="text" name="subject" value="<?= wj_e($settings['subject']) ?>"></label>
    <div class="wj-actions">
      <button type="submit" name="wj_save" value="1" class="wj-btn wj-btn--primary">Guardar configuración</button>
    </div>
  </form>

  <div>
    <form method="post" class="wj-card">
      <input type="hidden" name="wj_csrf" value="<?= wj_e($csrf) ?>">
      <h2>Probar envío</h2>
      <p class="wj-muted">Guarda primero la configuración y luego envía un mensaje de prueba.</p>
      <label>Enviar prueba a<input type="email" name="test_to" placeholder="destino@correo.com" required></label>
      <div class="wj-actions">
        <button type="submit" name="wj_test" value="1" class="wj-btn" <?= ($settings['smtp_user'] === '' || $settings['smtp_pass'] === '') ? 'disabled' : '' ?>>Enviar correo de prueba</button>
      </div>
    </form>

    <section class="wj-card">
      <h2>¿Cómo obtener la contraseña de aplicación?</h2>
      <ol class="wj-steps">
        <li>Ingresa a <a href="https://myaccount.google.com/security" target="_blank" rel="noopener">myaccount.google.com/security</a> con la cuenta institucional de Google Workspace o Gmail.</li>
        <li>Activa la <strong>Verificación en dos pasos</strong>.</li>
        <li>Abre <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noopener">myaccount.google.com/apppasswords</a> y crea una contraseña con el nombre <em>Reto Razonamiento Abstracto</em>.</li>
        <li>Copia los 16 caracteres en el campo <strong>Contraseña de aplicación</strong> y guarda.</li>
        <li>Usa el servidor <code>smtp.gmail.com</code>, puerto <code>587</code> con STARTTLS (o <code>465</code> con SSL).</li>
      </ol>
      <p class="wj-muted">Si tu dominio usa Google Workspace, el administrador debe permitir las contraseñas de aplicación y el acceso SMTP.</p>
    </section>
  </div>
</div>
<?php require __DIR__ . '/wj-admin-footer.php'; ?>
