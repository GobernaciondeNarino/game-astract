/**
 * Prueba del panel de administración con Playwright (Chromium).
 * Uso: servidor local activo (php -S 127.0.0.1:8080 -t .) y `node tests/admin.mjs`.
 * Requiere la contraseña por defecto (admin/admin); no deja configuración guardada.
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const BASE = process.env.WJ_BASE_URL || 'http://127.0.0.1:8080';
const OUT = path.resolve('tests/output');
fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH || undefined });
const page = await browser.newPage({ viewport: { width: 1280, height: 860 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));

await page.goto(`${BASE}/wj-admin/`, { waitUntil: 'domcontentloaded' });
await page.screenshot({ path: `${OUT}/20-admin-login.png` });
await page.fill('input[name=user]', 'admin');
await page.fill('input[name=password]', 'incorrecta');
await page.click('button[name=wj_login]');
console.log('login incorrecto ->', (await page.textContent('.wj-alert--error').catch(() => '')).trim());
await page.fill('input[name=user]', 'admin');
await page.fill('input[name=password]', 'admin');
await page.click('button[name=wj_login]');
await page.waitForSelector('.wj-h1');
console.log('login correcto ->', (await page.textContent('.wj-h1')).trim());
await page.screenshot({ path: `${OUT}/21-admin-tablero.png` });

await page.goto(`${BASE}/wj-admin/wj-mail-config.php`, { waitUntil: 'domcontentloaded' });
await page.screenshot({ path: `${OUT}/22-admin-correo.png`, fullPage: true });
await page.fill('input[name=smtp_user]', 'reto@narino.gov.co');
await page.fill('input[name=smtp_pass]', 'abcd efgh ijkl mnop');
await page.click('button[name=wj_save]');
console.log('guardar correo ->', (await page.textContent('.wj-alert')).trim());
const placeholder = await page.getAttribute('input[name=smtp_pass]', 'placeholder');
console.log('contraseña oculta tras guardar ->', placeholder.includes('Guardada'));

await page.goto(`${BASE}/wj-admin/wj-leaderboard.php`, { waitUntil: 'domcontentloaded' });
await page.screenshot({ path: `${OUT}/23-admin-ranking.png` });
console.log('filas ranking ->', await page.locator('.wj-table tbody tr').count());
await page.goto(`${BASE}/wj-admin/wj-site.php`, { waitUntil: 'domcontentloaded' });
await page.screenshot({ path: `${OUT}/24-admin-sitio.png` });
await page.goto(`${BASE}/wj-admin/wj-security.php`, { waitUntil: 'domcontentloaded' });
await page.screenshot({ path: `${OUT}/25-admin-seguridad.png` });

await page.goto(`${BASE}/wj-admin/wj-logout.php`);
console.log('logout ->', (await page.locator('.wj-login').count()) === 1 ? 'ok' : 'fallo');
await page.goto(`${BASE}/wj-admin/wj-mail-config.php`);
console.log('sin sesión ->', page.url().endsWith('index.php') ? 'redirige a login' : page.url());
await browser.close();
console.log('errores js:', errors.length);
process.exit(errors.length ? 1 : 0);
