<?php
/**
 * wj-admin/wj-leaderboard.php — Administración del ranking.
 */
require_once dirname(__DIR__) . '/wj-load.php';
wj_admin_require();

$notice = '';
$error = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!wj_csrf_check()) {
        $error = 'La sesión expiró. Vuelve a intentarlo.';
    } elseif (isset($_POST['wj_reset']) && ($_POST['confirm'] ?? '') === 'BORRAR') {
        wj_leaderboard_reset();
        $notice = 'Ranking reiniciado.';
    } elseif (isset($_POST['wj_delete'])) {
        wj_leaderboard_delete((string) $_POST['wj_delete']);
        $notice = 'Registro eliminado.';
    } elseif (isset($_POST['wj_reset'])) {
        $error = 'Escribe BORRAR para confirmar el reinicio.';
    }
}
$csrf = wj_csrf_token();
$rows = wj_leaderboard_all();
$wjTitle = 'Ranking';
$wjActive = 'leaderboard';
require __DIR__ . '/wj-admin-header.php';
?>
<h1 class="wj-h1">Ranking de participantes</h1>
<p class="wj-lead">Ordenado por mayor puntaje y, a igual puntaje, menor tiempo. El juego muestra los <?= WJ_LEADERBOARD_SIZE ?> primeros.</p>
<?php if ($notice): ?><div class="wj-alert wj-alert--ok"><?= wj_e($notice) ?></div><?php endif; ?>
<?php if ($error): ?><div class="wj-alert wj-alert--error"><?= wj_e($error) ?></div><?php endif; ?>

<div class="wj-card">
  <?php if (!$rows): ?>
    <p class="wj-muted">Aún no hay resultados registrados.</p>
  <?php else: ?>
  <div class="wj-table-wrap">
  <table class="wj-table">
    <thead><tr><th>#</th><th>Participante</th><th>Puntaje</th><th>Tiempo</th><th>Niveles</th><th>Fecha</th><th></th></tr></thead>
    <tbody>
    <?php foreach ($rows as $i => $row): ?>
      <tr class="<?= $i < WJ_LEADERBOARD_SIZE ? 'is-top' : '' ?>">
        <td><?= $i + 1 ?></td>
        <td><?= wj_e($row['name']) ?></td>
        <td><?= (int) $row['score'] ?></td>
        <td><?= wj_e(wj_format_time((int) $row['time'])) ?></td>
        <td><?= (int) ($row['levels'] ?? 0) ?> / <?= WJ_LEVELS ?></td>
        <td><?= wj_e(date('Y-m-d H:i', strtotime($row['date'] ?? 'now'))) ?></td>
        <td>
          <form method="post" class="wj-inline" onsubmit="return confirm('¿Eliminar este registro?')">
            <input type="hidden" name="wj_csrf" value="<?= wj_e($csrf) ?>">
            <button class="wj-btn wj-btn--small wj-btn--danger" name="wj_delete" value="<?= wj_e($row['id'] ?? '') ?>">Eliminar</button>
          </form>
        </td>
      </tr>
    <?php endforeach; ?>
    </tbody>
  </table>
  </div>
  <?php endif; ?>
</div>

<form method="post" class="wj-card wj-card--danger">
  <input type="hidden" name="wj_csrf" value="<?= wj_e($csrf) ?>">
  <h2>Reiniciar ranking</h2>
  <p class="wj-muted">Elimina todos los resultados. Esta acción no se puede deshacer.</p>
  <div class="wj-row">
    <label>Escribe <strong>BORRAR</strong> para confirmar<input type="text" name="confirm" autocomplete="off"></label>
  </div>
  <div class="wj-actions">
    <button type="submit" name="wj_reset" value="1" class="wj-btn wj-btn--danger">Reiniciar ranking</button>
  </div>
</form>
<?php require __DIR__ . '/wj-admin-footer.php'; ?>
