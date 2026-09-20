/**
 * wj-diploma.js — Generación del diploma (canvas) y exportación a PNG / PDF.
 */

const W = 1754; // A4 apaisado a 150 ppp
const H = 1240;

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight, align = 'center') {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  ctx.textAlign = align;
  lines.forEach((l, i) => ctx.fillText(l, x, y + i * lineHeight));
  return y + lines.length * lineHeight;
}

async function ensureFonts() {
  if (!document.fonts) return;
  try {
    await Promise.all([
      document.fonts.load('700 60px "Hind Madurai"'),
      document.fonts.load('400 30px "Hind Madurai"'),
      document.fonts.load('600 30px "Hind Madurai"'),
    ]);
  } catch (e) { /* fuentes del sistema */ }
}

function loadImage(url) {
  return new Promise((resolve) => {
    if (!url) return resolve(null);
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

/**
 * Dibuja el diploma y devuelve el canvas.
 * data = { name, level, levelName, levelSubtitle, siteName, entityName, entityArea,
 *          signerName, signerRole, logoUrl, date, score, timeLabel, code }
 */
export async function renderDiploma(data) {
  await ensureFonts();
  const logo = await loadImage(data.logoUrl);
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  const F = '"Hind Madurai", "Segoe UI", Arial, sans-serif';
  const NAVY = '#0b1f3a';
  const BLUE = '#348afb';
  const CREAM = '#fffcf3';
  const MUTED = '#4a4a4a';

  // Fondo y textura de puntos.
  ctx.fillStyle = CREAM;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(52,138,251,0.08)';
  for (let x = 80; x < W - 60; x += 36) {
    for (let y = 80; y < H - 60; y += 36) {
      ctx.beginPath();
      ctx.arc(x, y, 1.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // Banda diagonal suave.
  const grad = ctx.createLinearGradient(W * 0.55, 0, W, H * 0.6);
  grad.addColorStop(0, 'rgba(52,138,251,0)');
  grad.addColorStop(1, 'rgba(52,138,251,0.14)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(W * 0.55, 0);
  ctx.lineTo(W, 0);
  ctx.lineTo(W, H * 0.62);
  ctx.closePath();
  ctx.fill();

  // Marcos.
  ctx.strokeStyle = BLUE;
  ctx.lineWidth = 3;
  ctx.strokeRect(44, 44, W - 88, H - 88);
  ctx.lineWidth = 1.2;
  ctx.strokeStyle = 'rgba(52,138,251,0.55)';
  ctx.strokeRect(62, 62, W - 124, H - 124);
  // Esquinas.
  ctx.lineWidth = 8;
  ctx.strokeStyle = BLUE;
  const c = 70;
  const corners = [[44, 44, 1, 1], [W - 44, 44, -1, 1], [44, H - 44, 1, -1], [W - 44, H - 44, -1, -1]];
  for (const [x, y, sx, sy] of corners) {
    ctx.beginPath();
    ctx.moveTo(x, y + sy * c);
    ctx.lineTo(x, y);
    ctx.lineTo(x + sx * c, y);
    ctx.stroke();
  }

  // Logotipo y entidad.
  let headerBottom = 150;
  if (logo) {
    const maxH = 120;
    const scale = Math.min(maxH / logo.height, 420 / logo.width);
    const lw = logo.width * scale;
    const lh = logo.height * scale;
    ctx.drawImage(logo, 110, 96, lw, lh);
    headerBottom = 96 + lh + 20;
  } else {
    ctx.fillStyle = NAVY;
    ctx.font = `700 40px ${F}`;
    ctx.textAlign = 'left';
    ctx.fillText(data.entityName, 110, 150);
  }
  ctx.fillStyle = MUTED;
  ctx.font = `500 22px ${F}`;
  ctx.textAlign = 'right';
  ctx.fillText(data.entityName.toUpperCase(), W - 110, 128);
  if (data.entityArea) {
    ctx.font = `400 20px ${F}`;
    ctx.fillText(data.entityArea, W - 110, 158);
  }

  // Título.
  ctx.textAlign = 'center';
  ctx.fillStyle = BLUE;
  ctx.font = `600 24px ${F}`;
  ctx.letterSpacing = '10px';
  ctx.fillText('RETO DE RAZONAMIENTO ABSTRACTO', W / 2, Math.max(headerBottom + 90, 290));
  ctx.letterSpacing = '0px';
  ctx.fillStyle = NAVY;
  ctx.font = `700 118px ${F}`;
  ctx.fillText('DIPLOMA', W / 2, 410);
  ctx.fillStyle = BLUE;
  ctx.font = `600 34px ${F}`;
  ctx.fillText(`Nivel ${data.level} · ${data.levelName} — ${data.levelSubtitle}`, W / 2, 470);

  // Línea decorativa.
  ctx.strokeStyle = BLUE;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(W / 2 - 220, 500);
  ctx.lineTo(W / 2 + 220, 500);
  ctx.stroke();

  ctx.fillStyle = MUTED;
  ctx.font = `400 28px ${F}`;
  ctx.fillText('Se otorga a', W / 2, 560);

  ctx.fillStyle = NAVY;
  let nameSize = 84;
  ctx.font = `700 ${nameSize}px ${F}`;
  while (ctx.measureText(data.name).width > W - 360 && nameSize > 40) {
    nameSize -= 4;
    ctx.font = `700 ${nameSize}px ${F}`;
  }
  ctx.fillText(data.name, W / 2, 660);
  ctx.strokeStyle = 'rgba(11,31,58,0.35)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(W / 2 - 380, 690);
  ctx.lineTo(W / 2 + 380, 690);
  ctx.stroke();

  ctx.fillStyle = MUTED;
  ctx.font = `400 28px ${F}`;
  const body = `por completar satisfactoriamente los ${data.questions} ejercicios del Nivel ${data.level} (${data.levelName} — ${data.levelSubtitle}) del reto «${data.siteName}», ` +
    `demostrando capacidad para identificar patrones, formular reglas y resolver problemas nuevos mediante razonamiento abstracto.`;
  wrapText(ctx, body, W / 2, 750, W - 420, 40);

  // Datos: puntaje, tiempo.
  ctx.fillStyle = BLUE;
  ctx.font = `600 24px ${F}`;
  ctx.fillText(`Puntaje acumulado: ${data.score} puntos   ·   Tiempo: ${data.timeLabel}`, W / 2, 880);

  // Sello hexagonal.
  const hx = W - 250;
  const hy = H - 250;
  ctx.save();
  ctx.translate(hx, hy);
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 3;
    const x = 92 * Math.cos(a);
    const y = 92 * Math.sin(a);
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle = '#ffd500';
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = NAVY;
  ctx.stroke();
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 3;
    const x = 74 * Math.cos(a);
    const y = 74 * Math.sin(a);
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = NAVY;
  ctx.font = `700 64px ${F}`;
  ctx.fillText(String(data.level), 0, 24);
  ctx.font = `600 16px ${F}`;
  ctx.fillText('NIVEL', 0, -30);
  ctx.restore();

  // Pie: fecha, código, firma.
  ctx.fillStyle = MUTED;
  ctx.font = `400 22px ${F}`;
  ctx.textAlign = 'left';
  ctx.fillText(`Fecha: ${data.date}`, 110, H - 150);
  ctx.fillText(`Código de verificación: ${data.code}`, 110, H - 116);
  if (data.signerName) {
    ctx.textAlign = 'center';
    ctx.strokeStyle = NAVY;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(W / 2 - 200, H - 170);
    ctx.lineTo(W / 2 + 200, H - 170);
    ctx.stroke();
    ctx.fillStyle = NAVY;
    ctx.font = `600 24px ${F}`;
    ctx.fillText(data.signerName, W / 2, H - 136);
    ctx.fillStyle = MUTED;
    ctx.font = `400 20px ${F}`;
    ctx.fillText(data.signerRole || '', W / 2, H - 108);
  }
  return canvas;
}

export function diplomaToPngBlob(canvas) {
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/png'));
}

/** Devuelve una instancia jsPDF (A4 apaisado) con el diploma. */
export function diplomaToPdf(canvas) {
  const { jsPDF } = window.jspdf || {};
  if (!jsPDF) throw new Error('jsPDF no está disponible.');
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4', compress: true });
  const img = canvas.toDataURL('image/jpeg', 0.92);
  pdf.addImage(img, 'JPEG', 0, 0, 297, 210);
  return pdf;
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export function slugify(text) {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase() || 'participante';
}
