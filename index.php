<?php
/**
 * index.php — Página de entrada del Reto de Razonamiento Abstracto.
 * Interfaz interactiva con three.js; los datos y el correo se sirven desde wj-api.php.
 */
require_once __DIR__ . '/wj-load.php';

$site = wj_get_site_settings();
$logoFile = $site['logo'] && is_file(WJ_UPLOADS_DIR . '/' . $site['logo']) ? $site['logo'] : '';
$logoUrl = $logoFile ? 'wj-content/uploads/' . rawurlencode($logoFile) . '?v=' . filemtime(WJ_UPLOADS_DIR . '/' . $logoFile) : '';
$config = [
    'apiUrl' => 'wj-api.php',
    'siteName' => $site['site_name'],
    'entityName' => $site['entity_name'],
    'entityArea' => $site['entity_area'],
    'signerName' => $site['signer_name'],
    'signerRole' => $site['signer_role'],
    'logoUrl' => $logoUrl,
    'mailEnabled' => wj_mail_ready(),
    'levels' => WJ_LEVELS,
    'questionsPerLevel' => WJ_QUESTIONS_PER_LEVEL,
    'pointsPerAnswer' => WJ_POINTS_PER_ANSWER,
    'leaderboardSize' => WJ_LEADERBOARD_SIZE,
    'version' => WJ_VERSION,
];
$v = WJ_VERSION;
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: SAMEORIGIN');
?>
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="description" content="Juego interactivo de razonamiento abstracto en 3D: cuatro niveles de matrices y secuencias, ranking y diplomas.">
<meta name="theme-color" content="#fffcf3">
<title><?= wj_e($site['site_name']) ?> · <?= wj_e($site['entity_name']) ?></title>
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Cpolygon points='32,4 56,18 56,46 32,60 8,46 8,18' fill='%23348afb'/%3E%3Ctext x='32' y='42' font-size='30' font-family='Arial' font-weight='bold' text-anchor='middle' fill='%23fffcf3'%3E?%3C/text%3E%3C/svg%3E">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Hind+Madurai:wght@400;500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="wj-includes/css/wj-app.css?v=<?= wj_e($v) ?>">
<script type="importmap">
{
  "imports": {
    "three": "./wj-includes/js/vendor/three/three.module.js",
    "three/addons/": "./wj-includes/js/vendor/three/"
  }
}
</script>
<script>window.WJ_CONFIG = <?= json_encode($config, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_HEX_TAG | JSON_HEX_AMP) ?>;</script>
<script src="wj-includes/js/vendor/jspdf.umd.min.js?v=<?= wj_e($v) ?>" defer></script>
</head>
<body>
<div id="wj-app" class="wj-app">
  <canvas id="wj-gl" class="wj-gl" aria-hidden="true"></canvas>

  <div id="wj-nogl" class="wj-nogl" hidden>
    <div class="wj-card">
      <h1>Tu navegador no admite WebGL</h1>
      <p>Actualiza el navegador o activa la aceleración de gráficos para jugar.</p>
    </div>
  </div>

  <!-- Inicio -->
  <section id="screen-start" class="wj-screen is-active" aria-labelledby="start-title">
    <div class="wj-start">
      <div class="wj-start__inner">
        <header class="wj-start__head">
          <?php if ($logoUrl): ?><img class="wj-start__logo" src="<?= wj_e($logoUrl) ?>" alt="<?= wj_e($site['entity_name']) ?>"><?php endif; ?>
          <div>
            <span class="wj-eyebrow"><?= wj_e($site['entity_name']) ?></span>
            <h1 id="start-title"><?= wj_e($site['site_name']) ?></h1>
          </div>
        </header>
        <div class="wj-start__grid">
          <form id="start-form" class="wj-card wj-start__form" autocomplete="off" novalidate>
            <label for="start-name">Nombre del participante</label>
            <input id="start-name" class="wj-input" type="text" maxlength="40" placeholder="Escribe tu nombre" autocomplete="name" required>
            <p id="start-error" class="wj-error" role="alert"></p>
            <div class="wj-start__actions">
              <button class="wj-btn wj-btn--primary" type="submit">Comenzar</button>
              <button class="wj-btn wj-btn--ghost" type="button" id="btn-instructions">¿Cómo se juega?</button>
            </div>
            <p class="wj-fine">4 niveles · <?= WJ_QUESTIONS_PER_LEVEL ?> ejercicios por nivel · un error termina la partida · diploma por cada nivel superado.</p>
          </form>
          <aside class="wj-card wj-start__board" aria-labelledby="board-title">
            <h2 id="board-title">Mejores <?= WJ_LEADERBOARD_SIZE ?></h2>
            <ol id="start-leaderboard" class="wj-board"></ol>
            <p id="board-note" class="wj-fine"></p>
          </aside>
        </div>
        <p class="wj-start__foot"><?= wj_e($site['entity_area']) ?> · Razonamiento abstracto: identificar patrones, formular reglas y resolver problemas nuevos.</p>
      </div>
    </div>
  </section>

  <!-- Niveles -->
  <section id="screen-levels" class="wj-screen" aria-labelledby="levels-title">
    <div class="wj-levels">
      <header class="wj-levels__head">
        <div>
          <span class="wj-eyebrow">Participante: <span id="levels-name"></span></span>
          <h1 id="levels-title">Elige un nivel</h1>
        </div>
        <button class="wj-btn wj-btn--small" type="button" id="btn-change-name">Cambiar nombre</button>
      </header>
      <div id="levels-grid" class="wj-levels-grid"></div>
    </div>
  </section>

  <!-- Juego -->
  <section id="screen-game" class="wj-screen wj-game" aria-label="Ejercicio">
    <header class="wj-hud">
      <div class="wj-hud__brand">
        <?php if ($logoUrl): ?><img src="<?= wj_e($logoUrl) ?>" alt=""><?php endif; ?>
        <span id="hud-name" class="wj-hud__name"></span>
      </div>
      <span id="hud-level" class="wj-hud__level"></span>
      <div class="wj-hud__progress">
        <span id="hud-progress"></span>
        <div class="wj-hud__track"><div id="hud-bar" class="wj-hud__bar"></div></div>
      </div>
      <div class="wj-hud__stat"><small>Puntaje</small><strong id="hud-score">0</strong></div>
      <div class="wj-hud__stat"><small>Tiempo</small><strong id="hud-time">00:00</strong></div>
      <button class="wj-btn wj-btn--small" type="button" id="btn-quit">Terminar</button>
    </header>

    <div class="wj-stage-wrap">
      <div id="wj-stage" class="wj-stage" role="img" aria-label="Escenario tridimensional del ejercicio"></div>
      <aside id="stage-rules" class="wj-rules" hidden></aside>
      <div class="wj-zoom" aria-label="Tamaño de los objetos">
        <button class="wj-btn" type="button" id="btn-zoom-in" aria-label="Aumentar tamaño" title="Aumentar (+)">+</button>
        <button class="wj-btn" type="button" id="btn-zoom-out" aria-label="Reducir tamaño" title="Reducir (−)">−</button>
        <button class="wj-btn" type="button" id="btn-zoom-reset" aria-label="Restablecer vista" title="Restablecer vista">⟲</button>
      </div>
      <p id="stage-hint" class="wj-hint"></p>
    </div>

    <div class="wj-question">
      <p id="q-prompt"></p>
      <span id="q-id"></span>
    </div>

    <div class="wj-answers">
      <div id="wj-options" class="wj-options" role="group" aria-label="Opciones de respuesta">
        <?php foreach (['A', 'B', 'C', 'D'] as $k): ?>
        <button class="wj-option" type="button" aria-pressed="false" aria-label="Opción <?= $k ?>">
          <span class="wj-option__view" aria-hidden="true"></span>
          <span class="wj-option__label"><?= $k ?></span>
        </button>
        <?php endforeach; ?>
      </div>
      <button class="wj-btn wj-btn--primary wj-confirm" type="button" id="btn-confirm" disabled>Confirmar respuesta</button>
    </div>
  </section>

  <!-- Modal: instrucciones -->
  <div id="modal-instructions" class="wj-modal" role="dialog" aria-modal="true" aria-hidden="true" aria-labelledby="ins-title">
    <div class="wj-modal__card wj-instructions">
      <h2 id="ins-title">¿Cómo se juega?</h2>
      <p class="wj-modal__lead">Cada ejercicio muestra una secuencia o matriz de objetos con una regla oculta. Deduce la regla y elige la opción que la completa.</p>
      <ol>
        <li>Escribe tu nombre: con él se guardan tus niveles desbloqueados y tu puesto en el ranking.</li>
        <li>Cada nivel tiene <?= WJ_QUESTIONS_PER_LEVEL ?> ejercicios elegidos al azar entre <?= WJ_BANK_PER_LEVEL ?>; las opciones también se barajan.</li>
        <li>Selecciona una opción (clic o teclas 1-4) y confirma (Enter). Un acierto suma <?= WJ_POINTS_PER_ANSWER ?> puntos × nivel.</li>
        <li>Si fallas, verás la respuesta correcta y su explicación, y la partida termina.</li>
        <li>Al completar un nivel recibes un diploma (PDF o PNG, o por correo) y se desbloquea el siguiente.</li>
        <li>Usa los botones + / − o la rueda del ratón para aumentar o reducir los objetos; en los niveles 3D arrastra para girar.</li>
      </ol>
      <h3>Niveles</h3>
      <ul class="wj-levels-list">
        <li><b>1</b><span><strong>Básico · Secuencia 2D lineal.</strong> Un objeto se desplaza dentro de recuadros siguiendo una trayectoria.</span></li>
        <li><b>2</b><span><strong>Medio · Matriz 3×3.</strong> Dos reglas simultáneas por filas y columnas (XOR, unión, intersección, progresiones).</span></li>
        <li><b>3</b><span><strong>Avanzado · Objetos 3D.</strong> Un objeto recorre las aristas de un cubo mientras cambia un atributo.</span></li>
        <li><b>4</b><span><strong>Genial · Cubo 3×3×3.</strong> Tres axiomas, uno por eje, determinan cada bloque del macro-cubo.</span></li>
      </ul>
      <div class="wj-modal__actions"><button class="wj-btn wj-btn--primary" type="button" data-close="modal-instructions" data-autofocus>Entendido</button></div>
    </div>
  </div>

  <!-- Modal: respuesta incorrecta -->
  <div id="modal-result" class="wj-modal wj-modal--wrong" role="dialog" aria-modal="true" aria-hidden="true" aria-labelledby="result-title">
    <div class="wj-modal__card">
      <h2 id="result-title">Respuesta incorrecta · fin de la partida</h2>
      <p id="result-chosen" class="wj-modal__lead"></p>
      <div class="wj-result">
        <div>
          <img id="result-img" class="wj-result__img" alt="Respuesta correcta">
          <p class="wj-result__caption">Respuesta correcta</p>
        </div>
        <div>
          <h3>Explicación</h3>
          <p id="result-explanation" class="wj-result__text"></p>
          <p id="result-score" class="wj-result__meta"></p>
          <p id="result-rank" class="wj-fine"></p>
        </div>
      </div>
      <div class="wj-modal__actions"><button class="wj-btn wj-btn--primary" type="button" id="btn-result-continue" data-autofocus>Ver ranking</button></div>
    </div>
  </div>

  <!-- Modal: nivel completado + diploma -->
  <div id="modal-level-complete" class="wj-modal" role="dialog" aria-modal="true" aria-hidden="true" aria-labelledby="lc-title">
    <div class="wj-modal__card">
      <h2 id="lc-title">¡Nivel completado!</h2>
      <p id="lc-summary" class="wj-modal__lead"></p>
      <div class="wj-diploma">
        <img id="lc-diploma-img" class="wj-diploma__img" alt="Vista previa del diploma">
        <div class="wj-diploma__side">
          <button class="wj-btn wj-btn--primary" type="button" id="btn-download-pdf">Descargar diploma (PDF)</button>
          <button class="wj-btn" type="button" id="btn-download-png">Descargar imagen (PNG)</button>
          <div id="lc-mail" class="wj-mail">
            <label for="lc-email">Enviar el diploma a tu correo</label>
            <input id="lc-email" class="wj-input" type="email" placeholder="nombre@correo.com" autocomplete="email">
            <button class="wj-btn" type="button" id="btn-send-email">Enviar al correo</button>
            <p id="lc-mail-status" class="wj-mail__status" role="status"></p>
          </div>
          <p id="lc-mail-off" class="wj-mail-off" hidden>El envío por correo no está habilitado; descarga tu diploma.</p>
        </div>
      </div>
      <div class="wj-modal__actions"><button class="wj-btn wj-btn--primary" type="button" id="btn-next-level" data-autofocus>Continuar</button></div>
    </div>
  </div>

  <div id="wj-toast" class="wj-toast" role="status" aria-live="polite"></div>
</div>
<script type="module" src="wj-includes/js/game/wj-main.js?v=<?= wj_e($v) ?>"></script>
</body>
</html>
