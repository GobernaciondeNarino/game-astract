/**
 * wj-main.js — Controlador de la interfaz: pantallas, partida, puntaje,
 * temporizador, ranking y diplomas.
 */
import { LEVELS, SESSION_SIZE, getSessionExercises, levelInfo } from './wj-exercises.js';
import { Stage, buildMainScene, buildOptionScene, snapshotOption, viewPreset, webglAvailable } from './wj-scene.js';
import { fetchLeaderboard, submitScore, sendDiploma, formatTime } from './wj-api.js';
import { renderDiploma, diplomaToPngBlob, diplomaToPdf, downloadBlob, slugify } from './wj-diploma.js';

const CFG = window.WJ_CONFIG || {};
const POINTS = Number(CFG.pointsPerAnswer) || 100;
const MAX_LEVEL = LEVELS.length;
const PROGRESS_KEY = 'wj_progress_v1';
const LAST_NAME_KEY = 'wj_last_name';

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const state = {
  name: '',
  nameKey: '',
  unlocked: 1,
  completed: [],
  level: 1,
  questions: [],
  qIndex: 0,
  selected: null,
  locked: false,
  score: 0,
  elapsedMs: 0,
  timerRunning: false,
  lastTick: 0,
  levelsCompletedThisGame: 0,
  lastRank: null,
  submitted: false,
  views: { main: null, options: [] },
  diploma: null,
};

let stage = null;
let optionButtons = [];

// ---------------------------------------------------------------------------
// Utilidades de interfaz
// ---------------------------------------------------------------------------

function showScreen(id) {
  $$('.wj-screen').forEach((s) => s.classList.toggle('is-active', s.id === id));
  document.body.dataset.screen = id;
  if (stage) requestAnimationFrame(() => stage.refit());
}

function openModal(id) {
  const m = $(`#${id}`);
  m.classList.add('is-open');
  m.setAttribute('aria-hidden', 'false');
  const focus = m.querySelector('[data-autofocus]') || m.querySelector('button, input');
  if (focus) setTimeout(() => focus.focus(), 30);
}

function closeModal(id) {
  const m = $(`#${id}`);
  m.classList.remove('is-open');
  m.setAttribute('aria-hidden', 'true');
}

let toastTimer = null;
function toast(message, kind = 'info') {
  const el = $('#wj-toast');
  el.textContent = message;
  el.dataset.kind = kind;
  el.classList.add('is-visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('is-visible'), 3200);
}

function cleanName(value) {
  return value.replace(/[\u0000-\u001f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 40);
}

function nameKey(name) {
  return name.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

function todayLabel() {
  return new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });
}

function elapsedSeconds() {
  const running = state.timerRunning ? performance.now() - state.lastTick : 0;
  return Math.max(1, Math.round((state.elapsedMs + running) / 1000));
}

// ---------------------------------------------------------------------------
// Progreso por participante (niveles desbloqueados)
// ---------------------------------------------------------------------------

function loadProgress() {
  try {
    return JSON.parse(localStorage.getItem(PROGRESS_KEY) || '{}');
  } catch (e) {
    return {};
  }
}

function saveProgress() {
  const all = loadProgress();
  all[state.nameKey] = { name: state.name, unlocked: state.unlocked, completed: state.completed, updated: Date.now() };
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(all));
  } catch (e) { /* sin almacenamiento */ }
}

function applyProgress() {
  const p = loadProgress()[state.nameKey];
  state.unlocked = p ? Math.min(MAX_LEVEL, Math.max(1, p.unlocked)) : 1;
  state.completed = p && Array.isArray(p.completed) ? p.completed : [];
}

// ---------------------------------------------------------------------------
// Temporizador
// ---------------------------------------------------------------------------

function startTimer() {
  if (state.timerRunning) return;
  state.timerRunning = true;
  state.lastTick = performance.now();
}

function pauseTimer() {
  if (!state.timerRunning) return;
  state.elapsedMs += performance.now() - state.lastTick;
  state.timerRunning = false;
}

function tickTimer() {
  if (state.timerRunning) {
    const now = performance.now();
    state.elapsedMs += now - state.lastTick;
    state.lastTick = now;
  }
  const el = $('#hud-time');
  if (el) el.textContent = formatTime(Math.floor(state.elapsedMs / 1000));
}

// ---------------------------------------------------------------------------
// Ranking
// ---------------------------------------------------------------------------

async function refreshLeaderboard(highlightRank = null) {
  const list = $('#start-leaderboard');
  const note = $('#board-note');
  list.innerHTML = '<li class="wj-board__empty">Cargando…</li>';
  const { top, local } = await fetchLeaderboard();
  if (!top.length) {
    list.innerHTML = '<li class="wj-board__empty">Aún no hay participantes. ¡Sé el primero!</li>';
  } else {
    list.innerHTML = top.map((r) => `
      <li class="${highlightRank === r.rank && r.name === state.name ? 'is-me' : ''}">
        <span class="wj-board__rank">${r.rank}</span>
        <span class="wj-board__name">${escapeHtml(r.name)}</span>
        <span class="wj-board__score">${r.score} pts</span>
        <span class="wj-board__time">${r.timeLabel}</span>
      </li>`).join('');
  }
  note.textContent = local ? 'Ranking guardado en este dispositivo (sin conexión con el servidor).' : 'Mayor puntaje primero; a igual puntaje, menor tiempo.';
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// ---------------------------------------------------------------------------
// Pantalla de niveles
// ---------------------------------------------------------------------------

function renderLevels() {
  $('#levels-name').textContent = state.name;
  const grid = $('#levels-grid');
  grid.innerHTML = LEVELS.map((l) => {
    const done = state.completed.includes(l.id);
    const open = l.id <= state.unlocked;
    const status = done ? 'Completado' : open ? 'Disponible' : 'Bloqueado';
    const cls = done ? 'is-done' : open ? 'is-open' : 'is-locked';
    return `
      <button type="button" class="wj-level ${cls}" data-level="${l.id}" ${open ? '' : 'disabled'} aria-label="Nivel ${l.id} ${l.name}: ${status}">
        <span class="wj-level__num">${l.id}</span>
        <span class="wj-level__status">${status}</span>
        <span class="wj-level__name">${l.name}</span>
        <span class="wj-level__sub">${l.subtitle}</span>
        <span class="wj-level__desc">${l.description}</span>
        <span class="wj-level__skill">${l.skill}</span>
        <span class="wj-level__cta">${done ? 'Jugar de nuevo' : open ? 'Jugar' : 'Completa el nivel anterior'}</span>
      </button>`;
  }).join('');
  $$('.wj-level', grid).forEach((btn) => {
    btn.addEventListener('click', () => startGame(Number(btn.dataset.level)));
  });
}

// ---------------------------------------------------------------------------
// Partida
// ---------------------------------------------------------------------------

function updateHud() {
  const info = levelInfo(state.level);
  $('#hud-name').textContent = state.name;
  $('#hud-level').textContent = `Nivel ${state.level} · ${info.name}`;
  $('#hud-progress').textContent = `Ejercicio ${Math.min(state.qIndex + 1, SESSION_SIZE)} de ${SESSION_SIZE}`;
  $('#hud-bar').style.width = `${(state.qIndex / SESSION_SIZE) * 100}%`;
  $('#hud-score').textContent = String(state.score);
}

function startGame(level) {
  state.level = level;
  state.score = 0;
  state.elapsedMs = 0;
  state.timerRunning = false;
  state.levelsCompletedThisGame = 0;
  state.lastRank = null;
  state.submitted = false;
  beginLevel(level);
}

function beginLevel(level) {
  state.level = level;
  state.questions = getSessionExercises(level, SESSION_SIZE);
  state.qIndex = 0;
  updateHud();
  showScreen('screen-game');
  loadQuestion();
  startTimer();
}

function loadQuestion() {
  const ex = state.questions[state.qIndex];
  state.selected = null;
  state.locked = false;
  $('#q-prompt').textContent = ex.prompt;
  $('#q-id').textContent = `${levelInfo(ex.level).subtitle} · ${ex.id}`;

  const rules = $('#stage-rules');
  if (ex.kind === 'cube3d') {
    rules.hidden = false;
    rules.classList.toggle('is-open', window.innerWidth > 860);
    rules.innerHTML = `
      <button type="button" class="wj-rules__toggle" aria-expanded="${window.innerWidth > 860}">Axiomas del cubo <span aria-hidden="true">▾</span></button>
      <div class="wj-rules__body">
        <p>Bloque ancla (0,0,0): ${escapeHtml(levelSymbolName(ex.scene.anchor.symbol))} hacia arriba, fondo claro, sin estrellas.</p>
        <ul>${ex.rules.map((r) => `<li><strong>${r.label}:</strong> ${r.text}.</li>`).join('')}</ul>
        <p class="wj-rules__target">Bloque buscado: <strong>(${ex.scene.target.join(', ')})</strong></p>
      </div>`;
    $('.wj-rules__toggle', rules).addEventListener('click', (e) => {
      const open = rules.classList.toggle('is-open');
      e.currentTarget.setAttribute('aria-expanded', String(open));
    });
  } else {
    rules.hidden = true;
    rules.innerHTML = '';
  }
  $('#stage-hint').textContent = ex.kind === 'seq3d' || ex.kind === 'cube3d'
    ? 'Arrastra para girar · rueda, pellizco o botones para acercar'
    : 'Rueda, pellizco o botones para acercar · arrastra para inclinar';

  stage.clearViews();
  buildMainView(ex);

  const optPreset = viewPreset(ex.kind, 'option');
  state.views.options = ex.options.map((opt, i) => {
    const btn = optionButtons[i];
    btn.dataset.key = opt.key;
    btn.disabled = false;
    btn.classList.remove('is-selected', 'is-correct', 'is-wrong');
    btn.setAttribute('aria-pressed', 'false');
    $('.wj-option__label', btn).textContent = opt.key;
    const view = stage.addView($('.wj-option__view', btn), optPreset);
    buildOptionScene(view, ex, opt.spec);
    return view;
  });
  $('#btn-confirm').disabled = true;
  updateHud();
  requestAnimationFrame(() => stage.refit());
}

function stageIsPortrait() {
  const r = $('#wj-stage').getBoundingClientRect();
  return r.width > 0 && r.width / Math.max(r.height, 1) < 1.15;
}

function buildMainView(ex) {
  const portrait = stageIsPortrait();
  state.portrait = portrait;
  if (state.views.main) stage.removeView(state.views.main);
  state.views.main = stage.addView($('#wj-stage'), { ...viewPreset(ex.kind, 'main', portrait), orbit: true });
  buildMainScene(state.views.main, ex, { portrait });
}

function levelSymbolName(key) {
  return { arrow: 'flecha', tri: 'triángulo', ell: 'figura en L', tee: 'figura en T', flag: 'banderín' }[key] || key;
}

function selectOption(index) {
  if (state.locked || index < 0 || index > 3) return;
  state.selected = index;
  optionButtons.forEach((b, i) => {
    b.classList.toggle('is-selected', i === index);
    b.setAttribute('aria-pressed', i === index ? 'true' : 'false');
  });
  $('#btn-confirm').disabled = false;
}

function confirmAnswer() {
  if (state.selected === null || state.locked) return;
  state.locked = true;
  const ex = state.questions[state.qIndex];
  const chosen = ex.options[state.selected];
  const btn = optionButtons[state.selected];
  $('#btn-confirm').disabled = true;
  optionButtons.forEach((b) => { b.disabled = true; });
  if (chosen.correct) {
    state.score += POINTS * ex.level;
    btn.classList.add('is-correct');
    updateHud();
    toast(`¡Correcto! +${POINTS * ex.level} puntos`, 'ok');
    setTimeout(nextQuestion, 700);
  } else {
    btn.classList.add('is-wrong');
    const correctIndex = ex.options.findIndex((o) => o.correct);
    optionButtons[correctIndex].classList.add('is-correct');
    pauseTimer();
    setTimeout(() => showWrong(ex, chosen), 500);
  }
}

function nextQuestion() {
  state.qIndex += 1;
  if (state.qIndex >= state.questions.length) {
    completeLevel();
  } else {
    loadQuestion();
  }
}

async function finishGame() {
  pauseTimer();
  if (state.submitted) return;
  state.submitted = true;
  if (state.score <= 0) return;
  const r = await submitScore({
    name: state.name,
    score: state.score,
    time: elapsedSeconds(),
    levels: state.levelsCompletedThisGame,
  });
  if (r && r.ok) {
    state.lastRank = r.rank;
    if (r.local) toast('Resultado guardado en este dispositivo.', 'info');
  } else {
    toast('No se pudo registrar el puntaje en el servidor.', 'warn');
  }
}

async function showWrong(ex, chosen) {
  const correct = ex.options.find((o) => o.correct);
  $('#result-chosen').textContent = `Elegiste la opción ${chosen.key}. La respuesta correcta era la opción ${correct.key}.`;
  try {
    $('#result-img').src = snapshotOption(ex, correct.spec, 480);
  } catch (e) {
    $('#result-img').removeAttribute('src');
  }
  $('#result-explanation').textContent = ex.explanation;
  $('#result-score').textContent = `${state.score} puntos · ${formatTime(elapsedSeconds())}`;
  openModal('modal-result');
  await finishGame();
  $('#result-rank').textContent = state.lastRank ? (state.lastRank <= (CFG.leaderboardSize || 10) ? `Ocupas el puesto ${state.lastRank} del ranking.` : `Quedaste en el puesto ${state.lastRank}.`) : '';
}

async function completeLevel() {
  pauseTimer();
  const level = state.level;
  const info = levelInfo(level);
  state.levelsCompletedThisGame += 1;
  if (!state.completed.includes(level)) state.completed.push(level);
  state.unlocked = Math.max(state.unlocked, Math.min(MAX_LEVEL, level + 1));
  saveProgress();

  $('#lc-title').textContent = `¡Nivel ${level} completado!`;
  $('#lc-summary').textContent = `${SESSION_SIZE} de ${SESSION_SIZE} ejercicios correctos · ${state.score} puntos · ${formatTime(elapsedSeconds())}`;
  $('#lc-diploma-img').removeAttribute('src');
  $('#lc-mail-status').textContent = '';
  const nextBtn = $('#btn-next-level');
  nextBtn.textContent = level < MAX_LEVEL ? `Continuar al nivel ${level + 1}` : 'Finalizar y ver el ranking';
  $('#lc-mail').hidden = !CFG.mailEnabled;
  $('#lc-mail-off').hidden = !!CFG.mailEnabled;
  openModal('modal-level-complete');

  const code = `RA-${level}-${Date.now().toString(36).toUpperCase().slice(-6)}`;
  const canvas = await renderDiploma({
    name: state.name,
    level,
    levelName: info.name,
    levelSubtitle: info.subtitle,
    questions: SESSION_SIZE,
    siteName: CFG.siteName || 'Reto de Razonamiento Abstracto',
    entityName: CFG.entityName || 'Gobernación de Nariño',
    entityArea: CFG.entityArea || '',
    signerName: CFG.signerName || '',
    signerRole: CFG.signerRole || '',
    logoUrl: CFG.logoUrl || '',
    date: todayLabel(),
    score: state.score,
    timeLabel: formatTime(elapsedSeconds()),
    code,
  });
  state.diploma = { canvas, level, info, code };
  $('#lc-diploma-img').src = canvas.toDataURL('image/jpeg', 0.86);

  if (level === MAX_LEVEL) {
    await finishGame();
    if (state.lastRank) toast(`¡Reto completo! Puesto ${state.lastRank} del ranking.`, 'ok');
  }
}

function diplomaFilename(ext) {
  return `diploma-nivel-${state.diploma.level}-${slugify(state.name)}.${ext}`;
}

async function downloadDiplomaPdf() {
  if (!state.diploma) return;
  try {
    diplomaToPdf(state.diploma.canvas).save(diplomaFilename('pdf'));
  } catch (e) {
    toast('No se pudo generar el PDF; descarga la imagen.', 'warn');
  }
}

async function downloadDiplomaPng() {
  if (!state.diploma) return;
  const blob = await diplomaToPngBlob(state.diploma.canvas);
  if (blob) downloadBlob(blob, diplomaFilename('png'));
}

async function emailDiploma() {
  if (!state.diploma) return;
  const input = $('#lc-email');
  const email = input.value.trim();
  const status = $('#lc-mail-status');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    status.textContent = 'Escribe un correo electrónico válido.';
    status.dataset.kind = 'error';
    input.focus();
    return;
  }
  const btn = $('#btn-send-email');
  btn.disabled = true;
  status.textContent = 'Enviando…';
  status.dataset.kind = 'info';
  try {
    const pdf = diplomaToPdf(state.diploma.canvas);
    const r = await sendDiploma({
      name: state.name,
      email,
      level: state.diploma.level,
      levelName: `${state.diploma.info.name} — ${state.diploma.info.subtitle}`,
      file: pdf.output('datauristring'),
      mime: 'application/pdf',
    });
    status.textContent = r.ok ? (r.message || 'Diploma enviado.') : (r.error || 'No se pudo enviar el correo.');
    status.dataset.kind = r.ok ? 'ok' : 'error';
  } catch (e) {
    status.textContent = 'No se pudo preparar el diploma para el envío.';
    status.dataset.kind = 'error';
  } finally {
    btn.disabled = false;
  }
}

function goToNextLevel() {
  closeModal('modal-level-complete');
  if (state.level < MAX_LEVEL) {
    beginLevel(state.level + 1);
  } else {
    backToStart(state.lastRank);
  }
}

function backToStart(highlightRank = null) {
  pauseTimer();
  stage.clearViews();
  showScreen('screen-start');
  refreshLeaderboard(highlightRank);
}

async function quitGame() {
  const ok = window.confirm('¿Terminar la partida? Se registrará el puntaje acumulado hasta ahora.');
  if (!ok) return;
  await finishGame();
  backToStart(state.lastRank);
}

// ---------------------------------------------------------------------------
// Inicio
// ---------------------------------------------------------------------------

function bindEvents() {
  $('#start-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = cleanName($('#start-name').value);
    const err = $('#start-error');
    if (name.length < 2) {
      err.textContent = 'Escribe tu nombre (mínimo 2 caracteres).';
      $('#start-name').focus();
      return;
    }
    err.textContent = '';
    state.name = name;
    state.nameKey = nameKey(name);
    try { localStorage.setItem(LAST_NAME_KEY, name); } catch (e2) { /* ignore */ }
    applyProgress();
    renderLevels();
    showScreen('screen-levels');
  });

  $('#btn-instructions').addEventListener('click', () => openModal('modal-instructions'));
  $$('[data-close]').forEach((b) => b.addEventListener('click', () => closeModal(b.dataset.close)));
  $('#btn-change-name').addEventListener('click', () => { showScreen('screen-start'); $('#start-name').focus(); });
  $('#btn-quit').addEventListener('click', quitGame);
  $('#btn-confirm').addEventListener('click', confirmAnswer);
  $('#btn-result-continue').addEventListener('click', () => { closeModal('modal-result'); backToStart(state.lastRank); });
  $('#btn-next-level').addEventListener('click', goToNextLevel);
  $('#btn-download-pdf').addEventListener('click', downloadDiplomaPdf);
  $('#btn-download-png').addEventListener('click', downloadDiplomaPng);
  $('#btn-send-email').addEventListener('click', emailDiploma);
  $('#lc-email').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); emailDiploma(); } });
  $('#btn-zoom-in').addEventListener('click', () => state.views.main && state.views.main.zoom(1.25));
  $('#btn-zoom-out').addEventListener('click', () => state.views.main && state.views.main.zoom(0.8));
  $('#btn-zoom-reset').addEventListener('click', () => state.views.main && state.views.main.reset());

  optionButtons = $$('.wj-option');
  optionButtons.forEach((btn, i) => btn.addEventListener('click', () => selectOption(i)));

  document.addEventListener('keydown', (e) => {
    if (document.body.dataset.screen !== 'screen-game') return;
    if ($$('.wj-modal.is-open').length) return;
    if (e.target && ['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;
    if (['1', '2', '3', '4'].includes(e.key)) selectOption(Number(e.key) - 1);
    if (['a', 'b', 'c', 'd'].includes(e.key.toLowerCase()) && !e.ctrlKey && !e.metaKey) selectOption('abcd'.indexOf(e.key.toLowerCase()));
    if (e.key === 'Enter') confirmAnswer();
    if (e.key === '+' || e.key === '=') state.views.main && state.views.main.zoom(1.25);
    if (e.key === '-') state.views.main && state.views.main.zoom(0.8);
  });

  let resizeTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (document.body.dataset.screen !== 'screen-game' || !state.questions.length) return;
      if (stageIsPortrait() !== state.portrait) buildMainView(state.questions[state.qIndex]);
    }, 200);
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) pauseTimer();
    else if (document.body.dataset.screen === 'screen-game' && !$$('.wj-modal.is-open').length && !state.locked) startTimer();
  });
}

function init() {
  if (!webglAvailable()) {
    $('#wj-nogl').hidden = false;
    return;
  }
  stage = new Stage($('#wj-gl'));
  stage.start();
  bindEvents();
  setInterval(tickTimer, 250);
  try {
    const last = localStorage.getItem(LAST_NAME_KEY);
    if (last) $('#start-name').value = last;
  } catch (e) { /* ignore */ }
  showScreen('screen-start');
  refreshLeaderboard();

  // Gancho de depuración/pruebas automatizadas: index.php?debug=1
  if (new URLSearchParams(window.location.search).has('debug')) {
    window.WJ_DEBUG = {
      state,
      startGame,
      selectOption,
      confirmAnswer,
      correctIndex: () => state.questions[state.qIndex].options.findIndex((o) => o.correct),
    };
  }
}

init();
