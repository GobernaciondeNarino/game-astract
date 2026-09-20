<?php
/**
 * wj-admin/wj-site.php — Nombre del sitio, entidad, firma y logotipo del diploma.
 */
require_once dirname(__DIR__) . '/wj-load.php';
wj_admin_require();

$notice = '';
$error = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!wj_csrf_check()) {
        $error = 'La sesión expiró. Vuelve a intentarlo.';
    } else {
        $values = [
            'site_name' => wj_clean_name((string) ($_POST['site_name'] ?? WJ_SITE_NAME)) ?: WJ_SITE_NAME,
            'entity_name' => wj_clean_name((string) ($_POST['entity_name'] ?? WJ_ENTITY_NAME)) ?: WJ_ENTITY_NAME,
            'entity_area' => wj_substr(trim(strip_tags((string) ($_POST['entity_area'] ?? ''))), 80),
            'signer_name' => wj_substr(trim(strip_tags((string) ($_POST['signer_name'] ?? ''))), 60),
            'signer_role' => wj_substr(trim(strip_tags((string) ($_POST['signer_role'] ?? ''))), 80),
        ];
        if (!empty($_FILES['logo']['name'])) {
            $f = $_FILES['logo'];
            if ($f['error'] !== UPLOAD_ERR_OK) {
                $error = 'No se pudo subir el logotipo.';
            } elseif ($f['size'] > 1024 * 1024) {
                $error = 'El logotipo no debe superar 1 MB.';
            } else {
                $info = @getimagesize($f['tmp_name']);
                $allowed = ['image/png' => 'png', 'image/jpeg' => 'jpg', 'image/webp' => 'webp'];
                if (!$info || !isset($allowed[$info['mime']])) {
                    $error = 'El logotipo debe ser PNG, JPG o WEBP.';
                } else {
                    $target = 'logo-diploma.' . $allowed[$info['mime']];
                    if (move_uploaded_file($f['tmp_name'], WJ_UPLOADS_DIR . '/' . $target)) {
                        @chmod(WJ_UPLOADS_DIR . '/' . $target, 0644);
                        $values['logo'] = $target;
                    } else {
                        $error = 'No se pudo guardar el logotipo en wj-content/uploads.';
                    }
                }
            }
        }
        if (!empty($_POST['remove_logo'])) {
            $values['logo'] = '';
        }
        if (!$error) {
            if (wj_save_site_settings($values)) {
                $notice = 'Ajustes guardados.';
            } else {
                $error = 'No se pudo escribir en wj-content/config.';
            }
        }
    }
}
$site = wj_get_site_settings();
$csrf = wj_csrf_token();
$wjTitle = 'Sitio y diploma';
$wjActive = 'site';
require __DIR__ . '/wj-admin-header.php';
?>
<h1 class="wj-h1">Sitio y diploma</h1>
<?php if ($notice): ?><div class="wj-alert wj-alert--ok"><?= wj_e($notice) ?></div><?php endif; ?>
<?php if ($error): ?><div class="wj-alert wj-alert--error"><?= wj_e($error) ?></div><?php endif; ?>
<form method="post" enctype="multipart/form-data" class="wj-grid wj-grid--2">
  <input type="hidden" name="wj_csrf" value="<?= wj_e($csrf) ?>">
  <section class="wj-card">
    <h2>Identidad</h2>
    <label>Nombre del reto<input type="text" name="site_name" value="<?= wj_e($site['site_name']) ?>" maxlength="40" required></label>
    <label>Entidad<input type="text" name="entity_name" value="<?= wj_e($site['entity_name']) ?>" maxlength="40" required></label>
    <label>Dependencia (aparece en el diploma)<input type="text" name="entity_area" value="<?= wj_e($site['entity_area']) ?>" maxlength="80"></label>
    <h2>Firma del diploma</h2>
    <label>Nombre de quien firma<input type="text" name="signer_name" value="<?= wj_e($site['signer_name']) ?>" maxlength="60" placeholder="Opcional"></label>
    <label>Cargo<input type="text" name="signer_role" value="<?= wj_e($site['signer_role']) ?>" maxlength="80" placeholder="Opcional"></label>
  </section>
  <section class="wj-card">
    <h2>Logotipo del diploma</h2>
    <?php if ($site['logo'] && is_file(WJ_UPLOADS_DIR . '/' . $site['logo'])): ?>
      <p><img class="wj-logo-preview" src="../wj-content/uploads/<?= wj_e($site['logo']) ?>?v=<?= filemtime(WJ_UPLOADS_DIR . '/' . $site['logo']) ?>" alt="Logotipo actual"></p>
      <label class="wj-check"><input type="checkbox" name="remove_logo" value="1"><span>Quitar el logotipo</span></label>
    <?php else: ?>
      <p class="wj-muted">Sin logotipo. El diploma mostrará solo el nombre de la entidad.</p>
    <?php endif; ?>
    <label>Subir nuevo logotipo (PNG con fondo transparente, máx. 1 MB)<input type="file" name="logo" accept="image/png,image/jpeg,image/webp"></label>
    <p class="wj-muted">Según el Manual de Identidad Visual, usa la versión horizontal del logotipo con su espacio de reserva.</p>
    <div class="wj-actions"><button class="wj-btn wj-btn--primary" type="submit">Guardar ajustes</button></div>
  </section>
</form>
<?php require __DIR__ . '/wj-admin-footer.php'; ?>
