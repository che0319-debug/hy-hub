import {
  WebGLRenderer, Scene, Color, PerspectiveCamera, Vector3, Vector2, Raycaster, Fog, HemisphereLight, DirectionalLight, Group, Mesh,
  MathUtils, ExtrudeGeometry, Shape, IcosahedronGeometry, CylinderGeometry, RingGeometry, MeshBasicMaterial,
  MeshLambertMaterial, CanvasTexture, SRGBColorSpace, TorusGeometry, NoToneMapping, PCFShadowMap,
  BufferGeometry, Float32BufferAttribute, SphereGeometry
} from 'three';
import { B, box, cyl, sph, cone, rng, prismTri } from './geo.js';
import { toon, outline } from './mats.js';
import { makeBuilding } from './buildings.js';
import { treeGeos, instanced, fence, lamp } from './props.js';
import { makeWalker } from './chars.js';
import { makeDistTexture, makeWater } from './water.js';
import { CENTRAL_ISLAND, FIGURES } from './data.js';

export function webglOk() {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}

// container: 放 canvas 的 div；labelLayer: 放名牌的 div（絕對定位覆蓋在上面）
// opts: { onSelect(id|null), onReady() }
export function createIslandScene(container, labelLayer, opts = {}) {
const CFG = { az: 0.62 };
const S3 = Math.sqrt(3), WATER_Y = -0.5;

// ---------- world definition ----------
const ISLANDS = [{ id: CENTRAL_ISLAND.id, name: CENTRAL_ISLAND.name, sub: CENTRAL_ISLAND.sub, c: CENTRAL_ISLAND.c, R: CENTRAL_ISLAND.R, col: '#d9a441',
  bs: CENTRAL_ISLAND.buildings.map(b => ({ id: b.id, title: b.title, type: b.type, form: b.form, height: b.height, q: b.q, r: b.r })) }];
const DECO = [
  { id: 'd1', deco: true, c: [27, 7], R: 1, col: '#fff', bs: [{ id: 'd1b', title: '', type: 'system', form: 'lighthouse', height: 2.4, q: 0, r: 0 }] },
  { id: 'd2', deco: true, c: [-3, -26], R: 1, col: '#fff', bs: [{ id: 'd2b', title: '', type: 'business', form: 'tent', height: 1.5, q: 0, r: 0 }] },
  { id: 'd3', deco: true, turbine: true, c: [-31, -1], R: 1, col: '#fff', bs: [] },
  { id: 'd4', deco: true, turbine: true, c: [25, -22], R: 1, col: '#fff', bs: [] },
  { id: 'd5', deco: true, c: [-5, 27], R: 1, col: '#fff', bs: [{ id: 'd5b', title: '', type: 'business', form: 'tent', height: 1.5, q: 0, r: 0 }] },
];
ISLANDS.push(...DECO);
const BRIDGES = [];
const FIGS = FIGURES.map(f => ({ ...f, island: 'central' }));
const TRIBE_COL = { grok: 0x3b434f, claude: 0xe0794f, gpt: 0x2a9d8f, hy: 0xff8f7a };
const TYPE_COL = { research: '#5a8fe0', business: '#f27b66', proposal: '#9a82dc', system: '#3fb89f' };

// ---------- renderer ----------
const W0 = container.clientWidth || 800, H0 = container.clientHeight || 520;
const renderer = new WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); renderer.setSize(W0, H0);
renderer.toneMapping = NoToneMapping; renderer.shadowMap.enabled = true; renderer.shadowMap.type = PCFShadowMap;
container.appendChild(renderer.domElement); renderer.domElement.style.display = 'block'; renderer.domElement.style.touchAction = 'none';
const scene = new Scene(); scene.fog = new Fog(0xe9efe3, 110, 300);
const camera = new PerspectiveCamera(26, W0 / H0, 1, 600);
const hemi = new HemisphereLight(0xfff6ea, 0xd9d4f2, 2.0); scene.add(hemi);
const sun = new DirectionalLight(0xfff1d6, 1.25); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -34, right: 34, top: 34, bottom: -34, near: 1, far: 160 });
sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.035; sun.shadow.radius = 5;
const sunDir = new Vector3(-0.4, 0.95, 1.0).normalize(); sun.position.copy(sunDir).multiplyScalar(70); sun.target.position.set(0, 0, 0);
scene.add(sun, sun.target);
{ const c = document.createElement('canvas'); c.width = 4; c.height = 256; const x = c.getContext('2d'), g = x.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, '#8fc9ec'); g.addColorStop(0.5, '#cfe8ee'); g.addColorStop(1, '#f2eadb'); x.fillStyle = g; x.fillRect(0, 0, 4, 256);
  const t = new CanvasTexture(c); t.colorSpace = SRGBColorSpace; scene.background = t; }
const matToon = toon(), matOL = outline(0.011);

// ---------- geometry helpers ----------
function roundedHex(R, cr) {
  const pts = []; for (let k = 0; k < 6; k++) { const a = Math.PI / 2 + k * Math.PI / 3; pts.push([Math.cos(a) * R, Math.sin(a) * R]); }
  const s = new Shape(), t = cr / R;
  for (let k = 0; k < 6; k++) {
    const p0 = pts[(k + 5) % 6], p1 = pts[k], p2 = pts[(k + 1) % 6];
    const a = [p1[0] + (p0[0] - p1[0]) * t, p1[1] + (p0[1] - p1[1]) * t], b = [p1[0] + (p2[0] - p1[0]) * t, p1[1] + (p2[1] - p1[1]) * t];
    if (k === 0) s.moveTo(a[0], a[1]); else s.lineTo(a[0], a[1]);
    s.quadraticCurveTo(p1[0], p1[1], b[0], b[1]);
  }
  s.closePath(); return s;
}
function slab(R, cr, depth, bt, bs, seg = 2, cs = 3) {
  const g = new ExtrudeGeometry(roundedHex(R, cr), { depth, bevelEnabled: true, bevelThickness: bt, bevelSize: bs, bevelSegments: seg, curveSegments: cs, steps: 1 });
  g.rotateX(-Math.PI / 2); g.translate(0, -(depth + bt), 0); return g;
}
function vnoise(x, z) {
  const h = (i, j) => { const s = Math.sin(i * 127.1 + j * 311.7) * 43758.5453; return s - Math.floor(s); };
  const xi = Math.floor(x), zi = Math.floor(z), fx = x - xi, fz = z - zi, u = fx * fx * (3 - 2 * fx), v = fz * fz * (3 - 2 * fz);
  return (h(xi, zi) * (1 - u) + h(xi + 1, zi) * u) * (1 - v) + (h(xi, zi + 1) * (1 - u) + h(xi + 1, zi + 1) * u) * v;
}
const GA = new Color(0xa6de86), GB = new Color(0x7fd3a2), GC = new Color(0xc2e67e), tmpC = new Color();
function grassAt(x, z) {
  const n = vnoise(x * 0.33 + 7, z * 0.33), m = vnoise(x * 0.9, z * 0.9 + 3);
  tmpC.copy(GB).lerp(GA, MathUtils.clamp(n * 1.5 - 0.15, 0, 1)).lerp(GC, MathUtils.clamp(m * 0.7 - 0.25, 0, 0.5)); return tmpC.clone();
}
const CONC = new Color(0xe4ddcf), SAND = new Color(0xf5e0b2), STONE_C = new Color(0xeadfd6), STONE_P = new Color(0xf8f1ea);
const capGeo = slab(0.9, 0.12, 0.08, 0.05, 0.05), paverGeo = slab(0.7, 0.12, 0.012, 0.014, 0.025, 1, 2);
const soil1 = slab(0.88, 0.11, 0.2, 0.03, 0.03, 1, 2), soil2 = slab(0.86, 0.11, 0.2, 0.03, 0.03, 1, 2), soil3 = slab(0.82, 0.11, 0.2, 0.03, 0.03, 1, 2);
function makeRock(s) {
  const g = new IcosahedronGeometry(1, 3); const p = g.attributes.position, n = p.count, col = new Float32Array(n * 3), c = new Color();
  for (let i = 0; i < n; i++) {
    let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const phi = Math.atan2(z, x), hexk = 1 + 0.1 * Math.cos(6 * phi);
    const nz = vnoise(x * 3 + 2, z * 3 + y * 2) * 0.35 + vnoise(x * 7, z * 7 + y * 5) * 0.15, rad = 1 + (nz - 0.25) * 0.5;
    let X = x * 5.35 * s * hexk * rad, Y = y * 2.5 * Math.pow(s, 0.75) * rad - 1.0, Z = z * 5.35 * s * hexk * rad;
    if (Y > -0.62) Y = -0.62 + (Y + 0.62) * 0.02;
    p.setXYZ(i, X, Y, Z);
    const k = MathUtils.clamp((Y + 3.4) / 2.8, 0, 1); c.set(0x8f84a8).lerp(new Color(0xc79a76), k);
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }
  g.setAttribute('color', new (p.constructor)(col, 3)); g.computeVertexNormals(); return g;
}
const axy = (isl, q, r) => [isl.c[0] + S3 * (q + r / 2), isl.c[1] + 1.5 * r];
const ringOf = (q, r) => Math.max(Math.abs(q), Math.abs(r), Math.abs(q + r));

// ---------- build islands ----------
const TG = treeGeos(), RN = rng(11);
const land = new B(), props = new B(), allTiles = [];
const lists = { round: [], pine: [], cherry: [], bush: [], berry: [], flower: [], tuft: [], rock: [] };
const flowerTints = [0xff8fa8, 0xffd35c, 0xffffff, 0xb79cf0, 0xff9f6b];
const place = (k, x, z, s = 1) => lists[k].push({ x, y: 0, z, s, ry: RN() * 6.28 });
const bldList = [], labelPts = []; const pickMeshes = [];

for (const isl of ISLANDS) {
  const tiles = [];
  for (let q = -isl.R; q <= isl.R; q++) for (let r = -isl.R; r <= isl.R; r++) {
    const ring = ringOf(q, r); if (ring > isl.R) continue;
    const [x, z] = axy(isl, q, r); tiles.push({ q, r, x, z, ring, kind: 'grass', isl });
  }
  isl.tiles = tiles; allTiles.push(...tiles);
  const byKey = new Map(tiles.map(t => [t.q + ',' + t.r, t]));
  const bTiles = new Set(isl.bs.map(b => b.q + ',' + b.r));
  for (const t of tiles) {
    if (isl.deco) t.kind = 'park';
    else if (t.ring === 0) t.kind = 'plaza';
    else if (t.ring === 1 && isl.R >= 2) t.kind = 'path';
    else t.kind = (vnoise(t.x * 0.45 + 3, t.z * 0.45) > 0.74 && !bTiles.has(t.q + ',' + t.r)) ? 'park' : 'block';
  }
  for (const t of tiles) {
    let top = null; if (t.kind === 'block') top = CONC; else if (t.ring === 0 && isl.R >= 2) top = STONE_C;
    land.add(capGeo, 0xffffff, { x: t.x, z: t.z, fn: (i, x, y, z) => {
      if (y < -0.05) return (top ? top.clone() : grassAt(x, z)).multiplyScalar(0.88);
      if (top) return top.clone().multiplyScalar(0.97 + 0.04 * vnoise(x * 1.4, z * 1.4));
      return grassAt(x, z);
    } });
    if (t.kind === 'path') land.add(paverGeo, 0xf6e6c0, { x: t.x, z: t.z, y: 0.012, s: [0.8, 1, 0.8] });
    if (t.kind === 'plaza' && isl.R >= 2) land.add(paverGeo, STONE_P, { x: t.x, z: t.z, y: 0.012 });
    if (t.ring === isl.R) {
      land.add(soil1, 0xd9ab7c, { x: t.x, y: -0.16, z: t.z, g: [0.9, 1.04] });
      land.add(soil2, 0xc0916a, { x: t.x, y: -0.36, z: t.z, g: [0.9, 1.02] });
      land.add(soil3, 0xa97a5c, { x: t.x, y: -0.56, z: t.z, g: [0.85, 1] });
    }
  }
  // road strips around ring 1
  if (isl.R >= 2) {
    const r1 = tiles.filter(t => t.ring === 1).sort((a, b) => Math.atan2(a.x - isl.c[0], a.z - isl.c[1]) - Math.atan2(b.x - isl.c[0], b.z - isl.c[1]));
    for (let i = 0; i < r1.length; i++) {
      const a = r1[i], b2 = r1[(i + 1) % r1.length], dx = b2.x - a.x, dz = b2.z - a.z, L = Math.hypot(dx, dz);
      land.add(box(0.5, 0.03, L, 0.014, 1), 0xf6e6c0, { x: (a.x + b2.x) / 2, z: (a.z + b2.z) / 2, y: 0.01, ry: Math.atan2(dx, dz) });
    }
  }
  // rock body
  const s = (isl.R * S3 + 0.15) / 5.35;
  const rk = new Mesh(makeRock(s), toon()); rk.position.set(isl.c[0], 0, isl.c[1]); rk.receiveShadow = true; scene.add(rk);
  const plug = new Mesh(new CylinderGeometry(4.7 * s, 4.7 * s, 0.3, 24), new MeshLambertMaterial({ color: 0x5ea878 })); plug.position.set(isl.c[0], -0.22, isl.c[1]); scene.add(plug);
  // city blocks + sparse greenery
  const [icx, icz] = isl.c;
  const WALL = [0xf3e6d3, 0xeedfcb, 0xf6d9c4, 0xe8e4dc, 0xd9e6ea, 0xf0cfa8, 0xe2d4c0, 0xf8efe0];
  const ROOF = [0xd9694a, 0xc4573b, 0x5f8fa8, 0x4f9a96, 0xe0a84a, 0x8d7a9e, 0xb5483a, 0x6f8c6a];
  for (const t of tiles) {
    if (bTiles.has(t.q + ',' + t.r) || t.kind === 'path' || t.kind === 'plaza') continue;
    const o = Math.hypot(t.x - icx, t.z - icz) || 1, ox = (t.x - icx) / o, oz = (t.z - icz) / o;
    if (t.kind === 'block') {
      const slots = [[-0.34, -0.3], [0.34, -0.3], [-0.34, 0.34], [0.34, 0.34], [0, 0]];
      slots.forEach(([sx, sz], i) => {
        if (i === 4 ? RN() > 0.25 : RN() > 0.72) return;
        const w = 0.42 + RN() * 0.16, d = 0.42 + RN() * 0.14, tall = 1 + (isl.R - t.ring) * 0.1, h = (0.32 + RN() * RN() * 0.85) * tall;
        const x = t.x + sx + (RN() - 0.5) * 0.06, z = t.z + sz + (RN() - 0.5) * 0.06, ry = (RN() - 0.5) * 0.35, wc = WALL[(RN() * WALL.length) | 0], rc = ROOF[(RN() * ROOF.length) | 0];
        props.add(box(w, h, d, 0.03, 1), wc, { x, y: h / 2, z, ry, g: [0.92, 1] });
        if (RN() > 0.45) props.add(prismTri(d + 0.06, 0.16 + RN() * 0.1, w + 0.06), rc, { x, y: h, z, ry });
        else props.add(box(w + 0.05, 0.06, d + 0.05, 0.015, 1), rc, { x, y: h + 0.03, z, ry });
      });
      if (RN() > 0.5) place('round', t.x + ox * 0.55, t.z + oz * 0.55, 0.55 + RN() * 0.25);
    } else {
      for (let i = 0; i < 3; i++) place(RN() > 0.6 ? 'cherry' : 'round', t.x + (RN() - 0.5) * 1.1, t.z + (RN() - 0.5) * 1.1, 0.8 + RN() * 0.4);
      place('bush', t.x + 0.3, t.z - 0.3, 0.9);
      for (let i = 0; i < 4; i++) place('flower', t.x + (RN() - 0.5) * 1.3, t.z + (RN() - 0.5) * 1.3, 1);
    }
  }
  if (isl.turbine) props.with({ x: icx, z: icz, ry: CFG.az + 0.2 }, () => {
    for (const ox of [-0.5, 0.55]) {
      const H = 2.6 + (ox > 0 ? 0 : 0.4);
      props.add(cyl(0.05, 0.09, H, 8), 0xf4f1ea, { x: ox, y: H / 2 });
      props.add(sph(0.09, 8, 6), 0xffffff, { x: ox, y: H + 0.02, z: 0.06 });
      for (let k = 0; k < 3; k++) { const a = k * 2.094 + ox; props.add(box(0.07, 1.1, 0.02, 0, 1), 0xffffff, { x: ox - Math.sin(a) * 0.55, y: H + Math.cos(a) * 0.55, z: 0.1, rz: a }); }
    }
  });
  // lamps on ring 1 path
  if (isl.R >= 2) tiles.filter(t => t.kind === 'path').forEach((t, i) => { if (i % 3 !== 1) return; const o = Math.hypot(t.x - icx, t.z - icz) || 1; lamp(props, t.x + (t.x - icx) / o * 0.62, t.z + (t.z - icz) / o * 0.62); });
  // fountain on central ring-1 tile (-1,1)
  if (isl.id === 'central') {
    const [fx, fz] = axy(isl, -1, 1);
    props.with({ x: fx, z: fz }, () => {
      props.add(cyl(0.64, 0.68, 0.2, 24), 0xe9e0d6, { y: 0.1, g: [0.9, 1.05] });
      props.add(cyl(0.58, 0.58, 0.04, 24), 0xe9e0d6, { y: 0.215 }); props.add(cyl(0.54, 0.54, 0.03, 24), 0x8fe3f0, { y: 0.215 });
      props.add(new TorusGeometry(0.6, 0.05, 8, 28), 0xf6efe6, { rx: Math.PI / 2, y: 0.2 });
      props.add(cyl(0.07, 0.1, 0.38, 12), 0xefe6dc, { y: 0.4 }); props.add(cyl(0.2, 0.1, 0.07, 16), 0xefe6dc, { y: 0.6 });
      props.add(cyl(0.17, 0.17, 0.02, 16), 0x8fe3f0, { y: 0.64 }); props.add(sph(0.06, 10, 8), 0xaaf0f8, { y: 0.68 });
    });
  }
  // label anchor for island
  if (!isl.deco) labelPts.push({ kind: 'island', id: isl.id, name: isl.name, sub: isl.sub, col: isl.col, x: icx, y: 0.2, z: icz + isl.R * 1.5 + 1.4, ax: icx, az: icz });
}

// scaffold geometry
function scaffold() {
  const b = new B();
  b.add(box(1.3, 0.08, 1.3, 0.03), 0xe9dfd2, { y: 0.04 });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.add(box(0.06, 1.25, 0.06, 0.02, 1), 0xd2b07a, { x: sx * 0.55, y: 0.7, z: sz * 0.55 });
  for (const y of [0.45, 0.95]) for (const s of [-1, 1]) { b.add(box(1.16, 0.05, 0.05, 0.015, 1), 0xe4c48e, { y, z: s * 0.55 }); b.add(box(0.05, 0.05, 1.16, 0.015, 1), 0xe4c48e, { y, x: s * 0.55 }); }
  b.add(box(0.55, 0.42, 0.55, 0.05), 0xfff1d8, { y: 0.3 });
  b.add(cyl(0.015, 0.015, 0.5, 6), 0x8a5a3a, { y: 1.5, x: 0.55, z: 0.55 }); b.add(box(0.3, 0.16, 0.012, 0.005, 1), 0xf27b66, { y: 1.68, x: 0.7, z: 0.55 });
  return { geo: b.build(), top: 1.5, smoke: [] };
}
const CAMAZ = CFG.az;
let bi = 0;
for (const isl of ISLANDS) for (const bd of isl.bs) {
  const made = bd.form === 'scaffold' ? scaffold() : makeBuilding(bd, bi++ + 3);
  const [x, z] = axy(isl, bd.q, bd.r);
  const g = new Group(), m = new Mesh(made.geo, matToon); m.castShadow = m.receiveShadow = true; g.add(m); m.userData.bid = bd.id; pickMeshes.push(m);
  g.position.set(x, 0, z); g.rotation.y = CAMAZ + (RN() - 0.5) * 0.5; g.scale.setScalar(bd.form === 'tent' ? 0.95 : 1.15);
  scene.add(g); bldList.push({ bd, isl, x, z, top: made.top * (bd.form === 'tent' ? 0.95 : 1.15) });
  // yard
  for (let i = 0; i < 2; i++) place('flower', x + (RN() - 0.5) * 1.5, z + 0.6 + RN() * 0.3, 1.1);
  labelPts.push({ kind: 'bldg', id: bd.id, name: bd.title, type: bd.type, flag: !!bd.flag, island: isl.id, x, y: made.top * (bd.form === 'tent' ? 0.95 : 1.15) + 0.2, z, deco: !!isl.deco });
}

// bridges
const islById = Object.fromEntries(ISLANDS.map(i => [i.id, i]));
for (const [a, b2] of BRIDGES) {
  const A = islById[a], Bz = islById[b2];
  const dx = Bz.c[0] - A.c[0], dz = Bz.c[1] - A.c[1], D = Math.hypot(dx, dz), ux = dx / D, uz = dz / D;
  const ea = A.R * S3 * 0.98 + 0.55, eb = Bz.R * S3 * 0.98 + 0.55;
  const sx = A.c[0] + ux * ea, sz = A.c[1] + uz * ea, L = D - ea - eb;
  props.with({ x: sx, z: sz, ry: Math.atan2(ux, uz) }, () => {
    const n = Math.round(L / 0.19);
    for (let i = 0; i < n; i++) props.add(box(0.62, 0.05, 0.17, 0.02, 1), i % 2 ? 0xc99a62 : 0xd7ac72, { y: -0.12, z: 0.1 + i * 0.19 });
    for (const s of [-1, 1]) props.add(box(0.05, 0.06, L, 0.02, 1), 0x8a5a3a, { x: s * 0.27, y: -0.18, z: L / 2 + 0.1 });
    const np = Math.max(2, Math.round(L / 2.2));
    for (let i = 0; i <= np; i++) for (const s of [-1, 1]) {
      props.add(cyl(0.045, 0.05, 0.85, 8), 0x7a4d33, { x: s * 0.31, y: -0.46, z: 0.15 + i * (L - 0.1) / np });
      props.add(cyl(0.05, 0.05, 0.03, 8), 0xc99a62, { x: s * 0.31, y: -0.03, z: 0.15 + i * (L - 0.1) / np });
    }
    for (let i = 0; i <= np; i += 2) { lamp(props, 0.31, 0.15 + i * (L - 0.1) / np); }
  });
}

const landMesh = new Mesh(land.build(), matToon); landMesh.receiveShadow = true; landMesh.castShadow = true; scene.add(landMesh);
const propsMesh = new Mesh(props.build(), matToon); propsMesh.castShadow = true; propsMesh.receiveShadow = true; scene.add(propsMesh);
const tint = [0xffffff, 0xf4fff0, 0xfffbe8, 0xeaffea];
for (const k of ['round', 'pine', 'cherry', 'bush', 'berry', 'rock', 'tuft']) if (lists[k].length) scene.add(instanced(TG[k], matToon, lists[k], k === 'rock' ? [0xffffff, 0xf2eee8] : tint));
{ const fl = instanced(TG.flower, matToon, lists.flower, flowerTints); fl.castShadow = false; scene.add(fl); }

// figures
const FS = 1.7;
for (const f of FIGS) {
  const isl = islById[f.island], w = makeWalker(matToon, matOL, TRIBE_COL[f.tribe]);
  const [x, z] = axy(isl, f.q, f.r); w.root.position.set(x + f.dx, 0.02, z + f.dz); w.root.rotation.y = CAMAZ + 0.3; w.root.scale.setScalar(FS);
  if (f.wave) { w.armR.rotation.z = -2.5; }
  scene.add(w.root);
  labelPts.push({ kind: 'fig', id: f.id, name: f.name, tribe: f.tribe, x: x + f.dx, y: 0.75 * FS + 0.25, z: z + f.dz });
}

// water
const dist = makeDistTexture(allTiles);
const water = makeWater(dist, WATER_Y); scene.add(water);
{ const u = water.material.uniforms;
  u.uShallow.value.set(0xa4ecd8); u.uDeep.value.set(0x6cc6d8); u.uSky.value.set(0xe8f1ee); u.uSunDir.value.copy(sunDir); u.uSunCol.value.set(0xfff1d6).multiplyScalar(0.8); u.uTime.value = 3.2; }


// ---------- surroundings: bay ringed by hills ----------
function hAt(x, z) {
  const r = Math.hypot(x, z), th = Math.atan2(z, x);
  const R0 = 41 + 7 * (vnoise(Math.cos(th) * 1.8 + 9, Math.sin(th) * 1.8) - 0.5) + 3 * (vnoise(Math.cos(th) * 5 + 2, Math.sin(th) * 5 + 4) - 0.5), d = r - R0;
  if (d < 0) return Math.max(-1.6, 0.35 * d / 4);
  const nA = vnoise(Math.cos(th) * 1.3 + 20, Math.sin(th) * 1.3), roll = vnoise(x * 0.09 + 5, z * 0.09) * 5 * Math.min(1, d / 18);
  return 0.25 + Math.min(d, 4) * 0.05 + Math.pow(Math.max(0, d - 3) / 70, 1.1) * (70 + 100 * nA) + roll;
}
{
  const NR = 46, NA = 180, R0 = 36, R1 = 190, pos = [], col = [], idx = [];
  const stops = [[0, 0xf1e6c4], [0.3, 0xefe3bf], [0.45, 0xa9c98a], [6, 0x9cc080], [18, 0x8fb47a], [34, 0x8fa983], [60, 0xa9b29a], [100, 0xcfd2c4]].map(([h, c]) => [h, new Color(c)]);
  const cc = new Color();
  for (let i = 0; i <= NR; i++) { const r = R0 + (R1 - R0) * Math.pow(i / NR, 1.35);
    for (let j = 0; j <= NA; j++) { const th = j / NA * Math.PI * 2, x = Math.cos(th) * r, z = Math.sin(th) * r, h = hAt(x, z);
      pos.push(x, h, z);
      let k = 0; while (k < stops.length - 2 && h > stops[k + 1][0]) k++;
      const f = MathUtils.clamp((h - stops[k][0]) / (stops[k + 1][0] - stops[k][0]), 0, 1);
      cc.copy(stops[k][1]).lerp(stops[k + 1][1], f).multiplyScalar(0.94 + 0.1 * vnoise(x * 0.3, z * 0.3)); col.push(cc.r, cc.g, cc.b); } }
  for (let i = 0; i < NR; i++) for (let j = 0; j < NA; j++) { const a = i * (NA + 1) + j, b = a + 1, c = a + NA + 1, d2 = c + 1; idx.push(a, b, c, b, d2, c); }
  const g = new BufferGeometry(); g.setAttribute('position', new Float32BufferAttribute(pos, 3)); g.setAttribute('color', new Float32BufferAttribute(col, 3)); g.setIndex(idx); g.computeVertexNormals();
  const terr = new Mesh(g, new MeshLambertMaterial({ vertexColors: true, flatShading: true })); terr.receiveShadow = false; scene.add(terr);
  // trees + shore houses on the hills
  const R2 = rng(77), hillTrees = [], hb = new B();
  for (let i = 0; i < 800; i++) { const th = R2() * 6.283, rr = 44 + Math.pow(R2(), 0.8) * 70, x = Math.cos(th) * rr, z = Math.sin(th) * rr, h = hAt(x, z);
    if (h < 2.2 || Math.hypot(x - 49.5, z - 71) < 70) continue; hillTrees.push({ x, y: h - 0.1, z, s: 1.0 + R2() * 1.0, ry: R2() * 6.28, k: R2() > 0.35 ? 'pine' : 'round' }); }
  for (const k of ['pine', 'round']) { const l = hillTrees.filter(t => t.k === k); if (l.length) { const m = instanced(TG[k], matToon, l, [0xffffff, 0xeaf6e0, 0xf6ffe8]); m.castShadow = false; m.receiveShadow = false; scene.add(m); } }
  const RW = [0xf3e6d3, 0xf6d9c4, 0xe8e4dc], RR = [0xd9694a, 0xc4573b, 0x5f8fa8];
  for (let i = 0; i < 16; i++) { const th = (0.05 + R2() * 1.5) * 1.0 + 0.0, rr = 44.5 + R2() * 5, x = Math.cos(th) * rr, z = Math.sin(th) * rr, h = hAt(x, z), ry = -th + Math.PI / 2 + (R2() - 0.5) * 0.4;
    hb.with({ x, y: h, z, ry }, () => { const w = 1 + R2() * 0.6; hb.add(box(w, 0.9, 0.9, 0.05, 1), RW[i % 3], { y: 0.45 }); hb.add(prismTri(1.05, 0.55, w + 0.15), RR[i % 3], { y: 0.9 }); }); }
  const hm = new Mesh(hb.build(), matToon); hm.castShadow = true; scene.add(hm);
  // clouds
  const cm = new MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.96 });
  for (let i = 0; i < 14; i++) { const th = R2() * 6.283, rr = 70 + R2() * 90, cg = new Group();
    for (let k = 0; k < 5; k++) { const m = new Mesh(new SphereGeometry(3 + R2() * 3, 10, 8), cm); m.position.set((k - 2) * 4 + R2() * 2, R2() * 2, R2() * 3); m.scale.y = 0.65; cg.add(m); }
    cg.position.set(Math.cos(th) * rr, 52 + R2() * 20, Math.sin(th) * rr); scene.add(cg); }
}


// ---------- selection / hover rings ----------
const ringGeo = new RingGeometry(0.95, 1.12, 48).rotateX(-Math.PI / 2);
const selRing = new Mesh(ringGeo, new MeshBasicMaterial({ color: 0xffe08a, transparent: true, opacity: 0.95, depthWrite: false })); selRing.visible = false; scene.add(selRing);
const hovRing = new Mesh(ringGeo, new MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7, depthWrite: false })); hovRing.visible = false; scene.add(hovRing);
const bById = Object.fromEntries(bldList.map(b => [b.bd.id, b]));
let selected = null, hovered = null;
function placeRing(r, id) { const b = id && bById[id]; if (!b) { r.visible = false; return; } r.visible = true; r.position.set(b.x, 0.05, b.z); r.scale.setScalar(b.bd.form === 'tent' ? 0.9 : 1.15); }

// ---------- labels (DOM) ----------
const labels = labelPts.filter(p => p.kind !== 'fig' && !p.deco).map(p => {
  const el = document.createElement('div');
  el.className = 'li-label ' + (p.kind === 'island' ? 'li-label-island' : 'li-label-bldg');
  el.textContent = p.name;
  if (p.kind === 'bldg') { el.setAttribute('role', 'button'); el.tabIndex = 0; el.addEventListener('click', () => api.select(p.id, true)); el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); api.select(p.id, true); } }); }
  labelLayer.appendChild(el); return { p, el };
});

// ---------- camera ----------
const HOME = { az: 0.62, el: 0.5, dist: 80, tx: 0.5, ty: 2, tz: 2.5 };
const view = { ...HOME };
const LIM = { dist: [20, 125], el: [0.28, 1.25] };
let target = { ...HOME }, W = W0, H = H0;
const tmp = new Vector3();
function placeCamera() {
  const ce = Math.cos(view.el);
  camera.position.set(view.tx + Math.sin(view.az) * ce * view.dist, view.ty + Math.sin(view.el) * view.dist, view.tz + Math.cos(view.az) * ce * view.dist);
  camera.lookAt(view.tx, view.ty, view.tz); camera.updateMatrixWorld();
}
function resize() {
  W = container.clientWidth || W; H = container.clientHeight || H; if (!W || !H) return;
  renderer.setSize(W, H); camera.aspect = W / H;
  camera.fov = W / H < 0.9 ? 38 : 26; camera.updateProjectionMatrix();
}
const ro = new ResizeObserver(resize); ro.observe(container); resize();

// ---------- pointer controls ----------
const el = renderer.domElement, ray = new Raycaster(), ndc = new Vector2();
const ptrs = new Map(); let dragMoved = 0, pinch0 = 0, downAt = null;
function pick(ev) {
  const r = el.getBoundingClientRect(); ndc.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(ndc, camera); const hit = ray.intersectObjects(pickMeshes, false)[0]; return hit ? hit.object.userData.bid : null;
}
el.addEventListener('pointerdown', e => { el.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY }); dragMoved = 0; downAt = { x: e.clientX, y: e.clientY }; if (ptrs.size === 2) { const [a, b2] = [...ptrs.values()]; pinch0 = Math.hypot(a.x - b2.x, a.y - b2.y); } });
el.addEventListener('pointermove', e => {
  const p = ptrs.get(e.pointerId);
  if (!p) { const id = pick(e); if (id !== hovered) { hovered = id; placeRing(hovRing, id === selected ? null : id); el.style.cursor = id ? 'pointer' : 'grab'; } return; }
  const dx = e.clientX - p.x, dy = e.clientY - p.y; dragMoved += Math.abs(dx) + Math.abs(dy); p.x = e.clientX; p.y = e.clientY;
  if (ptrs.size === 2) {
    const [a, b2] = [...ptrs.values()], d = Math.hypot(a.x - b2.x, a.y - b2.y); if (pinch0) { target.dist = MathUtils.clamp(target.dist * pinch0 / d, ...LIM.dist); } pinch0 = d;
  } else if (e.shiftKey || e.buttons === 2) {
    const k = view.dist * 0.0016; target.tx -= (dx * Math.cos(view.az) + dy * Math.sin(view.az)) * k; target.tz -= (-dx * Math.sin(view.az) + dy * Math.cos(view.az)) * k;
  } else { target.az -= dx * 0.006; target.el = MathUtils.clamp(target.el + dy * 0.004, ...LIM.el); }
  target.tx = MathUtils.clamp(target.tx, -30, 30); target.tz = MathUtils.clamp(target.tz, -30, 30);
});
const up = e => { ptrs.delete(e.pointerId); pinch0 = 0; if (downAt && dragMoved < 6 && ptrs.size === 0) { const id = pick(e); api.select(id, true); } downAt = null; };
el.addEventListener('pointerup', up); el.addEventListener('pointercancel', e => { ptrs.delete(e.pointerId); downAt = null; });
el.addEventListener('wheel', e => { e.preventDefault(); target.dist = MathUtils.clamp(target.dist * Math.exp(e.deltaY * 0.0012), ...LIM.dist); }, { passive: false });
el.addEventListener('contextmenu', e => e.preventDefault());
el.addEventListener('pointerleave', () => { hovered = null; hovRing.visible = false; });
el.style.cursor = 'grab';

// ---------- loop ----------
let raf = 0, last = 0, t0 = performance.now(), disposed = false;
function frame(now) {
  raf = requestAnimationFrame(frame);
  if (document.hidden || now - last < 33) return; last = now;
  const k = 0.18;
  for (const key of ['az', 'el', 'dist', 'tx', 'ty', 'tz']) view[key] += (target[key] - view[key]) * k;
  placeCamera();
  water.material.uniforms.uTime.value = 3.2 + (now - t0) / 1000 * 0.6;
  if (selRing.visible) selRing.material.opacity = 0.75 + 0.2 * Math.sin(now / 260);
  renderer.render(scene, camera);
  const showB = view.dist < 100;
  for (const { p, el: de } of labels) {
    if (p.kind === 'bldg' && !showB) { de.style.display = 'none'; continue; }
    tmp.set(p.x, p.y, p.z).project(camera);
    if (tmp.z > 1) { de.style.display = 'none'; continue; }
    de.style.display = ''; de.style.transform = `translate(${(tmp.x * 0.5 + 0.5) * W}px, ${(-tmp.y * 0.5 + 0.5) * H}px) translate(-50%, -100%)`;
    if (p.kind === 'bldg') de.classList.toggle('is-sel', p.id === selected);
  }
}
placeCamera(); raf = requestAnimationFrame(frame);
opts.onReady && opts.onReady();

const api = {
  select(id, fromUser) {
    selected = id || null; placeRing(selRing, selected); if (selected) hovRing.visible = false;
    if (selected && bById[selected]) { const b = bById[selected]; target.tx = b.x * 0.6; target.tz = b.z * 0.6 + 1.5; target.dist = Math.min(target.dist, 52); }
    if (fromUser) opts.onSelect && opts.onSelect(selected);
  },
  home() { Object.assign(target, HOME); },
  dispose() {
    disposed = true; cancelAnimationFrame(raf); ro.disconnect();
    scene.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => m.dispose()); });
    renderer.dispose(); renderer.domElement.remove(); labels.forEach(l => l.el.remove());
  },
};
return api;
}
