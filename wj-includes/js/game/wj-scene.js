/**
 * wj-scene.js — Escenario three.js: un solo lienzo WebGL que renderiza varias
 * "vistas" (viewports con scissor) sobre elementos HTML, más un renderizador
 * fuera de pantalla para instantáneas (p. ej., la respuesta correcta en un modal).
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/OrbitControls.js';
import { drawMatrixCell, drawBlockFace, drawLabel, makeCanvas, PALETTE } from './wj-symbols.js';
import { COLORS } from './wj-exercises.js';

const HEX = {
  cream: 0xfffcf3,
  blue: 0x348afb,
  blueDeep: 0x2456b8,
  navy: 0x0b1f3a,
  tile: 0x0d1a33,
  ink: 0xe8eefc,
  yellow: 0xffd500,
  orange: 0xf5923e,
  green: 0x22c05c,
  red: 0xff4d63,
  white: 0xffffff,
  edge: 0x5f8fd6,
};

const clamp = THREE.MathUtils.clamp;
const deg = THREE.MathUtils.degToRad;

// ---------------------------------------------------------------------------
// Texturas y materiales
// ---------------------------------------------------------------------------

const textureCache = new Map();

function canvasTexture(key, size, draw, height = size) {
  if (textureCache.has(key)) return textureCache.get(key);
  const canvas = makeCanvas(size, height);
  draw(canvas.getContext('2d'));
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  textureCache.set(key, tex);
  return tex;
}

function addLights(scene) {
  scene.add(new THREE.HemisphereLight(0xffffff, 0xe4eeff, 1.35));
  const key = new THREE.DirectionalLight(0xffffff, 1.9);
  key.position.set(3, 6, 6);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xffffff, 0.8);
  fill.position.set(-4, 2, -3);
  scene.add(fill);
  scene.add(new THREE.AmbientLight(0xffffff, 0.45));
}

/** Cuadrado con bisel en las esquinas superior-izquierda e inferior-derecha. */
function chamferShape(w, h, c) {
  const s = new THREE.Shape();
  const x = -w / 2;
  const y = -h / 2;
  s.moveTo(x + c, y + h);      // arriba-izquierda (cortada)
  s.lineTo(x + w, y + h);      // arriba-derecha
  s.lineTo(x + w, y + c);      // abajo-derecha (cortada)
  s.lineTo(x + w - c, y);
  s.lineTo(x, y);              // abajo-izquierda
  s.lineTo(x, y + h - c);
  s.closePath();
  return s;
}

const tileGeoCache = new Map();
function tileGeometry(size) {
  const key = size.toFixed(3);
  if (!tileGeoCache.has(key)) {
    const geo = new THREE.ExtrudeGeometry(chamferShape(size, size, size * 0.14), {
      depth: size * 0.06,
      bevelEnabled: true,
      bevelThickness: size * 0.012,
      bevelSize: size * 0.012,
      bevelSegments: 2,
    });
    tileGeoCache.set(key, geo);
  }
  return tileGeoCache.get(key);
}

/** Contorno biselado (línea) en un color dado. */
function chamferOutline(size, z, colorHex, { dashed = false, scale = 1.005 } = {}) {
  const pts = chamferShape(size * scale, size * scale, size * 0.14 * scale).getPoints(1);
  const geo = new THREE.BufferGeometry().setFromPoints(pts.map((p) => new THREE.Vector3(p.x, p.y, z)));
  const mat = dashed
    ? new THREE.LineDashedMaterial({ color: colorHex, dashSize: size * 0.06, gapSize: size * 0.04 })
    : new THREE.LineBasicMaterial({ color: colorHex, transparent: true, opacity: 0.95 });
  const line = new THREE.LineLoop(geo, mat);
  if (dashed) line.computeLineDistances();
  return line;
}

/** Ficha oscura biselada con borde azul. `ghost` = ficha de la celda faltante. */
function makeTile(size, { ghost = false } = {}) {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({
    color: HEX.tile,
    emissive: HEX.tile,
    emissiveIntensity: ghost ? 0.1 : 0.35,
    roughness: 0.55,
    metalness: 0.15,
    transparent: ghost,
    opacity: ghost ? 0.35 : 1,
  });
  const mesh = new THREE.Mesh(tileGeometry(size), mat);
  g.add(mesh);
  g.add(chamferOutline(size, size * 0.08, HEX.blue, { dashed: ghost }));
  g.userData.depth = size * 0.08;
  g.userData.size = size;
  return g;
}

function makeSprite(text, { color = PALETTE.blue, scale = 0.6, bg = null, stroke = null, font } = {}) {
  const key = `label:${text}:${color}:${bg}:${stroke}:${font}`;
  const tex = canvasTexture(key, 256, (ctx) => drawLabel(ctx, text, 256, 256, { color, bg, stroke, font }));
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
  sprite.scale.set(scale, scale, 1);
  return sprite;
}

function objectMaterial(colorHex) {
  return new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.32, metalness: 0.18 });
}

const OBJ_GEO = {};
function objectGeometry(shape) {
  if (!OBJ_GEO[shape]) {
    switch (shape) {
      case 'cube': OBJ_GEO[shape] = new THREE.BoxGeometry(1.5, 1.5, 1.5); break;
      case 'tetra': OBJ_GEO[shape] = new THREE.ConeGeometry(1.05, 1.7, 4); break;
      case 'torus': OBJ_GEO[shape] = new THREE.TorusGeometry(0.75, 0.32, 18, 36); break;
      case 'octa': OBJ_GEO[shape] = new THREE.OctahedronGeometry(1.15); break;
      default: OBJ_GEO[shape] = new THREE.SphereGeometry(1, 36, 24);
    }
  }
  return OBJ_GEO[shape];
}

/** Objeto 3D (esfera, cubo, pirámide, anillo, octaedro) de radio aproximado r. */
function makeObject(shape, colorHex, r) {
  const mesh = new THREE.Mesh(objectGeometry(shape), objectMaterial(colorHex));
  mesh.scale.setScalar(r);
  if (shape === 'tetra') mesh.rotation.y = Math.PI / 4;
  if (shape === 'cube') mesh.rotation.set(0.35, 0.6, 0);
  if (shape === 'octa') mesh.rotation.set(0.3, 0.4, 0);
  return mesh;
}

const edgeGeo = new THREE.CylinderGeometry(1, 1, 1, 8, 1);
/** Aristas de un cubo como 12 cilindros instanciados. */
function makeEdges(size, radius, colorHex, opacity = 1) {
  const mat = new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.4, metalness: 0.2, transparent: opacity < 1, opacity });
  const inst = new THREE.InstancedMesh(edgeGeo, mat, 12);
  const h = size / 2;
  const corners = [];
  for (let x = -1; x <= 1; x += 2) for (let y = -1; y <= 1; y += 2) for (let z = -1; z <= 1; z += 2) corners.push(new THREE.Vector3(x * h, y * h, z * h));
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const up = new THREE.Vector3(0, 1, 0);
  let i = 0;
  for (let a = 0; a < corners.length; a++) {
    for (let b = a + 1; b < corners.length; b++) {
      const A = corners[a];
      const B = corners[b];
      const diff = B.clone().sub(A);
      if (Math.abs(diff.length() - size) > 1e-6) continue; // solo aristas
      const mid = A.clone().add(B).multiplyScalar(0.5);
      q.setFromUnitVectors(up, diff.clone().normalize());
      m.compose(mid, q, new THREE.Vector3(radius, size + radius * 2, radius));
      inst.setMatrixAt(i++, m);
    }
  }
  inst.instanceMatrix.needsUpdate = true;
  return inst;
}

/** Cubo translúcido con aristas y marcadores de vértice. */
function makeGlassCube(size, { edgeColor = HEX.blue, edgeRadius = 0.012, opacity = 0.1, vertices = true, ghost = false } = {}) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(size, size, size),
    new THREE.MeshPhysicalMaterial({ color: 0xbfd8ff, transparent: true, opacity: ghost ? 0.05 : opacity, roughness: 0.15, metalness: 0, depthWrite: false }),
  );
  g.add(body);
  g.add(makeEdges(size, edgeRadius, edgeColor, ghost ? 0.35 : 1));
  if (vertices) {
    const dotGeo = new THREE.SphereGeometry(size * 0.025, 12, 8);
    const dotMat = new THREE.MeshStandardMaterial({ color: HEX.ink, emissive: HEX.ink, emissiveIntensity: 0.3, roughness: 0.5, transparent: ghost, opacity: ghost ? 0.35 : 1 });
    const h = size / 2;
    for (let x = -1; x <= 1; x += 2) for (let y = -1; y <= 1; y += 2) for (let z = -1; z <= 1; z += 2) {
      const d = new THREE.Mesh(dotGeo, dotMat);
      d.position.set(x * h, y * h, z * h);
      g.add(d);
    }
  }
  return g;
}

/** Flechas de ejes x (derecha), y (arriba), z (hacia el fondo). */
function makeAxisGizmo(len) {
  const g = new THREE.Group();
  const defs = [
    ['x', new THREE.Vector3(1, 0, 0)],
    ['y', new THREE.Vector3(0, 1, 0)],
    ['z', new THREE.Vector3(0, 0, -1)],
  ];
  for (const [name, dir] of defs) {
    const arrow = new THREE.ArrowHelper(dir, new THREE.Vector3(0, 0, 0), len, HEX.blue, len * 0.22, len * 0.12);
    g.add(arrow);
    const label = makeSprite(name, { color: PALETTE.blue, scale: len * 0.32, font: 'italic bold 150px "Hind Madurai", "Segoe UI", sans-serif' });
    label.position.copy(dir.clone().multiplyScalar(len * 1.22));
    g.add(label);
  }
  return g;
}

function disposeObject(obj) {
  obj.traverse((o) => {
    if (o.geometry && !Object.values(OBJ_GEO).includes(o.geometry) && o.geometry !== edgeGeo && ![...tileGeoCache.values()].includes(o.geometry)) {
      o.geometry.dispose();
    }
    if (o.material) {
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      mats.forEach((m) => { if (m.map && !textureCache.has(m.map.userData?.key)) { /* texturas en caché */ } m.dispose(); });
    }
  });
}

// ---------------------------------------------------------------------------
// Vista (viewport) y escenario
// ---------------------------------------------------------------------------

const DEFAULT_ANGLES = { az: 0, el: 10 };

class View {
  constructor(stage, el, opts = {}) {
    this.stage = stage;
    this.el = el;
    this.fitBox = opts.fit || { w: 2, h: 2, depth: 0 };
    this.angle = opts.angle || DEFAULT_ANGLES;
    this.padding = opts.padding || 1.12;
    this.sway = opts.sway || 0;
    this.zoomFactor = 1;
    this.userInteracted = false;
    this.animations = [];
    this.scene = new THREE.Scene();
    addLights(this.scene);
    this.group = new THREE.Group();
    this.scene.add(this.group);
    this.camera = new THREE.PerspectiveCamera(opts.fov || 26, 1, 0.05, 200);
    this.baseDistance = 5;
    if (opts.orbit && el.addEventListener) {
      this.controls = new OrbitControls(this.camera, el);
      this.controls.enableDamping = true;
      this.controls.dampingFactor = 0.08;
      this.controls.enablePan = false;
      this.controls.rotateSpeed = 0.7;
      this.controls.addEventListener('start', () => { this.userInteracted = true; });
    }
    this.fit();
  }

  rect() {
    return this.el.getBoundingClientRect();
  }

  visible() {
    return this.el.getClientRects ? this.el.getClientRects().length > 0 : true;
  }

  fit() {
    const r = this.rect();
    const aspect = Math.max(r.width, 1) / Math.max(r.height, 1);
    this.camera.aspect = aspect;
    const fov = deg(this.camera.fov);
    const dH = (this.fitBox.h / 2) / Math.tan(fov / 2);
    const dW = (this.fitBox.w / 2) / (Math.tan(fov / 2) * aspect);
    this.baseDistance = Math.max(dH, dW) * this.padding + (this.fitBox.depth || 0) * 0.6;
    this.camera.updateProjectionMatrix();
    if (this.controls) {
      this.controls.minDistance = this.baseDistance * 0.4;
      this.controls.maxDistance = this.baseDistance * 2.6;
    }
    if (!this.userInteracted) this.placeCamera();
    if (this.controls) this.controls.update();
  }

  placeCamera() {
    const d = this.baseDistance * this.zoomFactor;
    const az = deg(this.angle.az);
    const el = deg(this.angle.el);
    this.camera.position.set(d * Math.sin(az) * Math.cos(el), d * Math.sin(el), d * Math.cos(az) * Math.cos(el));
    this.camera.lookAt(0, 0, 0);
    if (this.controls) this.controls.target.set(0, 0, 0);
  }

  /** factor > 1 acerca; < 1 aleja. */
  zoom(factor) {
    if (this.controls) {
      const dir = this.camera.position.clone().sub(this.controls.target);
      const len = clamp(dir.length() / factor, this.controls.minDistance, this.controls.maxDistance);
      dir.setLength(len);
      this.camera.position.copy(this.controls.target).add(dir);
      this.controls.update();
    } else {
      this.zoomFactor = clamp(this.zoomFactor / factor, 0.4, 2.6);
      this.placeCamera();
    }
  }

  reset() {
    this.userInteracted = false;
    this.zoomFactor = 1;
    this.group.rotation.set(0, 0, 0);
    this.placeCamera();
    if (this.controls) this.controls.update();
  }

  update(t) {
    if (this.sway && !this.userInteracted) {
      this.group.rotation.y = Math.sin(t * 0.8) * this.sway;
    }
    for (const fn of this.animations) fn(t);
    if (this.controls) this.controls.update();
  }

  dispose() {
    if (this.controls) this.controls.dispose();
    disposeObject(this.group);
    this.scene.clear();
  }
}

export class Stage {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.autoClear = false;
    this.views = new Set();
    this.startedAt = performance.now();
    this.running = false;
    this.onResize = () => this.resize();
    window.addEventListener('resize', this.onResize);
    this.resize();
  }

  resize() {
    this.renderer.setSize(window.innerWidth, window.innerHeight, false);
    for (const v of this.views) v.fit();
  }

  refit() {
    for (const v of this.views) v.fit();
  }

  start() {
    if (this.running) return;
    this.running = true;
    const loop = () => {
      if (!this.running) return;
      this.renderAll();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  stop() {
    this.running = false;
  }

  renderAll() {
    const t = (performance.now() - this.startedAt) / 1000;
    const r = this.renderer;
    const W = window.innerWidth;
    const H = window.innerHeight;
    r.setScissorTest(false);
    r.setViewport(0, 0, W, H);
    r.clear();
    r.setScissorTest(true);
    for (const v of this.views) {
      if (!v.visible()) continue;
      const rect = v.rect();
      if (rect.width < 2 || rect.height < 2 || rect.bottom < 0 || rect.top > H || rect.right < 0 || rect.left > W) continue;
      const bottom = H - rect.bottom;
      r.setViewport(rect.left, bottom, rect.width, rect.height);
      r.setScissor(rect.left, bottom, rect.width, rect.height);
      if (Math.abs(v.camera.aspect - rect.width / rect.height) > 0.01) v.fit();
      v.update(t);
      r.render(v.scene, v.camera);
    }
    r.setScissorTest(false);
  }

  addView(el, opts) {
    const v = new View(this, el, opts);
    this.views.add(v);
    return v;
  }

  removeView(v) {
    if (!v) return;
    v.dispose();
    this.views.delete(v);
  }

  clearViews() {
    for (const v of this.views) v.dispose();
    this.views.clear();
  }
}

// ---------------------------------------------------------------------------
// Constructores de escena por tipo de ejercicio
// ---------------------------------------------------------------------------

const VIEW_PRESETS = {
  seq2d: {
    main: { fit: { w: 7.0, h: 2.0 }, angle: { az: 0, el: 10 }, sway: 0 },
    mainPortrait: { fit: { w: 3.6, h: 3.6 }, angle: { az: 0, el: 10 }, sway: 0 },
    option: { fit: { w: 1.7, h: 1.7 }, angle: { az: 0, el: 10 }, sway: 0 },
  },
  matrix2d: {
    main: { fit: { w: 3.7, h: 3.7 }, angle: { az: 0, el: 8 }, sway: 0 },
    option: { fit: { w: 1.35, h: 1.35 }, angle: { az: 0, el: 8 }, sway: 0 },
  },
  seq3d: {
    main: { fit: { w: 7.6, h: 2.4, depth: 1.2 }, angle: { az: 18, el: 20 }, sway: 0 },
    mainPortrait: { fit: { w: 4.2, h: 4.4, depth: 1.2 }, angle: { az: 18, el: 20 }, sway: 0 },
    option: { fit: { w: 1.95, h: 1.95, depth: 1.2 }, angle: { az: 26, el: 22 }, sway: 0.14 },
  },
  cube3d: {
    main: { fit: { w: 5.4, h: 4.6, depth: 3.2 }, angle: { az: 33, el: 23 }, sway: 0.06 },
    option: { fit: { w: 1.7, h: 1.7, depth: 1.1 }, angle: { az: 24, el: 15 }, sway: 0.16 },
  },
};

/** Preajuste de cámara. `portrait` usa la disposición 2×2 en pantallas verticales. */
export function viewPreset(kind, role, portrait = false) {
  const p = VIEW_PRESETS[kind];
  if (role === 'main' && portrait && p.mainPortrait) return p.mainPortrait;
  return p[role];
}

const L1_TILE = 1.4;
const L1_RADII = [0.12, 0.155, 0.19, 0.23];
const L3_CUBE = 1.15;
const L3_RADII = [0.1, 0.14, 0.18, 0.22];

function gridOffset(pos, tile) {
  const col = pos % 3;
  const row = Math.floor(pos / 3);
  const step = tile * 0.3;
  return { x: (col - 1) * step, y: (1 - row) * step };
}

/** Ficha del nivel 1 con su objeto. */
function buildSeq2DCell(spec, { ghost = false } = {}) {
  const tile = makeTile(L1_TILE, { ghost });
  if (ghost) {
    const q = makeSprite('?', { color: PALETTE.blue, scale: 0.7 });
    q.position.z = 0.35;
    tile.add(q);
    return tile;
  }
  const r = L1_RADII[spec.size ?? 1];
  const obj = makeObject(spec.shape, COLORS[spec.color ?? 0].hex, r);
  const { x, y } = gridOffset(spec.pos, L1_TILE);
  obj.position.set(x, y, tile.userData.depth + r * 0.95);
  tile.add(obj);
  return tile;
}

/** Posición de cada elemento de una secuencia de 4 (fila o cuadrícula 2×2). */
function sequenceSlot(i, spacing, portrait) {
  if (!portrait) return new THREE.Vector3((i - 1.5) * spacing, 0, 0);
  return new THREE.Vector3(((i % 2) - 0.5) * spacing, (0.5 - Math.floor(i / 2)) * spacing, 0);
}

function addSequenceMarkers(group, spacing, portrait, z, yOffset = 0) {
  const numFont = 'bold 150px "Hind Madurai", "Segoe UI", sans-serif';
  for (let i = 0; i < 4; i++) {
    const p = sequenceSlot(i, spacing, portrait);
    if (portrait) {
      const n = makeSprite(String(i + 1), { color: PALETTE.blue, scale: 0.34, font: numFont });
      n.position.set(p.x - spacing * 0.42, p.y + spacing * 0.42, z + 0.2);
      group.add(n);
    }
    if (i < 3 && (!portrait || i !== 1)) {
      const chevron = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.16, 12), objectMaterial(HEX.blue));
      chevron.rotation.z = -Math.PI / 2;
      chevron.position.set(p.x + spacing / 2, p.y + yOffset, z);
      group.add(chevron);
    }
  }
}

function buildSeq2DMain(group, exercise, portrait, view) {
  const spacing = L1_TILE + 0.32;
  exercise.scene.cells.forEach((spec, i) => {
    const cell = spec ? buildSeq2DCell(spec) : buildSeq2DCell(null, { ghost: true });
    cell.position.copy(sequenceSlot(i, spacing, portrait));
    group.add(cell);
    if (!spec) {
      view.slot = {
        ghost: cell,
        position: cell.position.clone(),
        build: (s) => buildSeq2DCell(s),
        frame: (color) => chamferOutline(L1_TILE, L1_TILE * 0.085, color, { scale: 1.06 }),
      };
    }
  });
  addSequenceMarkers(group, spacing, portrait, 0.1);
}

/** Ficha del nivel 2 con símbolo. */
function buildMatrixCell(spec, size = 1.0, { ghost = false } = {}) {
  const tile = makeTile(size, { ghost });
  if (ghost) {
    const q = makeSprite('?', { color: PALETTE.blue, scale: size * 0.55 });
    q.position.z = 0.3;
    tile.add(q);
    return tile;
  }
  const key = 'm2:' + JSON.stringify(spec);
  const tex = canvasTexture(key, 512, (ctx) => drawMatrixCell(ctx, spec, 512, PALETTE.ink));
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(size * 0.9, size * 0.9), new THREE.MeshBasicMaterial({ map: tex, transparent: true }));
  plane.position.z = tile.userData.depth + 0.004;
  tile.add(plane);
  return tile;
}

function buildMatrixMain(group, exercise, view) {
  const size = 1.0;
  const gap = 0.16;
  exercise.scene.cells.forEach((row, r) => {
    row.forEach((spec, c) => {
      const cell = spec ? buildMatrixCell(spec, size) : buildMatrixCell(null, size, { ghost: true });
      cell.position.set((c - 1) * (size + gap), (1 - r) * (size + gap), 0);
      group.add(cell);
      if (!spec) {
        view.slot = {
          ghost: cell,
          position: cell.position.clone(),
          build: (s) => buildMatrixCell(s, size),
          frame: (color) => chamferOutline(size, size * 0.085, color, { scale: 1.07 }),
        };
      }
    });
  });
}

function vertexToLocal(v, size) {
  return new THREE.Vector3((v[0] - 0.5) * size, (v[1] - 0.5) * size, (0.5 - v[2]) * size);
}

/** Cubo del nivel 3 con su objeto en un vértice. */
function buildSeq3DCube(spec, { ghost = false } = {}) {
  const cube = makeGlassCube(L3_CUBE, { ghost });
  if (ghost) {
    const q = makeSprite('?', { color: PALETTE.blue, scale: 0.7 });
    cube.add(q);
    return cube;
  }
  const r = L3_RADII[spec.size ?? 1];
  const obj = makeObject(spec.shape, COLORS[spec.color ?? 0].hex, r);
  obj.position.copy(vertexToLocal(spec.vertex, L3_CUBE));
  cube.add(obj);
  return cube;
}

function buildSeq3DMain(group, exercise, portrait, view) {
  const spacing = L3_CUBE + (portrait ? 0.95 : 0.7);
  exercise.scene.cubes.forEach((spec, i) => {
    const cube = spec ? buildSeq3DCube(spec) : buildSeq3DCube(null, { ghost: true });
    cube.position.copy(sequenceSlot(i, spacing, portrait));
    cube.userData.sway = 0.1;
    group.add(cube);
    if (!spec) {
      view.slot = {
        ghost: cube,
        position: cube.position.clone(),
        build: (s) => { const c = buildSeq3DCube(s); c.userData.sway = 0.1; return c; },
        frame: (color) => makeEdges(L3_CUBE * 1.06, 0.02, color),
      };
    }
  });
  addSequenceMarkers(group, spacing, portrait, 0, -L3_CUBE * 0.15);
  const gizmo = makeAxisGizmo(0.55);
  const first = sequenceSlot(0, spacing, portrait);
  gizmo.position.set(first.x - L3_CUBE * 0.5 - 0.2, first.y - L3_CUBE * 0.5, L3_CUBE * 0.5 + 0.15);
  group.add(gizmo);
}

/** Bloque del nivel 4 (cara frontal con símbolo). */
function buildBlock(spec, size = 1.0, { opaque = true } = {}) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(size, size, size),
    new THREE.MeshStandardMaterial({ color: spec.polarity ? HEX.navy : HEX.cream, roughness: 0.5, metalness: 0.08, transparent: !opaque, opacity: opaque ? 1 : 0.35 }),
  );
  g.add(body);
  g.add(makeEdges(size, size * 0.012, spec.polarity ? HEX.blue : HEX.edge));
  const key = 'blk:' + JSON.stringify(spec);
  const tex = canvasTexture(key, 512, (ctx) => drawBlockFace(ctx, spec, 512));
  const face = new THREE.Mesh(new THREE.PlaneGeometry(size * 0.97, size * 0.97), new THREE.MeshBasicMaterial({ map: tex }));
  face.position.z = size / 2 + 0.003;
  g.add(face);
  return g;
}

function buildCube3DMain(group, exercise, view) {
  const cell = 1.0;
  const gap = 0.08;
  const pitch = cell + gap;
  const { anchor, target } = exercise.scene;
  const toWorld = (i, j, k) => new THREE.Vector3((i - 1) * pitch, (j - 1) * pitch, (1 - k) * pitch);
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      for (let k = 0; k < 3; k++) {
        const isAnchor = i === 0 && j === 0 && k === 0;
        const isTarget = i === target[0] && j === target[1] && k === target[2];
        let block;
        if (isAnchor) {
          block = buildBlock(anchor, cell);
        } else if (isTarget) {
          block = makeGlassCube(cell, { edgeColor: HEX.blue, edgeRadius: 0.022, opacity: 0.22, vertices: false });
          const q = makeSprite('?', { color: PALETTE.blue, scale: 0.75 });
          block.add(q);
          block.userData.pulse = true;
          view.slot = {
            ghost: block,
            position: toWorld(i, j, k),
            build: (s) => buildBlock(s, cell),
            frame: (color) => makeEdges(cell * 1.06, 0.022, color),
          };
        } else {
          block = makeGlassCube(cell, { edgeColor: HEX.edge, edgeRadius: 0.006, opacity: 0.05, vertices: false });
        }
        block.position.copy(toWorld(i, j, k));
        group.add(block);
      }
    }
  }
  // Ejes y numeración de coordenadas.
  const gizmo = makeAxisGizmo(0.8);
  gizmo.position.set(-1.5 * pitch - 0.35, -1.5 * pitch - 0.05, 1.5 * pitch + 0.35);
  group.add(gizmo);
  const numFont = 'bold 150px "Hind Madurai", "Segoe UI", sans-serif';
  for (let n = 0; n < 3; n++) {
    const sx = makeSprite(String(n), { color: PALETTE.ink, scale: 0.34, font: numFont });
    sx.position.set((n - 1) * pitch, -1.5 * pitch - 0.3, 1.5 * pitch + 0.15);
    group.add(sx);
    const sy = makeSprite(String(n), { color: PALETTE.ink, scale: 0.34, font: numFont });
    sy.position.set(-1.5 * pitch - 0.3, (n - 1) * pitch, 1.5 * pitch + 0.15);
    group.add(sy);
    const sz = makeSprite(String(n), { color: PALETTE.ink, scale: 0.34, font: numFont });
    sz.position.set(1.5 * pitch + 0.3, -1.5 * pitch - 0.1, (1 - n) * pitch);
    group.add(sz);
  }
}

/** Construye la escena principal de un ejercicio en la vista. */
export function buildMainScene(view, exercise, { portrait = false } = {}) {
  const g = view.group;
  view.slot = null;
  view.previewObj = null;
  switch (exercise.kind) {
    case 'seq2d': buildSeq2DMain(g, exercise, portrait, view); break;
    case 'matrix2d': buildMatrixMain(g, exercise, view); break;
    case 'seq3d': buildSeq3DMain(g, exercise, portrait, view); break;
    case 'cube3d': buildCube3DMain(g, exercise, view); break;
    default: break;
  }
  // Pulso de los bloques "?" (nivel 4) y balanceo individual de cubos (nivel 3).
  const pulsing = [];
  const swaying = [];
  g.traverse((o) => {
    if (o.userData.pulse) pulsing.push(o);
    if (o.userData.sway) swaying.push(o);
  });
  if (pulsing.length || swaying.length) {
    view.animations.push((t) => {
      if (view.userInteracted) return;
      const s = 1 + Math.sin(t * 3) * 0.03;
      pulsing.forEach((o) => o.scale.setScalar(s));
      swaying.forEach((o) => { o.rotation.y = Math.sin(t * 0.8) * o.userData.sway; });
    });
  }
}

/** Construye la escena de una opción de respuesta. */
export function buildOptionScene(view, exercise, spec) {
  const g = view.group;
  switch (exercise.kind) {
    case 'seq2d': g.add(buildSeq2DCell(spec)); break;
    case 'matrix2d': g.add(buildMatrixCell(spec, 1.0)); break;
    case 'seq3d': g.add(buildSeq3DCube(spec)); break;
    case 'cube3d': g.add(buildBlock(spec, 1.0)); break;
    default: break;
  }
}

const STATUS_COLOR = { preview: HEX.blue, correct: HEX.green, wrong: HEX.red };

/**
 * Muestra una opción en el hueco del "?" de la escena principal para ver la
 * continuidad. `spec` null restaura el "?". `status`: preview | correct | wrong.
 */
export function setPreview(view, spec, status = 'preview') {
  if (!view || !view.slot) return;
  if (view.previewObj) {
    view.group.remove(view.previewObj);
    disposeObject(view.previewObj);
    view.previewObj = null;
  }
  if (!spec) {
    view.slot.ghost.visible = true;
    return;
  }
  view.slot.ghost.visible = false;
  const obj = view.slot.build(spec);
  obj.position.copy(view.slot.position);
  const frame = view.slot.frame(STATUS_COLOR[status] || HEX.blue);
  obj.add(frame);
  view.group.add(obj);
  view.previewObj = obj;
}

// ---------------------------------------------------------------------------
// Portada: figuras 3D flotantes
// ---------------------------------------------------------------------------

function ringShape(outer, inner, sides) {
  const shape = new THREE.Shape();
  for (let i = 0; i < sides; i++) {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / sides;
    const x = outer * Math.cos(a);
    const y = outer * Math.sin(a);
    if (i === 0) shape.moveTo(x, y); else shape.lineTo(x, y);
  }
  shape.closePath();
  const hole = new THREE.Path();
  for (let i = 0; i < sides; i++) {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / sides;
    const x = inner * Math.cos(a);
    const y = inner * Math.sin(a);
    if (i === 0) hole.moveTo(x, y); else hole.lineTo(x, y);
  }
  hole.closePath();
  shape.holes.push(hole);
  return shape;
}

function starShape(r) {
  const shape = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 === 0 ? r : r * 0.45;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const x = rad * Math.cos(a);
    const y = rad * Math.sin(a);
    if (i === 0) shape.moveTo(x, y); else shape.lineTo(x, y);
  }
  shape.closePath();
  return shape;
}

function plusShape(r, w) {
  const shape = new THREE.Shape();
  shape.moveTo(-w, r); shape.lineTo(w, r); shape.lineTo(w, w); shape.lineTo(r, w); shape.lineTo(r, -w);
  shape.lineTo(w, -w); shape.lineTo(w, -r); shape.lineTo(-w, -r); shape.lineTo(-w, -w); shape.lineTo(-r, -w);
  shape.lineTo(-r, w); shape.lineTo(-w, w); shape.closePath();
  return shape;
}

function arrowShape(len, w) {
  const shape = new THREE.Shape();
  shape.moveTo(0, len / 2);
  shape.lineTo(w, len / 2 - w * 1.1);
  shape.lineTo(w * 0.42, len / 2 - w * 1.1);
  shape.lineTo(w * 0.42, -len / 2);
  shape.lineTo(-w * 0.42, -len / 2);
  shape.lineTo(-w * 0.42, len / 2 - w * 1.1);
  shape.lineTo(-w, len / 2 - w * 1.1);
  shape.closePath();
  return shape;
}

function extruded(shape, depth, colorHex) {
  const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: depth * 0.12, bevelSize: depth * 0.12, bevelSegments: 2 });
  geo.center();
  return new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.42, metalness: 0.12 }));
}

/**
 * Disposición de la portada en fracciones de pantalla (fx, fy ∈ 0..1) y tamaño
 * relativo a la altura visible, para que nunca tape el texto ni la tarjeta.
 */
const HERO_LAYOUT = {
  wide: [
    ['hex', 0.555, 0.13, 0.11, 0.25], ['star', 0.79, 0.065, 0.065, 0.35], ['tri', 0.935, 0.15, 0.07, -0.3],
    ['torus', 0.83, 0.885, 0.06, 0.6], ['plus', 0.40, 0.92, 0.058, 0.2], ['arrow', 0.60, 0.885, 0.08, -2.35],
  ],
  portrait: [
    ['hex', 0.86, 0.06, 0.06, 0.25], ['star', 0.12, 0.035, 0.04, 0.35], ['tri', 0.92, 0.36, 0.04, -0.3],
    ['torus', 0.08, 0.50, 0.035, 0.6], ['plus', 0.90, 0.56, 0.035, 0.2], ['arrow', 0.10, 0.30, 0.045, -2.35],
  ],
};

export function heroPreset() {
  return { fit: { w: 10, h: 5.6 }, angle: { az: 0, el: 0 }, sway: 0, padding: 1.0 };
}

/** Escena decorativa de la portada: figuras que flotan y se inclinan lentamente. */
export function buildHeroScene(view, portrait = false) {
  const layout = HERO_LAYOUT[portrait ? 'portrait' : 'wide'];
  const makers = {
    hex: () => extruded(ringShape(1, 0.5, 6), 0.42, HEX.blue),
    star: () => extruded(starShape(1), 0.5, HEX.blue),
    tri: () => extruded(ringShape(1, 0.48, 3), 0.45, HEX.blueDeep),
    torus: () => new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.28, 20, 48), new THREE.MeshStandardMaterial({ color: HEX.blueDeep, roughness: 0.4, metalness: 0.15 })),
    plus: () => extruded(plusShape(1, 0.34), 0.5, HEX.orange),
    arrow: () => extruded(arrowShape(2.1, 0.75), 0.42, HEX.orange),
  };
  const items = layout.map(([kind, fx, fy, fsize, tiltZ], i) => {
    const mesh = makers[kind]();
    mesh.rotation.z = tiltZ;
    view.group.add(mesh);
    return { mesh, fx, fy, fsize, baseX: -0.25 + (i % 3) * 0.2, baseY: -0.35 + (i % 2) * 0.5, phase: i * 1.3 };
  });
  view.animations.push((t) => {
    const fov = deg(view.camera.fov);
    const d = view.baseDistance * view.zoomFactor;
    const visH = 2 * d * Math.tan(fov / 2);
    const visW = visH * view.camera.aspect;
    for (const it of items) {
      it.mesh.position.x = (it.fx - 0.5) * visW + Math.cos(t * 0.5 + it.phase) * visH * 0.008;
      it.mesh.position.y = (0.5 - it.fy) * visH + Math.sin(t * 0.7 + it.phase) * visH * 0.014;
      it.mesh.scale.setScalar(it.fsize * visH);
      it.mesh.rotation.x = it.baseX + Math.sin(t * 0.6 + it.phase) * 0.28;
      it.mesh.rotation.y = it.baseY + Math.cos(t * 0.45 + it.phase) * 0.38;
    }
  });
}

// ---------------------------------------------------------------------------
// Instantáneas fuera de pantalla
// ---------------------------------------------------------------------------

let snapRenderer = null;

/** Devuelve una imagen PNG (data URL) de una opción. */
export function snapshotOption(exercise, spec, size = 512) {
  if (!snapRenderer) {
    snapRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    snapRenderer.setPixelRatio(1);
    snapRenderer.setClearColor(0x000000, 0);
    snapRenderer.outputColorSpace = THREE.SRGBColorSpace;
  }
  snapRenderer.setSize(size, size, false);
  const fakeEl = {
    getBoundingClientRect: () => ({ width: size, height: size, left: 0, top: 0, right: size, bottom: size }),
    getClientRects: () => [1],
  };
  const preset = viewPreset(exercise.kind, 'option');
  const view = new View(null, fakeEl, { ...preset, sway: 0 });
  buildOptionScene(view, exercise, spec);
  view.update(0);
  snapRenderer.render(view.scene, view.camera);
  const url = snapRenderer.domElement.toDataURL('image/png');
  view.dispose();
  return url;
}

export function webglAvailable() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch (e) {
    return false;
  }
}
