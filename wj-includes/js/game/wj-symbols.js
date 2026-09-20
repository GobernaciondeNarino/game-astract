/**
 * wj-symbols.js — Dibujo 2D (canvas) de símbolos que se proyectan como texturas
 * sobre las fichas y bloques 3D: celdas de matriz (nivel 2), caras de bloque
 * (nivel 4) y etiquetas (sprites).
 */

export const PALETTE = {
  cream: '#fffcf3',
  blue: '#348afb',
  navy: '#0b1f3a',
  green: '#10a13b',
  yellow: '#ffd500',
  gray: '#8a97a8',
  white: '#ffffff',
};

export function makeCanvas(size, height = size) {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = height;
  return c;
}

function outlinePath(ctx, key, cx, cy, r) {
  ctx.beginPath();
  switch (key) {
    case 'circle':
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      break;
    case 'square':
      ctx.rect(cx - r * 0.92, cy - r * 0.92, r * 1.84, r * 1.84);
      break;
    case 'triangle':
      ctx.moveTo(cx, cy - r * 1.05);
      ctx.lineTo(cx + r * 1.05, cy + r * 0.8);
      ctx.lineTo(cx - r * 1.05, cy + r * 0.8);
      ctx.closePath();
      break;
    case 'hexagon':
      for (let i = 0; i < 6; i++) {
        const a = -Math.PI / 2 + (i * Math.PI) / 3;
        const x = cx + r * 1.02 * Math.cos(a);
        const y = cy + r * 1.02 * Math.sin(a);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.closePath();
      break;
    case 'diamond':
      ctx.moveTo(cx, cy - r * 1.08);
      ctx.lineTo(cx + r * 1.08, cy);
      ctx.lineTo(cx, cy + r * 1.08);
      ctx.lineTo(cx - r * 1.08, cy);
      ctx.closePath();
      break;
    default:
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
  }
}

function starPath(ctx, cx, cy, r) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 === 0 ? r : r * 0.45;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const x = cx + rad * Math.cos(a);
    const y = cy + rad * Math.sin(a);
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

function smallShape(ctx, key, cx, cy, s) {
  ctx.beginPath();
  if (key === 'dot') {
    ctx.arc(cx, cy, s, 0, Math.PI * 2);
  } else if (key === 'sq') {
    ctx.rect(cx - s, cy - s, s * 2, s * 2);
  } else if (key === 'tri') {
    ctx.moveTo(cx, cy - s * 1.15);
    ctx.lineTo(cx + s * 1.1, cy + s * 0.85);
    ctx.lineTo(cx - s * 1.1, cy + s * 0.85);
    ctx.closePath();
  } else if (key === 'star') {
    starPath(ctx, cx, cy, s * 1.3);
  }
}

function arrowPath(ctx, cx, cy, len, w) {
  // Flecha apuntando hacia arriba, centrada.
  ctx.beginPath();
  ctx.moveTo(cx, cy - len / 2);
  ctx.lineTo(cx + w, cy - len / 2 + w * 1.1);
  ctx.lineTo(cx + w * 0.42, cy - len / 2 + w * 1.1);
  ctx.lineTo(cx + w * 0.42, cy + len / 2);
  ctx.lineTo(cx - w * 0.42, cy + len / 2);
  ctx.lineTo(cx - w * 0.42, cy - len / 2 + w * 1.1);
  ctx.lineTo(cx - w, cy - len / 2 + w * 1.1);
  ctx.closePath();
}

/**
 * Celda de la matriz (nivel 2). Fondo transparente; trazos azul oscuro.
 */
export function drawMatrixCell(ctx, spec, size, ink = PALETTE.navy) {
  ctx.clearRect(0, 0, size, size);
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.34;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = ink;
  ctx.fillStyle = ink;
  ctx.lineWidth = size * 0.032;

  const hasOutline = spec.elements ? spec.elements.includes('outline') : true;
  if (hasOutline && spec.outline) {
    outlinePath(ctx, spec.outline, cx, cy, r);
    ctx.stroke();
  }

  if (spec.elements) {
    const L = r * 0.62;
    const dotR = size * 0.038;
    const dotD = r * 0.62;
    for (const el of spec.elements) {
      ctx.beginPath();
      switch (el) {
        case 'plus':
          ctx.moveTo(cx - L * 0.55, cy); ctx.lineTo(cx + L * 0.55, cy);
          ctx.moveTo(cx, cy - L * 0.55); ctx.lineTo(cx, cy + L * 0.55);
          ctx.stroke();
          break;
        case 'hline':
          ctx.moveTo(cx - L, cy); ctx.lineTo(cx + L, cy); ctx.stroke();
          break;
        case 'vline':
          ctx.moveTo(cx, cy - L); ctx.lineTo(cx, cy + L); ctx.stroke();
          break;
        case 'diagA':
          ctx.moveTo(cx - L * 0.8, cy + L * 0.8); ctx.lineTo(cx + L * 0.8, cy - L * 0.8); ctx.stroke();
          break;
        case 'diagB':
          ctx.moveTo(cx - L * 0.8, cy - L * 0.8); ctx.lineTo(cx + L * 0.8, cy + L * 0.8); ctx.stroke();
          break;
        case 'dotTop': ctx.arc(cx, cy - dotD, dotR, 0, Math.PI * 2); ctx.fill(); break;
        case 'dotBottom': ctx.arc(cx, cy + dotD, dotR, 0, Math.PI * 2); ctx.fill(); break;
        case 'dotLeft': ctx.arc(cx - dotD, cy, dotR, 0, Math.PI * 2); ctx.fill(); break;
        case 'dotRight': ctx.arc(cx + dotD, cy, dotR, 0, Math.PI * 2); ctx.fill(); break;
        case 'ring':
          ctx.arc(cx, cy, r * 0.3, 0, Math.PI * 2); ctx.stroke();
          break;
        default:
          break;
      }
    }
  }

  if (spec.prog) {
    const n = spec.count;
    const s = size * 0.05;
    const positions = n === 1 ? [[0, 0]]
      : n === 2 ? [[-0.42, 0], [0.42, 0]]
      : n === 3 ? [[-0.6, 0], [0, 0], [0.6, 0]]
      : [[-0.42, -0.42], [0.42, -0.42], [-0.42, 0.42], [0.42, 0.42]];
    ctx.fillStyle = PALETTE.blue;
    for (const [dx, dy] of positions) {
      smallShape(ctx, spec.prog, cx + dx * r, cy + dy * r, s);
      ctx.fill();
    }
  }

  if (spec.pointer !== undefined) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((spec.pointer * Math.PI) / 180);
    ctx.fillStyle = PALETTE.blue;
    arrowPath(ctx, 0, 0, r * 1.1, size * 0.09);
    ctx.fill();
    ctx.restore();
  }
}

/**
 * Cara de un bloque del cubo 3×3×3 (nivel 4).
 * spec = { symbol, stars, rot (0..3, horario), polarity (0 claro / 1 oscuro) }
 */
export function drawBlockFace(ctx, spec, size) {
  const bg = spec.polarity ? PALETTE.navy : PALETTE.cream;
  const ink = spec.polarity ? PALETTE.cream : PALETTE.navy;
  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = spec.polarity ? 'rgba(255,252,243,0.35)' : 'rgba(11,31,58,0.25)';
  ctx.lineWidth = size * 0.02;
  ctx.strokeRect(size * 0.01, size * 0.01, size * 0.98, size * 0.98);

  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.24;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate((spec.rot * Math.PI) / 2);
  ctx.fillStyle = ink;
  ctx.strokeStyle = ink;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  switch (spec.symbol) {
    case 'arrow':
      arrowPath(ctx, 0, 0, r * 2.2, size * 0.11);
      break;
    case 'tri':
      ctx.moveTo(0, -r * 1.1);
      ctx.lineTo(r * 1.0, r * 0.75);
      ctx.lineTo(-r * 1.0, r * 0.75);
      ctx.closePath();
      break;
    case 'ell': {
      const w = size * 0.11;
      ctx.moveTo(-r * 0.7, -r);
      ctx.lineTo(-r * 0.7 + w, -r);
      ctx.lineTo(-r * 0.7 + w, r - w);
      ctx.lineTo(r * 0.7, r - w);
      ctx.lineTo(r * 0.7, r);
      ctx.lineTo(-r * 0.7, r);
      ctx.closePath();
      break;
    }
    case 'tee': {
      const w = size * 0.11;
      ctx.moveTo(-r, -r);
      ctx.lineTo(r, -r);
      ctx.lineTo(r, -r + w);
      ctx.lineTo(w / 2, -r + w);
      ctx.lineTo(w / 2, r);
      ctx.lineTo(-w / 2, r);
      ctx.lineTo(-w / 2, -r + w);
      ctx.lineTo(-r, -r + w);
      ctx.closePath();
      break;
    }
    case 'flag': {
      const w = size * 0.08;
      ctx.moveTo(-r * 0.6, -r);
      ctx.lineTo(-r * 0.6 + w, -r);
      ctx.lineTo(-r * 0.6 + w, r);
      ctx.lineTo(-r * 0.6, r);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-r * 0.6 + w, -r);
      ctx.lineTo(r * 0.9, -r * 0.55);
      ctx.lineTo(-r * 0.6 + w, -r * 0.1);
      ctx.closePath();
      break;
    }
    default:
      arrowPath(ctx, 0, 0, r * 2.2, size * 0.11);
  }
  ctx.fill();
  ctx.restore();

  // Estrellas perimetrales (hasta 6) en las esquinas y bordes.
  const starSpots = [
    [0.14, 0.14], [0.86, 0.14], [0.86, 0.86], [0.14, 0.86], [0.5, 0.11], [0.5, 0.89],
  ];
  ctx.fillStyle = PALETTE.yellow;
  ctx.strokeStyle = spec.polarity ? PALETTE.cream : PALETTE.navy;
  ctx.lineWidth = size * 0.012;
  for (let i = 0; i < Math.min(spec.stars, starSpots.length); i++) {
    const [fx, fy] = starSpots[i];
    starPath(ctx, fx * size, fy * size, size * 0.065);
    ctx.fill();
    ctx.stroke();
  }
}

/** Etiqueta de texto para sprites. */
export function drawLabel(ctx, text, width, height, { color = PALETTE.blue, bg = null, font = 'bold 120px "Hind Madurai", "Segoe UI", sans-serif', stroke = null } = {}) {
  ctx.clearRect(0, 0, width, height);
  if (bg) {
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.roundRect(0, 0, width, height, height * 0.3);
    ctx.fill();
  }
  ctx.font = font;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (stroke) {
    ctx.lineWidth = height * 0.06;
    ctx.strokeStyle = stroke;
    ctx.strokeText(text, width / 2, height / 2 + height * 0.04);
  }
  ctx.fillStyle = color;
  ctx.fillText(text, width / 2, height / 2 + height * 0.04);
}
