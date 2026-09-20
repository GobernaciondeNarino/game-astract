<?php if (!defined('WJ_LOADED')) { http_response_code(403); exit; } ?>
</main>
<footer class="wj-footer">
  <?= wj_e(wj_get_site_settings()['entity_name']) ?> · <?= wj_e(WJ_SITE_NAME) ?> v<?= wj_e(WJ_VERSION) ?>
</footer>
</body>
</html>
