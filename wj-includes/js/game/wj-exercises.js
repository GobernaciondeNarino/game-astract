/**
 * wj-exercises.js — Banco de ejercicios de razonamiento abstracto.
 *
 * Cuatro niveles basados en el documento "El Razonamiento Abstracto":
 *   1. Básico   — Secuencia 2D lineal (progresión de una dimensión).
 *   2. Medio    — Matriz 2D 3×3 (reglas booleanas XOR/OR/AND/resta y progresiones).
 *   3. Avanzado — Secuencia 3D lineal (trayectoria por aristas + ciclo de atributo).
 *   4. Genial   — Cubo 3×3×3 (tres axiomas anclados a los ejes x, y, z).
 *
 * Cada nivel dispone de un banco interno de BANK_SIZE ejercicios (generados con
 * semilla fija para que sean siempre los mismos 50) y cada sesión toma
 * SESSION_SIZE al azar, con las opciones barajadas.
 */
import { makeRng } from './wj-rng.js';

export const BANK_SIZE = 50;
export const SESSION_SIZE = 10;

export const LEVELS = [
  {
    id: 1,
    name: 'Básico',
    subtitle: 'Secuencia 2D lineal',
    kind: 'seq2d',
    description: 'Descubre la regla de movimiento de un objeto en una fila de cuatro recuadros y elige el cuarto.',
    skill: 'Progresión lineal (1D) y continuidad de patrones.',
  },
  {
    id: 2,
    name: 'Medio',
    subtitle: 'Matriz 2D 3×3',
    kind: 'matrix2d',
    description: 'Analiza filas y columnas al mismo tiempo y completa la celda que falta en la matriz.',
    skill: 'Reglas simultáneas: lógica booleana (XOR, unión, intersección) y progresiones.',
  },
  {
    id: 3,
    name: 'Avanzado',
    subtitle: 'Objetos 3D lineales',
    kind: 'seq3d',
    description: 'Sigue el recorrido de un objeto por las aristas de un cubo y su cambio de atributo.',
    skill: 'Memoria de trabajo espacial (x, y, z) con dos reglas paralelas.',
  },
  {
    id: 4,
    name: 'Genial',
    subtitle: 'Cubo 3×3×3',
    kind: 'cube3d',
    description: 'Aplica tres axiomas, uno por eje, para deducir el bloque de una coordenada del macro-cubo.',
    skill: 'Ramificación cognitiva: integración relacional múltiple en paralelo.',
  },
];

// ---------------------------------------------------------------------------
// Vocabulario compartido
// ---------------------------------------------------------------------------

export const COLORS = [
  { key: 'navy', hex: 0x0b1f3a, name: 'azul oscuro' },
  { key: 'blue', hex: 0x348afb, name: 'azul' },
  { key: 'yellow', hex: 0xffd500, name: 'amarillo' },
];

export const SHAPES3D = [
  { key: 'sphere', name: 'esfera', article: 'la' },
  { key: 'cube', name: 'cubo', article: 'el' },
  { key: 'tetra', name: 'pirámide', article: 'la' },
  { key: 'torus', name: 'anillo', article: 'el' },
  { key: 'octa', name: 'octaedro', article: 'el' },
];

export const SIZES = ['pequeño', 'mediano', 'grande', 'muy grande'];

/** Posiciones de la retícula 3×3 (índice fila-columna) con nombres. */
export const POS_NAMES = [
  'esquina superior izquierda', 'borde superior', 'esquina superior derecha',
  'borde izquierdo', 'centro', 'borde derecho',
  'esquina inferior izquierda', 'borde inferior', 'esquina inferior derecha',
];

/** Perímetro en sentido horario empezando por la esquina superior izquierda. */
const PERIMETER = [0, 1, 2, 5, 8, 7, 6, 3];

const mod = (n, m) => ((n % m) + m) % m;

function sameSpec(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function uniqueSpecs(correct, candidates, needed, rng) {
  const out = [];
  for (const c of candidates) {
    if (out.length >= needed) break;
    if (sameSpec(c, correct)) continue;
    if (out.some((o) => sameSpec(o, c))) continue;
    out.push(c);
  }
  return out;
}

function listJoin(items) {
  if (items.length <= 1) return items.join('');
  return items.slice(0, -1).join(', ') + ' y ' + items[items.length - 1];
}

// ---------------------------------------------------------------------------
// Nivel 1 — Secuencia 2D lineal
// ---------------------------------------------------------------------------

function genSeq2D(rng) {
  const start = rng.int(0, 7);
  const step = rng.pick([1, 1, 2, 2, 3]);
  const dir = rng.pick([1, -1]);
  const shape = rng.pick(SHAPES3D.slice(0, 4));
  const secondary = rng.pick(['none', 'none', 'color', 'color', 'size', 'shape']);
  const baseColor = rng.int(0, 2);
  const shapeCycle = rng.shuffle(SHAPES3D.slice(0, 4)).slice(0, 3);

  const cells = [];
  for (let i = 0; i < 4; i++) {
    const pos = PERIMETER[mod(start + dir * step * i, 8)];
    const spec = { shape: shape.key, pos, color: baseColor, size: 1 };
    if (secondary === 'color') spec.color = mod(baseColor + i, 3);
    if (secondary === 'size') spec.size = i;
    if (secondary === 'shape') spec.shape = shapeCycle[i % 3].key;
    cells.push(spec);
  }
  const correct = cells[3];
  const prev = cells[2];
  const idx3 = mod(start + dir * step * 3, 8);

  const candidates = rng.shuffle([
    { ...correct, pos: prev.pos },                                   // no se mueve
    { ...correct, pos: cells[1].pos },                               // retrocede
    { ...correct, pos: PERIMETER[mod(idx3 + dir, 8)] },              // un paso de más
    { ...correct, pos: PERIMETER[mod(idx3 - dir, 8)] },              // un paso de menos
    { ...correct, pos: 4 },                                          // centro
    ...(secondary === 'color' ? [{ ...correct, color: prev.color }, { ...correct, color: mod(correct.color + 1, 3) }] : []),
    ...(secondary === 'size' ? [{ ...correct, size: prev.size }, { ...correct, size: 1 }] : []),
    ...(secondary === 'shape' ? [{ ...correct, shape: prev.shape }, { ...correct, shape: shapeCycle[1].key }] : []),
  ]);
  const distractors = uniqueSpecs(correct, candidates, 3, rng);
  if (distractors.length < 3) return null;

  const dirName = dir === 1 ? 'horario' : 'antihorario';
  const stepName = step === 1 ? 'una posición' : `${step} posiciones`;
  let explanation = `El ${shape.name === 'pirámide' ? 'objeto' : shape.name} recorre el borde del recuadro avanzando ${stepName} en sentido ${dirName} en cada paso: ` +
    `${POS_NAMES[cells[0].pos]} → ${POS_NAMES[cells[1].pos]} → ${POS_NAMES[cells[2].pos]}. ` +
    `Por eso el cuarto recuadro lo ubica en la ${POS_NAMES[correct.pos]}.`;
  if (secondary === 'color') {
    explanation += ` Además, el color sigue el ciclo ${COLORS[cells[0].color].name} → ${COLORS[cells[1].color].name} → ${COLORS[cells[2].color].name}, así que vuelve a ${COLORS[correct.color].name}.`;
  } else if (secondary === 'size') {
    explanation += ' Además, el tamaño crece un grado en cada recuadro, por lo que el cuarto es el más grande.';
  } else if (secondary === 'shape') {
    explanation += ` Además, la forma alterna en ciclo (${shapeCycle.map((s) => s.name).join(' → ')}), por lo que regresa a ${SHAPES3D.find((s) => s.key === correct.shape).name}.`;
  }

  return {
    level: 1,
    kind: 'seq2d',
    prompt: '¿Qué recuadro continúa la secuencia?',
    scene: { cells: [cells[0], cells[1], cells[2], null] },
    answer: correct,
    distractors,
    explanation,
    signature: `s2d:${start}:${step}:${dir}:${shape.key}:${secondary}:${baseColor}:${secondary === 'shape' ? shapeCycle.map((s) => s.key).join('') : ''}`,
  };
}

// ---------------------------------------------------------------------------
// Nivel 2 — Matriz 2D 3×3
// ---------------------------------------------------------------------------

export const OUTLINES = [
  { key: 'circle', name: 'círculo' },
  { key: 'square', name: 'cuadrado' },
  { key: 'triangle', name: 'triángulo' },
  { key: 'hexagon', name: 'hexágono' },
  { key: 'diamond', name: 'rombo' },
];

export const ELEMENTS = [
  { key: 'outline', name: 'el contorno' },
  { key: 'plus', name: 'la cruz central' },
  { key: 'hline', name: 'la línea horizontal' },
  { key: 'vline', name: 'la línea vertical' },
  { key: 'dotTop', name: 'el punto superior' },
  { key: 'dotBottom', name: 'el punto inferior' },
  { key: 'dotLeft', name: 'el punto izquierdo' },
  { key: 'dotRight', name: 'el punto derecho' },
  { key: 'diagA', name: 'la diagonal ascendente' },
  { key: 'diagB', name: 'la diagonal descendente' },
  { key: 'ring', name: 'el anillo central' },
];

const BOOL_OPS = {
  xor: { name: 'O exclusivo (XOR)', apply: (a, b) => [...a.filter((x) => !b.includes(x)), ...b.filter((x) => !a.includes(x))], text: 'se conservan solo los elementos que aparecen en una sola de las dos primeras celdas; los repetidos se cancelan' },
  or: { name: 'unión (OR)', apply: (a, b) => [...new Set([...a, ...b])], text: 'la tercera celda reúne todos los elementos de las dos primeras' },
  and: { name: 'intersección (AND)', apply: (a, b) => a.filter((x) => b.includes(x)), text: 'la tercera celda conserva únicamente los elementos comunes a las dos primeras' },
  sub: { name: 'resta (A − B)', apply: (a, b) => a.filter((x) => !b.includes(x)), text: 'la tercera celda es la primera celda sin los elementos presentes en la segunda' },
};

const ELEMENT_ORDER = ELEMENTS.map((e) => e.key);
const normalize = (els) => ELEMENT_ORDER.filter((k) => els.includes(k));

function pickBoolPair(rng) {
  // Pares con intersección y diferencias no vacías (todas las operaciones dan resultados distintos).
  const pool = ELEMENT_ORDER.filter((k) => !['diagA', 'diagB'].includes(k) || rng.chance(0.5));
  for (let tries = 0; tries < 50; tries++) {
    const a = rng.sample(pool, rng.int(2, 3));
    const b = rng.sample(pool, rng.int(2, 3));
    const inter = a.filter((x) => b.includes(x));
    const aOnly = a.filter((x) => !b.includes(x));
    const bOnly = b.filter((x) => !a.includes(x));
    if (inter.length && aOnly.length && bOnly.length && (a.includes('outline') || b.includes('outline'))) {
      return [normalize(a), normalize(b)];
    }
  }
  return null;
}

function genMatrixBool(rng) {
  const opKey = rng.pick(['xor', 'xor', 'or', 'and', 'sub']);
  const op = BOOL_OPS[opKey];
  const outlines = rng.sample(OUTLINES, 3);
  const rows = [];
  for (let r = 0; r < 3; r++) {
    const pair = pickBoolPair(rng);
    if (!pair) return null;
    const [a, b] = pair;
    rows.push([
      { outline: outlines[r].key, elements: a },
      { outline: outlines[r].key, elements: b },
      { outline: outlines[r].key, elements: normalize(op.apply(a, b)) },
    ]);
  }
  const correct = rows[2][2];
  const [a, b] = [rows[2][0].elements, rows[2][1].elements];
  const candidates = Object.keys(BOOL_OPS)
    .filter((k) => k !== opKey)
    .map((k) => ({ outline: outlines[2].key, elements: normalize(BOOL_OPS[k].apply(a, b)) }));
  const distractors = uniqueSpecs(correct, rng.shuffle(candidates), 3, rng);
  if (distractors.length < 3) return null;

  const scene = rows.map((row) => row.map((c) => ({ ...c })));
  scene[2][2] = null;
  const names = (els) => listJoin(els.map((k) => ELEMENTS.find((e) => e.key === k).name));
  const explanation = `En cada fila se aplica la regla de ${op.name}: ${op.text}. ` +
    `En la tercera fila, la primera celda tiene ${names(a)} y la segunda ${names(b)}; ` +
    `el resultado es ${correct.elements.length ? names(correct.elements) : 'una celda vacía'}.` +
    ` El contorno de cada fila (${outlines.map((o) => o.name).join(', ')}) es la segunda regla y no cambia dentro de la fila.`;

  return {
    level: 2,
    kind: 'matrix2d',
    prompt: '¿Qué figura completa la matriz?',
    scene: { cells: scene, family: 'bool' },
    answer: correct,
    distractors,
    explanation,
    signature: `m2b:${opKey}:${rows.map((r) => r.slice(0, 2).map((c) => c.elements.join('')).join('|')).join('/')}`,
  };
}

const PROG_ELEMENTS = [
  { key: 'dot', name: 'puntos' },
  { key: 'sq', name: 'cuadrados pequeños' },
  { key: 'tri', name: 'triángulos pequeños' },
  { key: 'star', name: 'estrellas' },
];

function genMatrixProgression(rng) {
  const rowElems = rng.sample(PROG_ELEMENTS, 3);
  const colOutlines = rng.sample(OUTLINES, 3);
  const cells = [];
  for (let r = 0; r < 3; r++) {
    cells.push([]);
    for (let c = 0; c < 3; c++) {
      cells[r].push({ outline: colOutlines[c].key, prog: rowElems[r].key, count: c + 1 });
    }
  }
  const correct = cells[2][2];
  const candidates = rng.shuffle([
    { ...correct, count: 2 },
    { ...correct, count: 4 },
    { ...correct, outline: colOutlines[1].key },
    { ...correct, prog: rowElems[1].key },
    { ...correct, prog: rowElems[0].key, count: 2 },
  ]);
  const distractors = uniqueSpecs(correct, candidates, 3, rng);
  cells[2][2] = null;
  const explanation = `Hay dos reglas simultáneas: en cada fila se repite el mismo tipo de elemento (${rowElems.map((e) => e.name).join(' / ')}) ` +
    `y en cada columna aumenta la cantidad de izquierda a derecha (1, 2, 3) mientras el contorno depende de la columna (${colOutlines.map((o) => o.name).join(', ')}). ` +
    `La celda faltante debe tener 3 ${rowElems[2].name} dentro de un ${colOutlines[2].name}.`;
  return {
    level: 2,
    kind: 'matrix2d',
    prompt: '¿Qué figura completa la matriz?',
    scene: { cells, family: 'prog' },
    answer: correct,
    distractors,
    explanation,
    signature: `m2p:${rowElems.map((e) => e.key).join('')}:${colOutlines.map((o) => o.key).join('')}`,
  };
}

function genMatrixRotation(rng) {
  const outlines = rng.sample(OUTLINES, 3);
  const step = rng.pick([45, 90, -45, -90]);
  const base = rng.pick([0, 45, 90]);
  const cells = [];
  for (let r = 0; r < 3; r++) {
    cells.push([]);
    for (let c = 0; c < 3; c++) {
      cells[r].push({ outline: outlines[r].key, pointer: mod(base + r * 90 + c * step, 360) });
    }
  }
  const correct = cells[2][2];
  const candidates = rng.shuffle([
    { ...correct, pointer: mod(correct.pointer - step, 360) },
    { ...correct, pointer: mod(correct.pointer + step, 360) },
    { ...correct, pointer: mod(correct.pointer + 180, 360) },
    { ...correct, outline: outlines[0].key },
  ]);
  const distractors = uniqueSpecs(correct, candidates, 3, rng);
  cells[2][2] = null;
  const explanation = `La flecha gira ${Math.abs(step)}° en sentido ${step > 0 ? 'horario' : 'antihorario'} al avanzar de columna, ` +
    `y cada fila comienza 90° más adelante que la anterior. La tercera celda de la tercera fila debe apuntar a ${correct.pointer}° ` +
    `dentro de un ${outlines[2].name}, el contorno de esa fila.`;
  return {
    level: 2,
    kind: 'matrix2d',
    prompt: '¿Qué figura completa la matriz?',
    scene: { cells, family: 'rot' },
    answer: correct,
    distractors,
    explanation,
    signature: `m2r:${step}:${base}:${outlines.map((o) => o.key).join('')}`,
  };
}

function genMatrix2D(rng) {
  const roll = rng.next();
  if (roll < 0.6) return genMatrixBool(rng);
  if (roll < 0.85) return genMatrixProgression(rng);
  return genMatrixRotation(rng);
}

// ---------------------------------------------------------------------------
// Nivel 3 — Secuencia 3D lineal
// ---------------------------------------------------------------------------

const AXIS_NAMES = ['x', 'y', 'z'];
const AXIS_MOVE = [
  ['hacia la izquierda', 'hacia la derecha'],
  ['hacia abajo', 'hacia arriba'],
  ['hacia el frente', 'hacia atrás'],
];

export function vertexName(v) {
  return `${v[1] ? 'superior' : 'inferior'}-${v[0] ? 'derecho' : 'izquierdo'}-${v[2] ? 'trasero' : 'frontal'}`;
}

function genSeq3D(rng) {
  const start = [rng.int(0, 1), rng.int(0, 1), rng.int(0, 1)];
  const axes = rng.shuffle([0, 1, 2]);
  const attr = rng.pick(['color', 'color', 'shape', 'size']);
  const baseColor = rng.int(0, 2);
  const shapeCycle = rng.shuffle(SHAPES3D.slice(0, 3));
  const shape = rng.pick(SHAPES3D.slice(0, 3));

  const cubes = [];
  let v = start.slice();
  for (let i = 0; i < 4; i++) {
    if (i > 0) {
      v = v.slice();
      v[axes[i - 1]] = 1 - v[axes[i - 1]];
    }
    const spec = { vertex: v.slice(), color: baseColor, shape: shape.key, size: 1 };
    if (attr === 'color') spec.color = mod(baseColor + i, 3);
    if (attr === 'shape') spec.shape = shapeCycle[i % 3].key;
    if (attr === 'size') spec.size = i;
    cubes.push(spec);
  }
  const correct = cubes[3];
  const prev = cubes[2];
  const toggle = (vv, a) => { const n = vv.slice(); n[a] = 1 - n[a]; return n; };
  const candidates = rng.shuffle([
    { ...correct, vertex: prev.vertex },
    { ...correct, vertex: toggle(prev.vertex, axes[0]) },
    { ...correct, vertex: toggle(prev.vertex, axes[1]) },
    { ...correct, vertex: [1 - correct.vertex[0], 1 - correct.vertex[1], 1 - correct.vertex[2]] },
    ...(attr === 'color' ? [{ ...correct, color: prev.color }, { ...correct, color: mod(correct.color + 1, 3) }] : []),
    ...(attr === 'shape' ? [{ ...correct, shape: prev.shape }, { ...correct, shape: shapeCycle[1].key }] : []),
    ...(attr === 'size' ? [{ ...correct, size: prev.size }, { ...correct, size: 1 }] : []),
  ]);
  const distractors = uniqueSpecs(correct, candidates, 3, rng);
  if (distractors.length < 3) return null;

  const moves = axes.map((a, i) => `eje ${AXIS_NAMES[a]} (${AXIS_MOVE[a][cubes[i + 1].vertex[a]]})`);
  let explanation = `El objeto recorre una arista por paso siguiendo un orden fijo de ejes: ${moves[0]}, luego ${moves[1]}; ` +
    `por lo tanto el tercer movimiento se hace por el ${moves[2]}, llegando al vértice ${vertexName(correct.vertex)}.`;
  if (attr === 'color') {
    explanation += ` En paralelo, el color cicla ${COLORS[cubes[0].color].name} → ${COLORS[cubes[1].color].name} → ${COLORS[cubes[2].color].name} → ${COLORS[correct.color].name}.`;
  } else if (attr === 'shape') {
    explanation += ` En paralelo, la forma cicla ${shapeCycle.map((s) => s.name).join(' → ')} y vuelve a ${SHAPES3D.find((s) => s.key === correct.shape).name}.`;
  } else {
    explanation += ' En paralelo, el tamaño del objeto crece un grado en cada cubo.';
  }
  return {
    level: 3,
    kind: 'seq3d',
    prompt: '¿Dónde estará el objeto en el cuarto cubo y con qué atributo?',
    scene: { cubes: [cubes[0], cubes[1], cubes[2], null] },
    answer: correct,
    distractors,
    explanation,
    signature: `s3d:${start.join('')}:${axes.join('')}:${attr}:${baseColor}:${shape.key}:${attr === 'shape' ? shapeCycle.map((s) => s.key).join('') : ''}`,
  };
}

// ---------------------------------------------------------------------------
// Nivel 4 — Cubo 3×3×3
// ---------------------------------------------------------------------------

export const SYMBOLS = [
  { key: 'arrow', name: 'flecha' },
  { key: 'tri', name: 'triángulo' },
  { key: 'ell', name: 'figura en L' },
  { key: 'tee', name: 'figura en T' },
  { key: 'flag', name: 'banderín' },
];

const ROT_NAMES = ['hacia arriba', 'hacia la derecha', 'hacia abajo', 'hacia la izquierda'];
const AXIS_LABEL = ['Eje X (izquierda → derecha)', 'Eje Y (abajo → arriba)', 'Eje Z (frente → fondo)'];

export function ruleText(rule) {
  if (rule.type === 'stars') return `cada paso suma ${rule.k === 1 ? 'una estrella' : `${rule.k} estrellas`} alrededor de la figura`;
  if (rule.type === 'rotate') return `cada paso gira la figura 90° en sentido ${rule.dir === 1 ? 'horario' : 'antihorario'}`;
  return 'cada paso invierte la polaridad (fondo y trazo intercambian color)';
}

function genCube3D(rng) {
  const types = rng.shuffle(['stars', 'rotate', 'polarity']);
  const rules = types.map((t) => {
    if (t === 'stars') return { type: t, k: rng.pick([1, 1, 2]) };
    if (t === 'rotate') return { type: t, dir: rng.pick([1, -1]) };
    return { type: t };
  });
  const symbol = rng.pick(SYMBOLS);
  let target;
  do {
    target = [rng.int(0, 2), rng.int(0, 2), rng.int(0, 2)];
  } while (target.filter((c) => c > 0).length < 2);

  const anchor = { symbol: symbol.key, stars: 0, rot: 0, polarity: 0 };
  const evalBlock = (coord) => {
    const b = { ...anchor };
    coord.forEach((steps, axis) => {
      const r = rules[axis];
      if (r.type === 'stars') b.stars += r.k * steps;
      if (r.type === 'rotate') b.rot = mod(b.rot + r.dir * steps, 4);
      if (r.type === 'polarity') b.polarity = (b.polarity + steps) % 2;
    });
    return b;
  };
  const correct = evalBlock(target);
  const starsRule = rules.find((r) => r.type === 'stars');
  const candidates = rng.shuffle([
    { ...correct, rot: mod(correct.rot + 1, 4) },
    { ...correct, rot: mod(correct.rot - 1, 4) },
    { ...correct, rot: mod(correct.rot + 2, 4) },
    { ...correct, polarity: 1 - correct.polarity },
    { ...correct, stars: Math.max(0, correct.stars - starsRule.k) },
    { ...correct, stars: correct.stars + starsRule.k },
    { ...correct, polarity: 1 - correct.polarity, rot: mod(correct.rot + 1, 4) },
  ]);
  const distractors = uniqueSpecs(correct, candidates, 3, rng);
  if (distractors.length < 3) return null;

  const parts = target.map((steps, axis) => {
    const r = rules[axis];
    const axisName = AXIS_NAMES[axis].toUpperCase();
    if (steps === 0) return `Eje ${axisName} = 0: sin cambios por este eje`;
    if (r.type === 'stars') return `Eje ${axisName} = ${steps}: ${steps} paso(s) × ${r.k} = ${steps * r.k} estrella(s)`;
    if (r.type === 'rotate') return `Eje ${axisName} = ${steps}: giro de ${steps * 90}° ${r.dir === 1 ? 'horario' : 'antihorario'}, la figura queda ${ROT_NAMES[mod(r.dir * steps, 4)]}`;
    return `Eje ${axisName} = ${steps}: la polaridad se invierte ${steps} vez/veces → ${steps % 2 ? 'fondo oscuro y trazo claro' : 'polaridad original'}`;
  });
  const explanation = `Partiendo del bloque ancla (0,0,0) con ${symbol.name} ${ROT_NAMES[0]}, fondo claro y cero estrellas: ` +
    parts.join('; ') + `. Resultado: ${symbol.name} ${ROT_NAMES[correct.rot]}, ${correct.stars} estrella(s), ${correct.polarity ? 'fondo oscuro' : 'fondo claro'}.`;

  return {
    level: 4,
    kind: 'cube3d',
    prompt: `¿Cómo es el bloque de la coordenada (${target.join(', ')})?`,
    rules: rules.map((r, axis) => ({ axis: AXIS_NAMES[axis], label: AXIS_LABEL[axis], text: ruleText(r), ...r })),
    scene: { anchor, target, rules },
    answer: correct,
    distractors,
    explanation,
    signature: `c3d:${types.join('')}:${rules.map((r) => r.k || r.dir || '').join('')}:${symbol.key}:${target.join('')}`,
  };
}

// ---------------------------------------------------------------------------
// Banco y sesión
// ---------------------------------------------------------------------------

const GENERATORS = { 1: genSeq2D, 2: genMatrix2D, 3: genSeq3D, 4: genCube3D };
const bankCache = new Map();

/** Banco estable de BANK_SIZE ejercicios por nivel. */
export function getBank(level) {
  if (bankCache.has(level)) return bankCache.get(level);
  const rng = makeRng(`wj-bank-${level}-v1`);
  const gen = GENERATORS[level];
  const seen = new Set();
  const bank = [];
  let guard = 0;
  while (bank.length < BANK_SIZE && guard++ < 20000) {
    const ex = gen(rng);
    if (!ex || seen.has(ex.signature)) continue;
    seen.add(ex.signature);
    ex.id = `N${level}-${String(bank.length + 1).padStart(2, '0')}`;
    bank.push(ex);
  }
  bankCache.set(level, bank);
  return bank;
}

/** Selección aleatoria de SESSION_SIZE ejercicios con opciones barajadas. */
export function getSessionExercises(level, count = SESSION_SIZE) {
  const rng = makeRng();
  const bank = getBank(level);
  return rng.shuffle(bank).slice(0, count).map((ex) => {
    const options = rng.shuffle([
      { spec: ex.answer, correct: true },
      ...ex.distractors.map((spec) => ({ spec, correct: false })),
    ]).map((o, i) => ({ ...o, key: 'ABCD'[i] }));
    return { ...ex, options };
  });
}

export function levelInfo(level) {
  return LEVELS.find((l) => l.id === level);
}
