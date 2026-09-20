<?php
/**
 * Cabecera común del panel de administración.
 * Espera: $wjTitle (string), $wjActive (string).
 */
if (!defined('WJ_LOADED')) {
    http_response_code(403);
    exit;
}
$wjTitle = $wjTitle ?? 'Panel';
$wjActive = $wjActive ?? '';
$wjAdmin = wj_get_admin();
$wjSite = wj_get_site_settings();
$wjNav = [
    'index' => ['index.php', 'Inicio'],
    'mail' => ['wj-mail-config.php', 'Correo (Gmail)'],
    'leaderboard' => ['wj-leaderboard.php', 'Ranking'],
    'site' => ['wj-site.php', 'Sitio y diploma'],
    'security' => ['wj-security.php', 'Seguridad'],
];
?>
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title><?= wj_e($wjTitle) ?> · Administración · <?= wj_e($wjSite['site_name']) ?></title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Hind+Madurai:wght@400;500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="wj-admin.css">
</head>
<body>
<header class="wj-topbar">
  <a class="wj-brand" href="index.php">
    <span class="wj-brand__dot"></span>
    <span><?= wj_e($wjSite['site_name']) ?><small><?= wj_e($wjSite['entity_name']) ?> · Administración</small></span>
  </a>
  <nav class="wj-nav">
    <?php foreach ($wjNav as $key => [$href, $label]): ?>
      <a href="<?= wj_e($href) ?>" class="<?= $wjActive === $key ? 'is-active' : '' ?>"><?= wj_e($label) ?></a>
    <?php endforeach; ?>
    <a href="../index.php" target="_blank" rel="noopener">Ver juego ↗</a>
    <a href="wj-logout.php" class="wj-nav__logout">Salir</a>
  </nav>
</header>
<main class="wj-main">
<?php if ($wjAdmin['is_default']): ?>
  <div class="wj-alert wj-alert--warn">
    <strong>Contraseña por defecto activa.</strong> Cambia la contraseña del administrador en
    <a href="wj-security.php">Seguridad</a> antes de publicar el sitio.
  </div>
<?php endif; ?>
