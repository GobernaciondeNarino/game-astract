/**
 * wj-api.js — Cliente de la API PHP (wj-api.php) con respaldo en localStorage
 * para que el juego funcione incluso si el servidor no responde.
 */

const CFG = window.WJ_CONFIG || {};
const API_URL = CFG.apiUrl || 'wj-api.php';
const LS_KEY = 'wj_leaderboard_local';

async function call(action, body) {
  try {
    const init = body
      ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
      : { method: 'GET' };
    const res = await fetch(`${API_URL}?action=${encodeURIComponent(action)}`, { ...init, cache: 'no-store' });
    const data = await res.json();
    return data && typeof data === 'object' ? data : { ok: false, error: 'Respuesta inválida.' };
  } catch (e) {
    return { ok: false, offline: true, error: 'No hay conexión con el servidor.' };
  }
}

function localRows() {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || '[]');
  } catch (e) {
    return [];
  }
}

function sortRows(rows) {
  return rows.slice().sort((a, b) => (b.score - a.score) || (a.time - b.time) || String(a.date).localeCompare(String(b.date)));
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function localTop(limit = 10) {
  return sortRows(localRows()).slice(0, limit).map((r, i) => ({ ...r, rank: i + 1, timeLabel: formatTime(r.time) }));
}

function localSubmit(entry) {
  const rows = localRows();
  const row = { ...entry, id: Math.random().toString(36).slice(2, 10), date: new Date().toISOString() };
  rows.push(row);
  const sorted = sortRows(rows).slice(0, 500);
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(sorted));
  } catch (e) { /* almacenamiento no disponible */ }
  const rank = sorted.findIndex((r) => r.id === row.id) + 1;
  return { ok: true, local: true, rank, top: localTop() };
}

export async function fetchConfig() {
  const r = await call('config');
  return r.ok ? r : null;
}

export async function fetchLeaderboard() {
  const r = await call('leaderboard');
  if (r.ok && Array.isArray(r.top)) return { top: r.top, local: false };
  return { top: localTop(), local: true };
}

export async function submitScore(entry) {
  const r = await call('score', entry);
  if (r.ok) return r;
  if (r.offline || (r.error && /servidor|conexión/i.test(r.error))) return localSubmit(entry);
  return localSubmit(entry);
}

export async function sendDiploma(payload) {
  return call('diploma', payload);
}

export { formatTime };
