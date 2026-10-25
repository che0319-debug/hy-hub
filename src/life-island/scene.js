import {
  WebGLRenderer, Scene, Color, PerspectiveCamera, Vector3, Vector2, Raycaster, Fog, HemisphereLight, DirectionalLight, Group, Mesh,
  MathUtils, ExtrudeGeometry, Shape, IcosahedronGeometry, CylinderGeometry, RingGeometry, MeshBasicMaterial,
  MeshLambertMaterial, CanvasTexture, SRGBColorSpace, TorusGeometry, NoToneMapping, PCFShadowMap,
  BufferGeometry, Float32BufferAttribute, SphereGeometry
} from 'three';
import { B, box, cyl, sph, cone, rng, prismTri } from './geo.js';
import { toon, outline, U } from './mats.js';
import { makeBuilding } from './buildings.js';
import { treeGeos, instanced, fence, lamp } from './props.js';
import { makeBot, animateBot, STATUS_COLORS } from './bots.js';
import { makePlaza } from './plaza.js';
import { makeDispatch } from './dispatch.js';
import { makeMeeting } from './meeting.js';
import { makeSysCenter } from './syscenter.js';
import { makeHQ } from './hq.js';
import { makeLab } from './lab.js';
import { makeBrain } from './brain.js';
import { makeDojo } from './dojo.js';
import { makeBoard } from './board.js';
import { makeHome } from './home.js';
import { makeGym } from './gym.js';
import { makeSideHQ } from './sidehq.js';
import { makePhoneShop } from './phoneshop.js';
import { makeCuyu } from './cuyu.js';
import { makeChuan } from './chuan.js';
import { makeDistTexture, makeWater } from './water.js';
import { createAtmosphere } from './sky.js';
import { buildBridges, makeBoats } from './bridges.js';
import { ISLANDS_DATA, FIGURES, STATUS_INFO } from './data.js';

export function webglOk() {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}

// container: 放 canvas 的 div；labelLayer: 放名牌的 div（絕對定位覆蓋在上面）
// opts: { onSelect(id|null), onReady() }
export function createIslandScene(container, labelLayer, opts = {}) {
const CFG = { az: 0.62 };
const S3 = Math.sqrt(3), WATER_Y = -0.5;

// ---------- world definition ----------
const KEYPOS = { today: [0, 0], dispatch: [1, -1], meeting: [2, 1], syscenter: [-1, 0], hq: [0, 0], lab: [1, 0], brain: [0, 0], dojo: [1, 0], board: [0, 1], home: [0, 0], gym: [1, 0], sidehq: [-1, -1], phone: [1, -1], cuyu: [-1, 1], chuan: [1, 1] };
const ISL_CFG = { central: { cityR: 13, seed: 3, col: '#d9a441' }, biz: { cityR: 8, seed: 4, col: '#5a8fe0' }, life: { cityR: 8, seed: 6, col: '#b06ad8' }, family: { cityR: 8, seed: 8, col: '#e8845a' }, side: { cityR: 10, seed: 9, col: '#2fa58a' } };
const ISLANDS = ISLANDS_DATA.map(d => ({ id: d.id, name: d.name, sub: d.sub, c: d.c, ...ISL_CFG[d.id],
  bs: d.buildings.map(b => ({ id: b.id, title: b.title, type: b.type, form: b.form, height: b.height * 1.15 })),
  keys: d.buildings.map(b => ({ id: b.id, bi: KEYPOS[b.id][0], bj: KEYPOS[b.id][1], park: false })) }));
const BESPOKE = ['plaza', 'dispatch', 'meeting', 'syscenter', 'hq', 'lab', 'brain', 'dojo', 'sandtable', 'home', 'gym', 'sidehq', 'phoneshop', 'cuyu', 'chuan'];
const DECO = [
  { id: 'd1', deco: true, allPark: true, seed: 5, c: [10, 33], cityR: 3, bs: [{ id: 'd1b', title: '', type: 'system', form: 'lighthouse', height: 2.4 }], keys: [{ id: 'd1b', bi: 0, bj: 0, park: true }] },
  { id: 'd2', deco: true, allPark: true, seed: 7, c: [-3, -27], cityR: 3, bs: [{ id: 'd2b', title: '', type: 'business', form: 'tent', height: 1.5 }], keys: [{ id: 'd2b', bi: 0, bj: 0, park: true }] },
];
ISLANDS.push(...DECO);
const BRIDGES = [];
const FIGS = FIGURES;
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

// ---------- build islands (city blocks) ----------
const TG = treeGeos(), RN = rng(11);
const land = new B(), props = new B(), allTiles = [];
const lists = { round: [], pine: [], cherry: [], bush: [], berry: [], flower: [], tuft: [], rock: [] };
const flowerTints = [0xff8fa8, 0xffd35c, 0xffffff, 0xb79cf0, 0xff9f6b];
const place = (k, x, z, s = 1) => lists[k].push({ x, y: 0, z, s, ry: RN() * 6.28 });
const bldList = [], labelPts = []; const pickMeshes = [];

const PAVE = new Color(0xf5efe4), PAVE2 = new Color(0xece4d5), ROAD = new Color(0xc3c7cc), PARK = new Color(0xb9d98f);
const WALL = [0xf3e6d3, 0xeedfcb, 0xf6d9c4, 0xe8e4dc, 0xd9e6ea, 0xf0cfa8, 0xe2d4c0, 0xf8efe0, 0xdfe7ee];
const ROOF = [0xd9694a, 0xc4573b, 0x5f8fa8, 0x4f9a96, 0xe0a84a, 0x8d7a9e, 0xb5483a, 0x6f8c6a];
const cellGeo = box(1.0, 0.16, 1.0, 0.025, 1), soilA = box(0.98, 0.34, 0.98, 0.03, 1), soilB = box(0.96, 0.34, 0.96, 0.03, 1), soilC = box(0.9, 0.3, 0.9, 0.03, 1);
const isRoadAt = (i, j) => ((i + 2) % 4 + 4) % 4 === 0 || ((j + 2) % 4 + 4) % 4 === 0;

// 一座城市島：街區 3×3 格、馬路 1 格；外形用雜訊做成不規則海岸
function cityIsland(isl) {
  const [cx, cz] = isl.c, cells = new Map(), key = (i, j) => i + ',' + j;
  const Rr = isl.cityR, seed = isl.seed || 3;
  for (let i = -Rr - 1; i <= Rr + 1; i++) for (let j = -Rr - 1; j <= Rr + 1; j++) {
    const nx = Math.hypot(i / Rr, j / Rr), n = vnoise(i * 0.28 + seed, j * 0.28 + seed * 2), edge = 1.02 - 0.34 * n - 0.14 * vnoise(i * 0.7 + seed * 3, j * 0.7);
    const sq = Math.pow(Math.pow(Math.abs(i) / Rr, 2.4) + Math.pow(Math.abs(j) / Rr, 2.4), 1 / 2.4);
    if (sq <= edge) cells.set(key(i, j), { i, j });
  }
  const has = (i, j) => cells.has(key(i, j));
  const inner1 = new Set(), inner2 = new Set();
  for (const c of cells.values()) if (has(c.i + 1, c.j) && has(c.i - 1, c.j) && has(c.i, c.j + 1) && has(c.i, c.j - 1)) inner1.add(key(c.i, c.j));
  for (const k of inner1) { const [i, j] = k.split(',').map(Number); if (inner1.has(key(i + 1, j)) && inner1.has(key(i - 1, j)) && inner1.has(key(i, j + 1)) && inner1.has(key(i, j - 1))) inner2.add(k); }
  const blockOf = (i, j) => [Math.round(i / 4), Math.round(j / 4)];
  const keyBlocks = new Map((isl.keys || []).map(k => [k.bi + ',' + k.bj, k]));
  for (const c of cells.values()) {
    const x = cx + c.i, z = cz + c.j, road = isRoadAt(c.i, c.j), [bi, bj] = blockOf(c.i, c.j), kb = keyBlocks.get(bi + ',' + bj);
    const park = !road && (isl.allPark || (kb && kb.park) || (vnoise(bi * 1.7 + seed, bj * 1.3) > 0.62 && !kb));
    const top = road ? ROAD : park ? PARK : ((c.i + c.j) % 2 ? PAVE : PAVE2);
    allTiles.push({ x, z, sq: true });
    land.add(cellGeo, 0xffffff, { x, z, y: -0.08, fn: () => top.clone().multiplyScalar(0.97 + 0.05 * vnoise(x * 1.7, z * 1.7)) });
    land.add(soilA, 0xd9ab7c, { x, z, y: -0.33, g: [0.9, 1.03] });
    if (inner1.has(key(c.i, c.j))) land.add(soilB, 0xc0916a, { x, z, y: -0.67, g: [0.9, 1.02] });
    if (inner2.has(key(c.i, c.j))) land.add(soilC, 0xa97a5c, { x, z, y: -0.99, g: [0.85, 1] });
    // 馬路標線
    if (road && !isl.allPark) {
      const alongX = ((c.j + 2) % 4 + 4) % 4 === 0 && ((c.i + 2) % 4 + 4) % 4 !== 0, alongZ = ((c.i + 2) % 4 + 4) % 4 === 0 && ((c.j + 2) % 4 + 4) % 4 !== 0;
      if (alongX) land.add(box(0.5, 0.02, 0.07, 0, 1), 0xffffff, { x, z, y: 0.012 });
      if (alongZ) land.add(box(0.07, 0.02, 0.5, 0, 1), 0xffffff, { x, z, y: 0.012 });
      const crossX = ((c.i + 2) % 4 + 4) % 4 === 1 || ((c.i + 2) % 4 + 4) % 4 === 3, crossZ = ((c.j + 2) % 4 + 4) % 4 === 1 || ((c.j + 2) % 4 + 4) % 4 === 3;
      if (alongZ && crossZ && RN() > 0.5) for (let k = -2; k <= 2; k++) land.add(box(0.1, 0.02, 0.34, 0, 1), 0xffffff, { x: x + k * 0.17, z, y: 0.012 });
      if (alongX && crossX && RN() > 0.5) for (let k = -2; k <= 2; k++) land.add(box(0.34, 0.02, 0.1, 0, 1), 0xffffff, { x, z: z + k * 0.17, y: 0.012 });
    }
  }
  // 街區內容
  const seen = new Set();
  for (const c of cells.values()) {
    const [bi, bj] = blockOf(c.i, c.j), bk = bi + ',' + bj; if (seen.has(bk)) continue; seen.add(bk);
    const bx = cx + bi * 4, bz = cz + bj * 4;
    let cnt = 0; for (let a = -1; a <= 1; a++) for (let b2 = -1; b2 <= 1; b2++) if (has(bi * 4 + a, bj * 4 + b2)) cnt++;
    const kb = keyBlocks.get(bk);
    if (cnt < 4 && !kb) continue;
    if (kb) { kb.wx = bx; kb.wz = bz; }
    if (isl.allPark || (kb && kb.park) || (!kb && vnoise(bi * 1.7 + seed, bj * 1.3) > 0.62)) {
      for (let k = 0; k < 6; k++) place(RN() > 0.6 ? 'cherry' : 'round', bx + (RN() - 0.5) * 2.4, bz + (RN() - 0.5) * 2.4, 0.8 + RN() * 0.4);
      for (let k = 0; k < 5; k++) place('bush', bx + (RN() - 0.5) * 2.6, bz + (RN() - 0.5) * 2.6, 0.9);
      for (let k = 0; k < 8; k++) place('flower', bx + (RN() - 0.5) * 2.6, bz + (RN() - 0.5) * 2.6, 1);
      continue;
    }
    if (kb) continue; // 主建築街區：周邊留給主建築與少量小樓
    // 非主建築街區：只做少量低矮小房子與造景，主建築周圍留空給人偶
    const r0 = vnoise(bi * 2.3 + seed * 5, bj * 1.9);
    const nb = r0 > 0.86 ? 2 : r0 > 0.68 ? 1 : 0;
    const spots = [[-0.7, -0.7], [0.7, 0.7], [0.7, -0.7], [-0.7, 0.7]];
    for (let q = 0; q < nb; q++) {
      const [sx, sz] = spots[(q + ((bi + bj + 8) % 4)) % 4]; if (!has(bi * 4 + Math.round(sx * 1.4), bj * 4 + Math.round(sz * 1.4))) continue;
      const w = 0.62 + RN() * 0.2, d = 0.62 + RN() * 0.2, h = 0.45 + RN() * 0.7, x = bx + sx, z = bz + sz, wc = WALL[(RN() * WALL.length) | 0], rc = ROOF[(RN() * ROOF.length) | 0];
      props.add(box(w, h, d, 0.04, 1), wc, { x, y: h / 2, z, g: [0.92, 1] });
      if (h > 0.8) props.add(box(w + 0.02, 0.09, d + 0.02, 0, 1), 0x9ec6d8, { x, y: h * 0.55, z });
      if (RN() > 0.4) props.add(prismTri(d + 0.08, 0.24, w + 0.08), rc, { x, y: h, z }); else props.add(box(w + 0.06, 0.07, d + 0.06, 0.02, 1), rc, { x, y: h + 0.035, z });
    }
    // 造景：樹、花、長椅
    for (let k = 0; k < 3; k++) place(RN() > 0.6 ? 'cherry' : 'round', bx + (RN() - 0.5) * 2.4, bz + (RN() - 0.5) * 2.4, 0.6 + RN() * 0.3);
    for (let k = 0; k < 4; k++) place('flower', bx + (RN() - 0.5) * 2.4, bz + (RN() - 0.5) * 2.4, 1);
    if (RN() > 0.5) { const bxp = bx + (RN() - 0.5) * 1.6, bzp = bz + 1.15; props.add(box(0.5, 0.06, 0.16, 0.02, 1), 0xb98a5a, { x: bxp, y: 0.12, z: bzp }); props.add(box(0.5, 0.14, 0.04, 0.01, 1), 0xb98a5a, { x: bxp, y: 0.2, z: bzp + 0.08 }); }
  }
  // 路燈、行道樹、停放的車
  for (const c of cells.values()) {
    if (!isRoadAt(c.i, c.j)) continue;
    const x = cx + c.i, z = cz + c.j;
    if (!isl.allPark && ((c.i + c.j) % 5 === 0)) lamp(props, x + 0.38, z + 0.38);
    if (!isl.allPark && RN() > 0.93) { const cc = [0xd9694a, 0xf0c36a, 0x5f8fa8, 0xf4f1ea][(RN() * 4) | 0], alongX = ((c.j + 2) % 4 + 4) % 4 === 0; props.add(box(alongX ? 0.5 : 0.28, 0.2, alongX ? 0.28 : 0.5, 0.05, 1), cc, { x, y: 0.12, z }); props.add(box(alongX ? 0.26 : 0.24, 0.12, alongX ? 0.24 : 0.26, 0.04, 1), 0xdff0f6, { x, y: 0.28, z }); }
  }
  for (const c of cells.values()) if (!isRoadAt(c.i, c.j) && ((c.i * 7 + c.j * 3) % 11 === 0) && !isl.allPark) place('round', cx + c.i + 0.35, cz + c.j + 0.35, 0.5);
  isl.cells = cells;
  if (!isl.deco) labelPts.push({ kind: 'island', id: isl.id, name: isl.name, sub: isl.sub, col: isl.col, x: cx, y: 0.2, z: cz + Rr + 1.6, ax: cx, az: cz });
  if (isl.turbine) props.with({ x: cx, z: cz, ry: CFG.az + 0.2 }, () => {
    for (const ox of [-0.8, 0.9]) {
      const H = 3.0 + (ox > 0 ? 0 : 0.5);
      props.add(cyl(0.06, 0.1, H, 8), 0xf4f1ea, { x: ox, y: H / 2 });
      props.add(sph(0.1, 8, 6), 0xffffff, { x: ox, y: H + 0.02, z: 0.06 });
      for (let k = 0; k < 3; k++) { const a = k * 2.094 + ox; props.add(box(0.08, 1.3, 0.02, 0, 1), 0xffffff, { x: ox - Math.sin(a) * 0.65, y: H + Math.cos(a) * 0.65, z: 0.1, rz: a }); }
    }
  });
}

function scaffold() {
  const b = new B();
  b.add(box(1.3, 0.08, 1.3, 0.03), 0xe9dfd2, { y: 0.04 });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.add(box(0.06, 1.25, 0.06, 0.02, 1), 0xd2b07a, { x: sx * 0.55, y: 0.7, z: sz * 0.55 });
  b.add(box(0.55, 0.42, 0.55, 0.05), 0xfff1d8, { y: 0.3 });
  return { geo: b.build(), top: 1.5, smoke: [] };
}

const CAMAZ = CFG.az;
let bi2 = 0;
for (const isl of ISLANDS) {
  cityIsland(isl);
  for (const bd of isl.bs) {
    const kb = (isl.keys || []).find(k => k.id === bd.id); if (!kb || kb.wx === undefined) continue;
    const made = bd.form === 'scaffold' ? scaffold() : bd.form === 'plaza' ? makePlaza() : bd.form === 'dispatch' ? makeDispatch() : bd.form === 'meeting' ? makeMeeting() : bd.form === 'syscenter' ? makeSysCenter() : bd.form === 'hq' ? makeHQ() : bd.form === 'lab' ? makeLab() : bd.form === 'brain' ? makeBrain() : bd.form === 'dojo' ? makeDojo() : bd.form === 'sandtable' ? makeBoard() : bd.form === 'home' ? makeHome() : bd.form === 'gym' ? makeGym() : bd.form === 'sidehq' ? makeSideHQ() : bd.form === 'phoneshop' ? makePhoneShop() : bd.form === 'cuyu' ? makeCuyu() : bd.form === 'chuan' ? makeChuan() : makeBuilding(bd, bi2++ + 3), SC = BESPOKE.includes(bd.form) ? (bd.form === 'sidehq' ? 1.3 : 1) : bd.form === 'tent' ? 2.3 : 3.2;
    const g = new Group(), m = new Mesh(made.geo, matToon); m.castShadow = m.receiveShadow = true; g.add(m); m.userData.bid = bd.id; pickMeshes.push(m);
    g.position.set(kb.wx, 0, kb.wz); g.rotation.y = CAMAZ + (BESPOKE.includes(bd.form) ? 0 : 0.2 * (bi2 % 3 - 1)); g.scale.setScalar(SC);
    scene.add(g); bldList.push({ bd, isl, x: kb.wx, z: kb.wz, top: made.top * SC, sc: SC });
    // 周圍的人行道小物
    if (!BESPOKE.includes(bd.form)) for (let k = 0; k < 4; k++) place('round', kb.wx + (k % 2 ? 1.7 : -1.7), kb.wz + (k < 2 ? 1.7 : -1.7), 0.55);
    labelPts.push({ kind: 'bldg', id: bd.id, name: bd.title, type: bd.type, flag: !!bd.flag, island: isl.id, x: kb.wx, y: made.top * SC + 0.2, z: kb.wz, deco: !!isl.deco });
  }
}
const islById = Object.fromEntries(ISLANDS.map(i => [i.id, i]));

const BRG = buildBridges(props, ISLANDS, isRoadAt);
const landMesh = new Mesh(land.build(), matToon); landMesh.receiveShadow = true; landMesh.castShadow = true; scene.add(landMesh);
const propsMesh = new Mesh(props.build(), matToon); propsMesh.castShadow = true; propsMesh.receiveShadow = true; scene.add(propsMesh);
const tint = [0xffffff, 0xf4fff0, 0xfffbe8, 0xeaffea];
for (const k of ['round', 'pine', 'cherry', 'bush', 'berry', 'rock', 'tuft']) if (lists[k].length) scene.add(instanced(TG[k], matToon, lists[k], k === 'rock' ? [0xffffff, 0xf2eee8] : tint));
{ const fl = instanced(TG.flower, matToon, lists.flower, flowerTints); fl.castShadow = false; scene.add(fl); }

// figures
const FS = 1.7, bots = [];
// 小人走動：沿著馬路格子慢慢逛，活動範圍以各自的建築區為中心；待你確認／異常的停在原地
const roads = {};
for (const isl of ISLANDS) if (!isl.deco && isl.cells) {
  const cells = [...isl.cells.values()].filter(c => isRoadAt(c.i, c.j)).map(c => ({ i: c.i + isl.c[0], j: c.j + isl.c[1] }));
  roads[isl.id] = { cells, set: new Set(cells.map(c => c.i + ',' + c.j)) };
}
const nbrsOf = (id, i, j) => [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([a, b]) => roads[id].set.has((i + a) + ',' + (j + b))).map(([a, b]) => [i + a, j + b]);
const nearestRoad = (id, x, z) => roads[id].cells.reduce((best, c) => { const d = Math.hypot(c.i - x, c.j - z); return !best || d < best.d ? { c, d } : best; }, null).c;
{
  const ca = Math.cos(CAMAZ), sa = Math.sin(CAMAZ);
  FIGS.forEach((f, i) => {
    const zb = bldList.find(b => b.bd.id === f.zone), stay = f.status === 'you' || f.status === 'bad';
    // 起點：建築前方（朝鏡頭那側）最近的馬路格；停在原地的人各自錯開
    const front = { x: zb.x + (1.9 + (i % 2) * 0.7) * sa + (i - 2) * 0.5 * ca, z: zb.z + (1.9 + (i % 2) * 0.7) * ca - (i - 2) * 0.5 * sa };
    const c0 = nearestRoad(f.island, front.x, front.z);
    const bot = makeBot(f.kind, matToon, matOL, f.status);
    bot.root.position.set(c0.i, 0.02, c0.j); bot.root.rotation.y = CAMAZ; bot.root.scale.setScalar(FS);
    bot.mesh.userData.bid = 'bot:' + f.id; pickMeshes.push(bot.mesh);
    scene.add(bot.root);
    const lp = { kind: 'bot', id: f.id, name: f.name, status: f.status, idx: i, x: c0.i, y: 0.02 + 0.82 * FS, z: c0.j };
    labelPts.push(lp);
    bots.push({ bot, f, lp, isl: f.island, phase: i * 1.3, pos: [c0.i, c0.j], ci: c0.i, cj: c0.j, from: [c0.i, c0.j], to: null, t: 0, wait: 0.5 + i * 0.6, moving: false, stay, wantStay: stay, wantStay: stay,
      zone: { x: zb.x, z: zb.z, r: 7 }, homeIsl: f.island, homeZone: { x: zb.x, z: zb.z, r: 7 }, legs: [], bridge: null, away: false, nextTrip: 25 + i * 9 + Math.random() * 25, prev: null, rot: CAMAZ, ox: (i % 3 - 1) * 0.16, oz: ((i + 1) % 3 - 1) * 0.16, hello: false });
  });
}
// ---- 過橋：外島隊員偶爾去別的島逛逛，再走回自己的島 ----
function bfsPath(id, from, to) {
  const set = roads[id].set, goal = to[0] + ',' + to[1], q = [[from[0], from[1]]], prev = new Map([[from[0] + ',' + from[1], null]]);
  while (q.length) {
    const [i, j] = q.shift(), k = i + ',' + j;
    if (k === goal) { const path = []; let c = k; while (prev.get(c)) { const [a, b2] = c.split(',').map(Number); path.unshift([a, b2]); c = prev.get(c); } return path; }
    for (const [a, c2] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nk = (i + a) + ',' + (j + c2); if (set.has(nk) && !prev.has(nk)) { prev.set(nk, k); q.push([i + a, j + c2]); } }
  }
  return null;
}
const brOf = id => BRG.find(x => x.id === id);
function planTrip(b, dest) {
  const legs = [];
  if (b.isl !== 'central') { const br = brOf(b.isl); if (!br) return; legs.push({ cell: br.qCell, br, dir: 'in' }); }
  if (dest !== 'central') { const br = brOf(dest); if (!br) return; legs.push({ cell: br.pCell, br, dir: 'out' }); }
  b.legs = legs; if (TRIPDBG) console.warn('[plan]', b.f.id, b.isl, '->', dest, legs.length);
}
const islCenterZone = id => { const bb = bldList.find(x => x.isl.id === id); return bb ? { x: bb.x, z: bb.z, r: 7 } : null; };

const TRIPDBG = (() => { try { return !!new URLSearchParams((location.hash.split('?')[1]) || '').get('trip'); } catch { return false; } })();
try { if (TRIPDBG) bots.forEach(b => { if (!b.stay) b.nextTrip = 1 + Math.random() * 3; }); } catch {}
function updateBots(dt, now) {
  if (TRIPDBG) dt *= 8;   // 除錯：加速
  const occupied = new Set(bots.flatMap(b => [b.ci + ',' + b.cj, b.to ? b.to[0] + ',' + b.to[1] : null]).filter(Boolean));
  for (const b of bots) {
    b.stay = b.wantStay && !b.away && !b.bridge && !b.legs.length;   // 狀態要停下的人，出門在外時先走回自己的島
    const paused = b.stay || selected === 'bot:' + b.f.id;
    let heading = null, onBridge = 0;
    if (b.bridge) {          // 正在橋上
      if (!paused) b.bridge.t += dt * 0.9 / b.bridge.br.L;
      const br = b.bridge.br, out = b.bridge.dir === 'out', k = Math.min(1, b.bridge.t), u = out ? k : 1 - k;
      b.pos = [br.a[0] + (br.b[0] - br.a[0]) * u, br.a[1] + (br.b[1] - br.a[1]) * u]; onBridge = br.arch(u);
      heading = Math.atan2((out ? 1 : -1) * (br.b[0] - br.a[0]), (out ? 1 : -1) * (br.b[1] - br.a[1])); b.moving = true;
      if (b.bridge.t >= 1) {
        const c = out ? br.qCell : br.pCell; b.isl = out ? br.id : 'central'; b.ci = c[0]; b.cj = c[1]; b.pos = [c[0], c[1]]; b.bridge = null; b.moving = false; b.prev = null; b.wait = 0.4;
        if (!b.legs.length) {
          if (b.isl === b.homeIsl) { b.away = false; b.zone = b.homeZone; b.nextTrip = now + 40 + Math.random() * 80; }
          else { b.zone = islCenterZone(b.isl) || b.zone; b.nextTrip = now + 22 + Math.random() * 25; }
        }
      }
    } else {
      if (!b.moving) {
        b.wait -= dt;
        if (!paused && !b.stay && !b.legs.length && now > b.nextTrip) {
          const others = ISLANDS.filter(x => !x.deco && x.id !== b.isl).map(x => x.id);
          if (!b.away) { b.away = true; planTrip(b, others[(Math.random() * others.length) | 0]); } else planTrip(b, b.homeIsl);
          if (!b.legs.length) b.nextTrip = now + 30;
        }
        if (!paused && b.wait <= 0) {
          let nx = null;
          if (b.legs.length) {
            const leg = b.legs[0], path = bfsPath(b.isl, [b.ci, b.cj], leg.cell);
            if (path && !path.length) { if (TRIPDBG) console.warn('[bridge]', b.f.id, leg.dir, leg.br.id); b.bridge = { br: leg.br, dir: leg.dir, t: 0 }; b.legs.shift(); }
            else if (path && !occupied.has(path[0][0] + ',' + path[0][1])) nx = path[0]; else b.wait = 0.4;
          } else {
            let opts = nbrsOf(b.isl, b.ci, b.cj).filter(([a, c]) => !occupied.has(a + ',' + c));
            if (opts.length) {
              const inZone = opts.filter(([a, c]) => Math.hypot(a - b.zone.x, c - b.zone.z) <= b.zone.r);
              if (inZone.length) opts = inZone; else opts.sort((p, q) => Math.hypot(p[0] - b.zone.x, p[1] - b.zone.z) - Math.hypot(q[0] - b.zone.x, q[1] - b.zone.z)).splice(1);
              const fwd = opts.filter(([a, c]) => !b.prev || a !== b.prev[0] || c !== b.prev[1]);
              const pickFrom = fwd.length ? fwd : opts; nx = pickFrom[(Math.random() * pickFrom.length) | 0];
            } else b.wait = 0.8;
          }
          if (nx) { b.to = nx; b.from = [b.ci, b.cj]; b.t = 0; b.moving = true; occupied.add(nx[0] + ',' + nx[1]); }
        }
      }
      if (b.moving && b.to) {
        b.t += dt * 0.85; const k = Math.min(1, b.t);
        b.pos = [b.from[0] + (b.to[0] - b.from[0]) * k, b.from[1] + (b.to[1] - b.from[1]) * k];
        heading = Math.atan2(b.to[0] - b.from[0], b.to[1] - b.from[1]);
        if (b.t >= 1) { b.prev = b.from; b.ci = b.to[0]; b.cj = b.to[1]; b.to = null; b.moving = false; b.wait = b.legs.length ? 0.05 : (Math.random() < 0.45 ? 0.15 : 1.5 + Math.random() * 3); }
      } else if (!b.moving) b.pos = [b.ci, b.cj];
    }
    const x = b.pos[0] + b.ox, z = b.pos[1] + b.oz;
    b.bot.root.position.set(x, 0.02 + onBridge, z); b.lp.x = x; b.lp.z = z; b.lp.y = 0.02 + onBridge + 0.82 * FS;
    const want = heading !== null ? heading : CAMAZ; let d = ((want - b.rot + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
    b.rot += d * Math.min(1, dt * 10); b.bot.root.rotation.y = b.rot;
    b.hello = selected === 'bot:' + b.f.id;
    animateBot(b.bot, now, b.phase, b.moving, b.hello);
  }
}

// water
const dist = makeDistTexture(allTiles);
const water = makeWater(dist, WATER_Y); scene.add(water);
{ const u = water.material.uniforms;
  u.uShallow.value.set(0xa4ecd8); u.uDeep.value.set(0x6cc6d8); u.uSky.value.set(0xe8f1ee); u.uSunDir.value.copy(sunDir); u.uSunCol.value.set(0xfff1d6).multiplyScalar(0.8); u.uTime.value = 3.2; }
const boats = makeBoats(matToon, matOL, [[-31, 9, 0xe2564f, 2.5, 3.5, 0.05], [6, 31, 0x4a90e2, 3.5, 2.5, -0.06], [31, -17, 0xffb347, 3, 3, 0.05], [-16, -27, 0x2fa58a, 3.5, 2.5, -0.05]]);
scene.add(boats.group);
const atmo = createAtmosphere({ scene, hemi, sun, water, U, onSky: opts.onSky });


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
function placeRing(r, id) { const b = id && bById[id]; if (!b) { r.visible = false; return; } r.visible = true; r.position.set(b.x, 0.05, b.z); r.scale.setScalar(b.sc * 0.95); }
const botById = Object.fromEntries(bots.map(b => [b.f.id, b]));
function botOf(id) { return id && id.startsWith('bot:') ? botById[id.slice(4)] : null; }

// ---------- labels (DOM) ----------
const labels = labelPts.filter(p => p.kind !== 'fig' && !p.deco).map(p => {
  const el = document.createElement('div');
  el.className = 'li-label ' + (p.kind === 'island' ? 'li-label-island' : p.kind === 'bot' ? 'li-label-bot' : 'li-label-bldg');
  if (p.kind === 'bot') { el.dataset.s = p.status; el.title = p.name + '：' + STATUS_INFO[p.status]; const dot = document.createElement('i'); el.appendChild(dot); el.appendChild(document.createTextNode(p.name)); const st = document.createElement('span'); st.textContent = '・' + STATUS_INFO[p.status]; el.appendChild(st); } else
  el.textContent = p.name;
  if (p.kind === 'bot') { el.setAttribute('role', 'button'); el.tabIndex = 0; el.addEventListener('click', () => api.select('bot:' + p.id, true)); el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); api.select('bot:' + p.id, true); } }); }
  if (p.kind === 'bldg') { el.setAttribute('role', 'button'); el.tabIndex = 0; el.addEventListener('click', () => api.select(p.id, true)); el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); api.select(p.id, true); } }); }
  labelLayer.appendChild(el); return { p, el };
});

// ---------- camera ----------
const HOME = { az: 0.62, el: 0.5, dist: 72, tx: 0.5, ty: 2, tz: 2.5 };
// 除錯用：網址加 ?cam=dist,tx,tz,el 可指定起始鏡頭（截圖檢查細節用）
try { const q = new URLSearchParams((location.hash.split('?')[1]) || '').get('cam'); if (q) { const [d, x, z, e] = q.split(',').map(Number); if (d) HOME.dist = d; if (!Number.isNaN(x)) HOME.tx = x; if (!Number.isNaN(z)) HOME.tz = z; if (e) HOME.el = e; } } catch { /* ignore */ }
const view = { ...HOME };
const LIM = { dist: [8, 125], el: [0.28, 1.25] };
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
  if (!p) { const id = pick(e); if (id !== hovered) { hovered = id; placeRing(hovRing, id === selected || botOf(id) ? null : id); el.style.cursor = id ? 'pointer' : 'grab'; } return; }
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
  boats.update((now - t0) / 1000);
  atmo.update(now, Math.min(0.1, (now - (frame.lastA || now)) / 1000), { x: view.tx, z: view.tz }, camera.position); frame.lastA = now;
  const dtb = Math.min(0.1, (now - (frame.lastB || now)) / 1000); frame.lastB = now; updateBots(dtb, (now - t0) / 1000);
  if (selRing.visible) selRing.material.opacity = 0.75 + 0.2 * Math.sin(now / 260);
  renderer.render(scene, camera);
  const showB = view.dist < 100;
  for (const { p, el: de } of labels) {
    if (p.kind === 'bldg' && !showB) { de.style.display = 'none'; continue; }
    tmp.set(p.x, p.y, p.z).project(camera);
    if (tmp.z > 1) { de.style.display = 'none'; continue; }
    const oy = p.kind === 'bot' ? -26 * (view.dist > 45 ? [0, 1, 2, 0, 3][p.idx % 5] : p.idx % 2) : 0;
    if (p.kind === 'bot') de.classList.toggle('is-near', view.dist < 30);
    de.style.display = ''; de.style.transform = `translate(${(tmp.x * 0.5 + 0.5) * W}px, ${(-tmp.y * 0.5 + 0.5) * H + oy}px) translate(-50%, -100%)`;
    if (p.kind === 'bldg') de.classList.toggle('is-sel', p.id === selected);
    if (p.kind === 'bot') de.classList.toggle('is-sel', 'bot:' + p.id === selected);
  }
}
placeCamera(); raf = requestAnimationFrame(frame);
opts.onReady && opts.onReady();

const api = {
  select(id, fromUser) {
    selected = id || null; placeRing(selRing, selected); if (selected) hovRing.visible = false;
    if (botOf(selected)) { selRing.visible = false; const bo = botOf(selected); target.tx = bo.pos[0]; target.tz = bo.pos[1]; target.dist = Math.min(target.dist, 26); }
    if (selected && bById[selected]) { const b = bById[selected], k = b.isl.id === 'central' ? 0.6 : 1; target.tx = b.x * k; target.tz = b.z * k + 1.5; target.dist = Math.min(target.dist, 52); }
    if (fromUser) opts.onSelect && opts.onSelect(selected);
  },
  // 即時更新小人狀態（光環顏色、標籤、是否停在原地）。資料由 React 端的 useWorldData 提供。
  setBotStatus(id, status) {
    const b = botById[id]; if (!b || !STATUS_COLORS[status] || b.bot.status === status) return;
    const col = STATUS_COLORS[status];
    b.bot.status = status; b.bot.ring.material.color.setHex(col); b.bot.dot.material.color.setHex(col);
    b.lp.status = status; b.wantStay = status === 'you' || status === 'bad';
    const l = labels.find(x => x.p === b.lp);
    if (l) { l.el.dataset.s = status; l.el.title = b.lp.name + '：' + STATUS_INFO[status]; const st = l.el.querySelector('span'); if (st) st.textContent = '・' + STATUS_INFO[status]; }
  },
  home() { Object.assign(target, HOME); },
  focus(islandId) { const isl = ISLANDS.find(x => x.id === islandId); if (!isl) return; selected = null; placeRing(selRing, null); target.tx = isl.c[0] + (islandId === 'central' ? 0.5 : 0); target.tz = isl.c[1] + 2.5; target.dist = islandId === 'central' ? 72 : 46; opts.onSelect && opts.onSelect(null); },
  dispose() {
    disposed = true; atmo.dispose(); cancelAnimationFrame(raf); ro.disconnect();
    scene.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => m.dispose()); });
    renderer.dispose(); renderer.domElement.remove(); labels.forEach(l => l.el.remove());
  },
};
return api;
}
