// 今日廣場：市政廳風格的主樓＋鐘塔，前方是有噴泉、待辦公佈欄、行事曆看板的廣場。
// 座標單位 = 世界單位；佔 3×3 格街區，正面朝 +z。
import { B, box, cyl, sph, cone, prismTri } from './geo.js';
import { lamp } from './props.js';
import { TorusGeometry, Shape, ExtrudeGeometry } from 'three';

const WALL = 0xf6eddc, TRIM = 0xe6d6b8, ROOF = 0x3f9f8a, ROOF2 = 0x2f8573, GOLD = 0xffb347, GLASS = 0x8fc1d9, WOOD = 0x9a6a45, STONE = 0xe9e0d0;

function window3(b, x, y, w, h) {
  b.add(box(w + 0.07, h + 0.07, 0.04, 0.01, 1), 0xffffff, { x, y, z: 0 });
  b.add(box(w, h, 0.05, 0, 1), GLASS, { x, y, z: 0.012 });
  b.add(box(0.02, h, 0.06, 0, 1), 0xffffff, { x, y, z: 0.02 });
  b.add(box(w, 0.02, 0.06, 0, 1), 0xffffff, { x, y, z: 0.02 });
  b.add(box(w + 0.1, 0.04, 0.09, 0.01, 1), TRIM, { x, y: y - h / 2 - 0.05, z: 0.03 });
}

function clockFace(b) {
  b.add(cyl(0.27, 0.27, 0.04, 24), 0xffffff, { rx: Math.PI / 2, z: 0.02 });
  b.add(new TorusGeometry(0.27, 0.035, 8, 24), GOLD, { z: 0.04 });
  b.add(box(0.025, 0.17, 0.02, 0, 1), 0x2a3340, { y: 0.07, z: 0.06 });
  b.add(box(0.025, 0.11, 0.02, 0, 1), 0x2a3340, { x: 0.04, y: 0.0, z: 0.065, rz: -1.2 });
  for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2; b.add(box(0.02, 0.04, 0.02, 0, 1), 0x2a3340, { x: Math.sin(a) * 0.21, y: Math.cos(a) * 0.21, z: 0.045 }); }
}

function stall(b, x, z, ry, c1, c2) {
  b.with({ x, z, ry }, () => {
    b.add(box(0.7, 0.5, 0.45, 0.02, 1), 0xfff3dc, { y: 0.25 });
    b.add(box(0.7, 0.14, 0.02, 0, 1), WOOD, { y: 0.38, z: 0.235 });
    for (let k = 0; k < 7; k++) b.add(box(0.1, 0.03, 0.55, 0, 1), k % 2 ? c2 : c1, { x: -0.3 + k * 0.1, y: 0.66 - 0.0, z: 0.1, rx: 0.28 });
    for (const sx of [-1, 1]) b.add(box(0.03, 0.5, 0.03, 0, 1), WOOD, { x: sx * 0.32, y: 0.25, z: 0.33 });
  });
}

function board(b, x, z, ry, notes) {
  b.with({ x, z, ry }, () => {
    for (const sx of [-1, 1]) b.add(box(0.04, 0.75, 0.04, 0, 1), WOOD, { x: sx * 0.3, y: 0.375 });
    b.add(box(0.7, 0.5, 0.04, 0.01, 1), 0xf7f1e6, { y: 0.72 });
    b.add(box(0.74, 0.04, 0.05, 0, 1), WOOD, { y: 0.98 });
    notes.forEach(([nx, ny, c], i) => b.add(box(0.12, 0.12, 0.02, 0, 1), c, { x: nx, y: 0.72 + ny, z: 0.03, rz: (i % 3 - 1) * 0.08 }));
  });
}

// 環形階梯（後半圓），中心在原點，高度 h，內外半徑 r0~r1
function ringSector(r0, r1, h) {
  const sh = new Shape(); sh.absarc(0, 0, r1, 0, Math.PI, false); sh.lineTo(-r0, 0); sh.absarc(0, 0, r0, Math.PI, 0, true); sh.closePath();
  const g = new ExtrudeGeometry(sh, { depth: h, bevelEnabled: false, curveSegments: 28 }); g.rotateX(-Math.PI / 2); return g;
}

export function makePlaza() {
  const b = new B();
  b.add(box(3.0, 0.1, 3.0, 0.02, 1), STONE, { y: 0.05 });
  const SZ = 0.7; // 舞台圓心 z
  // 舞台：木地板＋太陽放射線
  b.add(cyl(0.62, 0.66, 0.1, 40), 0xc99a68, { y: 0.15, z: SZ });
  b.add(cyl(0.5, 0.5, 0.02, 40), 0xdcb27d, { y: 0.21, z: SZ });
  for (let k = 0; k < 12; k++) { const a = k * Math.PI / 6; b.add(box(0.035, 0.015, 0.5, 0, 1), 0xf3d9a8, { x: Math.sin(a) * 0.25, y: 0.225, z: SZ + Math.cos(a) * 0.25, ry: a }); }
  b.add(cyl(0.1, 0.1, 0.03, 20), GOLD, { y: 0.235, z: SZ });
  // 階梯 4 層，往外越高
  for (let k = 0; k < 4; k++) {
    const r0 = 0.68 + k * 0.17, r1 = r0 + 0.17, h = 0.16 + k * 0.14;
    b.add(ringSector(r0, r1, h), k % 2 ? 0xf2e6cf : 0xe6d4b2, { y: 0.1, z: SZ });
    b.add(ringSector(r0 + 0.01, r1 - 0.01, 0.025), 0xfff6e4, { y: 0.1 + h, z: SZ });
  }
  // 階梯上的座位標記（小色塊）
  for (let k = 0; k < 14; k++) { const a = Math.PI * (0.08 + 0.84 * k / 13), r = 0.93 + (k % 2) * 0.17, h = 0.1 + (r > 1 ? 0.30 : 0.16) + 0.03;
    b.add(box(0.07, 0.03, 0.07, 0, 1), [0xff9fb0, 0xffd76b, 0x9ed0ff, 0xb8e6a0][k % 4], { x: Math.cos(a) * r, y: h + 0.02, z: SZ - Math.sin(a) * r }); }

  // 鐘塔（在階梯後方）
  const TZ = -1.0, DY = 1.2;
  b.add(box(1.25, 0.18, 1.0, 0.03, 1), TRIM, { y: 0.2, z: TZ });
  b.add(box(1.1, 0.5, 0.88, 0.03, 1), 0xe9dcc2, { y: 0.52, z: TZ });
  b.add(box(0.9, 2.5 + DY, 0.72, 0.03, 1), WALL, { y: 1.95 + DY / 2, z: TZ, g: [0.92, 1] });
  for (const x of [-0.46, 0.46]) b.add(box(0.06, 2.5 + DY, 0.78, 0.01, 1), TRIM, { x, y: 1.95 + DY / 2, z: TZ });
  b.add(box(1.02, 0.1, 0.84, 0.02, 1), TRIM, { y: 3.25 + DY, z: TZ });
  // 入口拱門
  b.add(box(0.42, 0.62, 0.05, 0.02, 1), WOOD, { y: 0.88, z: TZ + 0.385 });
  b.add(cyl(0.21, 0.21, 0.05, 16), WOOD, { y: 1.19, z: TZ + 0.385, rx: Math.PI / 2 });
  b.add(box(0.56, 0.06, 0.1, 0.01, 1), TRIM, { y: 1.55, z: TZ + 0.4 });
  // 鐘面（四面）
  for (let k = 0; k < 4; k++) b.with({ y: 2.7 + DY, z: TZ, ry: k * Math.PI / 2 }, () => b.with({ z: 0.37 }, () => { b.add(cyl(0.34, 0.34, 0.05, 28), 0xffffff, { rx: Math.PI / 2, z: 0.0 }); b.add(new TorusGeometry(0.34, 0.045, 8, 28), GOLD, { z: 0.03 }); b.add(box(0.03, 0.22, 0.02, 0, 1), 0x2a3340, { y: 0.09, z: 0.05 }); b.add(box(0.03, 0.15, 0.02, 0, 1), 0x2a3340, { x: 0.06, y: 0.0, z: 0.055, rz: -1.15 }); for (let q = 0; q < 12; q++) { const a = q * Math.PI / 6; b.add(box(0.02, q % 3 ? 0.03 : 0.06, 0.02, 0, 1), 0x2a3340, { x: Math.sin(a) * 0.27, y: Math.cos(a) * 0.27, z: 0.04, rz: -a }); } }));
  for (const y of [1.65, 2.1 + DY * 0.45]) b.add(box(0.14, 0.26, 0.04, 0.01, 1), GLASS, { y, z: TZ + 0.37 });
  // 鐘樓（四柱開放，內有金鐘）
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.add(box(0.1, 0.62, 0.1, 0.01, 1), 0xfffaf0, { x: sx * 0.38, y: 3.61 + DY, z: TZ + sz * 0.3 });
  b.add(cyl(0.12, 0.18, 0.24, 14), GOLD, { y: 3.65 + DY, z: TZ });
  b.add(box(1.0, 0.07, 0.82, 0.01, 1), TRIM, { y: 3.95 + DY, z: TZ });
  b.add(cone(0.78, 1.0, 4), ROOF, { y: 4.5 + DY, z: TZ, ry: Math.PI / 4 });
  b.add(cyl(0.018, 0.018, 0.6, 6), 0x8a8f99, { y: 5.3 + DY, z: TZ });
  b.add(sph(0.06, 8, 6), GOLD, { y: 5.02 + DY, z: TZ });
  b.add(box(0.38, 0.22, 0.02, 0, 1), 0xd9694a, { x: 0.2, y: 5.45 + DY, z: TZ });
  // 兩側弧形花廊（柱＋橫樑＋藤）
  for (const sx of [-1, 1]) {
    for (let k = 0; k < 3; k++) b.add(cyl(0.035, 0.04, 0.8, 8), 0xfffaf0, { x: sx * (1.05 + k * 0.17), y: 0.5, z: TZ + 0.45 + k * 0.27 });
    b.add(box(0.12, 0.05, 0.62, 0.01, 1), WOOD, { x: sx * 1.22, y: 0.92, z: TZ + 0.72, ry: sx * -0.35 });
    for (let k = 0; k < 3; k++) b.add(sph(0.1, 8, 6), 0x6fc07a, { x: sx * (1.05 + k * 0.17), y: 0.93, z: TZ + 0.45 + k * 0.27 });
  }
  // 公佈欄（今日待辦）、行事曆看板
  board(b, -1.18, 1.0, 0.45, [[-0.2, 0.12, 0xffd76b], [0.0, 0.12, 0xff9fb0], [0.2, 0.12, 0x9ed0ff], [-0.15, -0.1, 0xb8e6a0], [0.1, -0.1, 0xffd76b], [0.25, -0.1, 0xff9fb0]]);
  b.with({ x: 1.2, z: 1.0, ry: -0.5 }, () => {
    for (const sx of [-1, 1]) b.add(box(0.04, 0.8, 0.04, 0, 1), WOOD, { x: sx * 0.36, y: 0.4 });
    b.add(box(0.8, 0.62, 0.04, 0.01, 1), 0xffffff, { y: 0.8 });
    b.add(box(0.8, 0.13, 0.05, 0, 1), 0xd9694a, { y: 1.03 });
    for (let r = 0; r < 4; r++) for (let c = 0; c < 7; c++) b.add(box(0.07, 0.07, 0.02, 0, 1), (r * 7 + c) % 9 === 3 ? 0xffb347 : (r * 7 + c) % 11 === 5 ? 0x7fc4e8 : 0xe2e6ea, { x: -0.27 + c * 0.09, y: 0.9 - r * 0.1, z: 0.03 });
  });
  stall(b, -0.9, 1.3, 0.25, 0xd9694a, 0xffffff);
  stall(b, 0.9, 1.3, -0.25, 0x5f8fa8, 0xffffff);
  for (const [x, z] of [[-1.4, -1.4], [1.4, -1.4], [-1.4, 1.45], [1.4, 1.45], [0, 1.45]]) lamp(b, x, z);
  for (const x of [-1.3, 1.3]) { b.add(box(0.34, 0.18, 0.34, 0.03, 1), 0xd9b48a, { x, y: 0.19, z: 0.45 }); b.add(sph(0.24, 10, 8), 0x6fc07a, { x, y: 0.5, z: 0.45 }); }
  return { geo: b.build(), top: 5.9 + DY, smoke: [] };
}
