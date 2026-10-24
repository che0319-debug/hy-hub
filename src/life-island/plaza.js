// 今日廣場：市政廳風格的主樓＋鐘塔，前方是有噴泉、待辦公佈欄、行事曆看板的廣場。
// 座標單位 = 世界單位；佔 3×3 格街區，正面朝 +z。
import { B, box, cyl, sph, cone, prismTri } from './geo.js';
import { lamp } from './props.js';
import { TorusGeometry } from 'three';

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

export function makePlaza() {
  const b = new B();
  // 基座與廣場鋪面
  b.add(box(3.0, 0.12, 3.0, 0.02, 1), STONE, { y: 0.06 });
  b.add(cyl(1.15, 1.15, 0.03, 36), 0xf0d9a8, { y: 0.135, z: 0.75 });
  b.add(cyl(0.95, 0.95, 0.035, 36), 0xe9c98f, { y: 0.14, z: 0.75 });
  for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; b.add(box(0.07, 0.04, 1.0, 0, 1), 0xf6ead2, { x: Math.sin(a) * 0.5, y: 0.145, z: 0.75 + Math.cos(a) * 0.5, ry: a }); }

  // 主樓
  b.add(box(2.8, 0.2, 1.3, 0.02, 1), TRIM, { y: 0.22, z: -0.82 });
  b.add(box(2.7, 1.6, 1.15, 0.03, 1), WALL, { y: 1.1, z: -0.85, g: [0.94, 1] });
  b.add(box(2.78, 0.1, 1.23, 0.02, 1), TRIM, { y: 1.95, z: -0.85 });
  for (const x of [-1.05, -0.62, 0.62, 1.05]) { b.with({ x, z: -0.265 }, () => window3(b, 0, 1.3, 0.22, 0.46)); b.with({ x, z: -0.265 }, () => window3(b, 0, 0.62, 0.22, 0.4)); }
  // 入口門廊：柱子＋山牆
  for (const x of [-0.5, -0.17, 0.17, 0.5]) b.add(cyl(0.065, 0.075, 1.2, 12), 0xfffaf0, { x, y: 0.82, z: 0.02 });
  b.add(box(1.4, 0.1, 0.5, 0.02, 1), TRIM, { y: 1.47, z: -0.1 });
  b.add(prismTri(1.45, 0.34, 0.5), 0xefe3cb, { x: 0, y: 1.52, z: -0.1, ry: Math.PI / 2 });
  b.add(box(0.5, 0.78, 0.06, 0.02, 1), WOOD, { y: 0.55, z: -0.26 });
  b.add(box(0.62, 0.06, 0.1, 0.01, 1), TRIM, { y: 0.97, z: -0.25 });
  b.add(box(0.7, 0.22, 0.04, 0.01, 1), ROOF, { y: 1.28, z: 0.0 });
  // 屋頂
  b.add(prismTri(1.45, 0.5, 2.95), ROOF, { y: 2.0, z: -0.85 });
  b.add(box(2.95, 0.05, 1.45, 0, 1), ROOF2, { y: 1.99, z: -0.85 });

  // 鐘塔
  b.add(box(1.0, 1.9, 1.0, 0.03, 1), WALL, { y: 2.9, z: -0.85, g: [0.94, 1] });
  b.add(box(1.1, 0.12, 1.1, 0.02, 1), TRIM, { y: 3.9, z: -0.85 });
  for (let k = 0; k < 4; k++) b.with({ y: 3.15, z: -0.85, ry: k * Math.PI / 2 }, () => b.with({ z: 0.5 }, () => clockFace(b)));
  b.with({ z: -0.85 }, () => window3(b, 0, 2.35, 0.22, 0.4));
  b.add(cone(0.78, 1.15, 4), ROOF, { y: 4.55, z: -0.85, ry: Math.PI / 4 });
  b.add(cyl(0.02, 0.02, 0.7, 6), 0x8a8f99, { y: 5.45, z: -0.85 });
  b.add(sph(0.06, 8, 6), GOLD, { y: 5.15, z: -0.85 });
  b.add(box(0.42, 0.24, 0.02, 0, 1), GOLD, { x: 0.22, y: 5.55, z: -0.85 });

  // 廣場噴泉
  b.with({ z: 0.75 }, () => {
    b.add(cyl(0.55, 0.6, 0.2, 28), 0xf1ebe0, { y: 0.24 });
    b.add(cyl(0.48, 0.48, 0.03, 28), 0x8fe3f0, { y: 0.345 });
    b.add(cyl(0.07, 0.1, 0.45, 12), 0xf1ebe0, { y: 0.55 });
    b.add(cyl(0.22, 0.1, 0.07, 18), 0xf1ebe0, { y: 0.8 });
    b.add(cyl(0.18, 0.18, 0.02, 18), 0x8fe3f0, { y: 0.84 });
    b.add(sph(0.07, 10, 8), 0xaaf0f8, { y: 0.92 });
  });
  // 待辦公佈欄、行事曆、攤位
  board(b, -1.1, 0.3, 0.45, [[-0.2, 0.12, 0xffd76b], [0.0, 0.12, 0xff9fb0], [0.2, 0.12, 0x9ed0ff], [-0.15, -0.1, 0xb8e6a0], [0.1, -0.1, 0xffd76b], [0.25, -0.1, 0xff9fb0]]);
  b.with({ x: 1.15, z: 0.35, ry: -0.5 }, () => {
    for (const sx of [-1, 1]) b.add(box(0.04, 0.8, 0.04, 0, 1), WOOD, { x: sx * 0.36, y: 0.4 });
    b.add(box(0.8, 0.62, 0.04, 0.01, 1), 0xffffff, { y: 0.8 });
    b.add(box(0.8, 0.13, 0.05, 0, 1), 0xd9694a, { y: 1.03 });
    for (let r = 0; r < 4; r++) for (let c = 0; c < 7; c++) b.add(box(0.07, 0.07, 0.02, 0, 1), (r * 7 + c) % 9 === 3 ? 0xffb347 : (r * 7 + c) % 11 === 5 ? 0x7fc4e8 : 0xe2e6ea, { x: -0.27 + c * 0.09, y: 0.9 - r * 0.1, z: 0.03 });
  });
  stall(b, -1.0, 1.15, 0.2, 0xd9694a, 0xffffff);
  stall(b, 1.0, 1.2, -0.2, 0x5f8fa8, 0xffffff);
  // 長椅、路燈、花台
  for (const x of [-0.45, 0.45]) { b.add(box(0.5, 0.05, 0.16, 0.01, 1), WOOD, { x, y: 0.2, z: 1.38 }); b.add(box(0.5, 0.14, 0.03, 0, 1), WOOD, { x, y: 0.3, z: 1.46 }); for (const s of [-1, 1]) b.add(box(0.04, 0.16, 0.14, 0, 1), 0x6f5a73, { x: x + s * 0.22, y: 0.1, z: 1.38 }); }
  for (const [x, z] of [[-1.38, -1.38], [1.38, -1.38], [-1.38, 1.38], [1.38, 1.38]]) lamp(b, x, z);
  for (const x of [-1.3, 1.3]) { b.add(box(0.36, 0.2, 0.36, 0.03, 1), 0xd9b48a, { x, y: 0.22, z: -0.12 }); b.add(sph(0.26, 10, 8), 0x6fc07a, { x, y: 0.55, z: -0.12 }); }
  return { geo: b.build(), top: 5.9, smoke: [] };
}
