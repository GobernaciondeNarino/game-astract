<?php
/**
 * wj-admin/index.php — Ingreso y tablero del panel de administración.
 */
require_once dirname(__DIR__) . '/wj-load.php';
wj_session_start();

$error = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['wj_login'])) {
    $ip = wj_client_ip();
    if (!wj_csrf_check()) {
        $error = 'La sesión expiró. Vuelve a intentarlo.';
    } elseif (!wj_rate_limit('login:' . $ip, WJ_LOGIN_MAX_ATTEMPTS, WJ_LOGIN_WINDOW)) {
        $error = 'Demasiados intentos. Espera unos minutos.';
    } else {
        $user = trim((string) ($_POST['user'] ?? ''));
        $pass = (string) ($_POST['password'] ?? '');
        if (wj_admin_check($user, $pass)) {
            session_regenerate_id(true);
            $_SESSION['wj_admin'] = true;
            $_SESSION['wj_admin_since'] = time();
            header('Location: index.php');
            exit;
        }
        $error = 'Usuario o contraseña incorrectos.';
    }
}

if (!wj_admin_logged_in()) {
    $csrf = wj_csrf_token();
    $site = wj_get_site_settings();
    ?>
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Ingreso · Administración · <?= wj_e($site['site_name']) ?></title>
<link href="https://fonts.googleapis.com/css2?family=Hind+Madurai:wght@400;500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="wj-admin.css">
</head>
<body class="wj-login-body">
  <form class="wj-login" method="post" autocomplete="off">
    <div class="wj-login__brand">
      <span class="wj-brand__dot"></span>
      <div><strong><?= wj_e($site['site_name']) ?></strong><small><?= wj_e($site['entity_name']) ?></small></div>
    </div>
    <h1>Administración</h1>
    <?php if ($error): ?><div class="wj-alert wj-alert--error"><?= wj_e($error) ?></div><?php endif; ?>
    <input type="hidden" name="wj_csrf" value="<?= wj_e($csrf) ?>">
    <label>Usuario<input type="text" name="user" required autofocus autocomplete="username"></label>
    <label>Contraseña<input type="password" name="password" required autocomplete="current-password"></label>
    <button type="submit" name="wj_login" value="1" class="wj-btn wj-btn--primary">Ingresar</button>
    <p class="wj-muted"><a href="../index.php">← Volver al juego</a></p>
  </form>
</body>
</html>
    <?php
    exit;
}

$wjTitle = 'Inicio';
$wjActive = 'index';
require __DIR__ . '/wj-admin-header.php';

$mail = wj_get_mail_settings();
$top = wj_leaderboard_top(5);
$total = count(wj_leaderboard_all());
?>
<h1 class="wj-h1">Tablero</h1>
<div class="wj-grid">
  <section class="wj-card">
    <h2>Correo de diplomas</h2>
    <?php if (wj_mail_ready()): ?>
      <p class="wj-status wj-status--ok">Configurado con <strong><?= wj_e($mail['smtp_user']) ?></strong> (<?= wj_e($mail['smtp_host']) ?>:<?= (int) $mail['smtp_port'] ?>).</p>
    <?php else: ?>
      <p class="wj-status wj-status--warn">Sin configurar. Los participantes solo podrán descargar el diploma.</p>
    <?php endif; ?>
    <a class="wj-btn" href="wj-mail-config.php">Configurar Gmail</a>
  </section>
  <section class="wj-card">
    <h2>Ranking</h2>
    <p><?= $total ?> resultado(s) registrados. Se muestran los 10 mejores en el juego.</p>
    <?php if ($top): ?>
      <ol class="wj-list">
        <?php foreach ($top as $row): ?>
          <li><span><?= wj_e($row['name']) ?></span><span><?= (int) $row['score'] ?> pts · <?= wj_e($row['timeLabel']) ?></span></li>
        <?php endforeach; ?>
      </ol>
    <?php else: ?>
      <p class="wj-muted">Aún no hay participantes.</p>
    <?php endif; ?>
    <a class="wj-btn" href="wj-leaderboard.php">Administrar ranking</a>
  </section>
  <section class="wj-card">
    <h2>Estado del sistema</h2>
    <ul class="wj-kv">
      <li><span>PHP</span><span><?= wj_e(PHP_VERSION) ?></span></li>
      <li><span>Escritura en wj-content/data</span><span><?= is_writable(WJ_DATA_DIR) ? 'OK' : 'Sin permisos' ?></span></li>
      <li><span>Escritura en wj-content/config</span><span><?= is_writable(WJ_CONFIG_DIR) ? 'OK' : 'Sin permisos' ?></span></li>
      <li><span>OpenSSL (SMTP TLS)</span><span><?= extension_loaded('openssl') ? 'OK' : 'No disponible' ?></span></li>
      <li><span>mbstring</span><span><?= extension_loaded('mbstring') ? 'OK' : 'No disponible' ?></span></li>
      <li><span>URL pública</span><span><?= wj_e(wj_base_url()) ?></span></li>
    </ul>
  </section>
</div>
<?php require __DIR__ . '/wj-admin-footer.php'; ?>
