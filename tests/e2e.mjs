/**
 * Prueba end-to-end con Playwright (Chromium).
 * Uso: npm install && (php -S 127.0.0.1:8080 -t . &) && npm run test:e2e
 * Variables: WJ_BASE_URL (por defecto http://127.0.0.1:8080)
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const BASE = process.env.WJ_BASE_URL || 'http://127.0.0.1:8080';
const OUT = path.resolve('tests/output');
fs.mkdirSync(OUT, { recursive: true });

const errors = [];
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROMIUM_PATH || undefined,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const context = await browser.newContext({ viewport: { width: 1366, height: 800 }, deviceScaleFactor: 1, acceptDownloads: true });
const page = await context.newPage();
page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
page.on('requestfailed', (r) => errors.push(`request failed: ${r.url()} ${r.failure()?.errorText}`));

const shot = (name) => page.screenshot({ path: path.join(OUT, `${name}.png`) });
const wait = (ms) => page.waitForTimeout(ms);

async function playCorrect(n) {
  for (let i = 0; i < n; i++) {
    await page.waitForFunction(() => window.WJ_DEBUG && !window.WJ_DEBUG.state.locked && window.WJ_DEBUG.state.questions.length);
    const idx = await page.evaluate(() => window.WJ_DEBUG.correctIndex());
    await page.locator('.wj-option').nth(idx).click();
    await page.locator('#btn-confirm').click();
    await wait(850);
  }
}

console.log('1. Inicio');
await page.goto(`${BASE}/index.php?debug=1`, { waitUntil: 'networkidle' });
await page.waitForSelector('#start-leaderboard li');
await wait(600);
await shot('01-inicio');

console.log('2. Nombre y niveles');
await page.fill('#start-name', 'Ana Prueba');
await page.click('#start-form button[type=submit]');
await page.waitForSelector('#screen-levels.is-active');
await wait(300);
await shot('02-niveles');
const locked = await page.locator('.wj-level[disabled]').count();
console.log('   niveles bloqueados al inicio:', locked);

console.log('3. Nivel 1');
await page.click('.wj-level[data-level="1"]');
await page.waitForSelector('#screen-game.is-active');
await wait(900);
await shot('03-nivel1-juego');
await page.locator('.wj-option').nth(1).click();
await wait(300);
await shot('03b-nivel1-seleccion');
console.log('   previsualización en el hueco "?":', await page.evaluate(() => window.WJ_DEBUG.hasPreview()));
await page.click('#btn-zoom-in');
await page.click('#btn-zoom-in');
await wait(300);
await shot('03c-nivel1-zoom');
await page.click('#btn-zoom-reset');
await playCorrect(10);
await page.waitForSelector('#modal-level-complete.is-open');
await page.waitForFunction(() => document.querySelector('#lc-diploma-img').getAttribute('src'));
await wait(500);
await shot('04-nivel1-diploma');
const [download] = await Promise.all([
  page.waitForEvent('download', { timeout: 15000 }),
  page.click('#btn-download-pdf'),
]);
const pdfPath = path.join(OUT, download.suggestedFilename());
await download.saveAs(pdfPath);
console.log('   PDF descargado:', download.suggestedFilename(), fs.statSync(pdfPath).size, 'bytes');
const mailHidden = await page.locator('#lc-mail').isHidden();
console.log('   formulario de correo oculto (sin SMTP):', mailHidden);

console.log('4. Nivel 2 (fallo intencional)');
await page.click('#btn-next-level');
await page.waitForFunction(() => window.WJ_DEBUG.state.level === 2 && window.WJ_DEBUG.state.questions.length);
await wait(900);
await shot('05-nivel2-juego');
await playCorrect(3);
await page.waitForFunction(() => !window.WJ_DEBUG.state.locked);
const wrong = await page.evaluate(() => (window.WJ_DEBUG.correctIndex() + 1) % 4);
await page.locator('.wj-option').nth(wrong).click();
await page.click('#btn-confirm');
await page.waitForSelector('#modal-result.is-open');
await wait(1200);
await shot('06-nivel2-fallo');
const explanation = await page.textContent('#result-explanation');
console.log('   explicación:', explanation.slice(0, 120) + '…');
await page.click('#btn-result-continue');
await page.waitForSelector('#screen-start.is-active');
await wait(800);
await shot('07-ranking');
const me = await page.locator('#start-leaderboard li.is-me').count();
console.log('   participante resaltado en ranking:', me);

console.log('5. Niveles 3 y 4 (vista)');
await page.evaluate(() => { window.WJ_DEBUG.state.name = 'Ana Prueba'; window.WJ_DEBUG.startGame(3); });
await wait(1000);
await shot('08-nivel3-juego');
await page.mouse.move(683, 400);
await page.mouse.down();
await page.mouse.move(760, 380, { steps: 8 });
await page.mouse.up();
await wait(400);
await shot('08b-nivel3-rotado');
await playCorrect(2);
await page.evaluate(() => window.WJ_DEBUG.startGame(4));
await wait(1000);
await shot('09-nivel4-juego');
await playCorrect(2);
await page.waitForFunction(() => !window.WJ_DEBUG.state.locked);
const wrong4 = await page.evaluate(() => (window.WJ_DEBUG.correctIndex() + 1) % 4);
await page.locator('.wj-option').nth(wrong4).click();
await page.click('#btn-confirm');
await page.waitForSelector('#modal-result.is-open');
await wait(1000);
await shot('10-nivel4-fallo');

console.log('6. Vista móvil');
await page.click('#btn-result-continue');
await page.setViewportSize({ width: 390, height: 780 });
await wait(400);
await shot('11-movil-inicio');
await page.evaluate(() => window.WJ_DEBUG.startGame(1));
await wait(900);
await shot('12-movil-juego');
const scroll = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, sh: document.documentElement.scrollHeight, w: innerWidth, h: innerHeight }));
console.log('   sin desplazamiento:', scroll.sw <= scroll.w && scroll.sh <= scroll.h, scroll);

await browser.close();
console.log('\nErrores de consola/red:', errors.length);
errors.forEach((e) => console.log('  -', e));
process.exit(errors.length ? 1 : 0);
