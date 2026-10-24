// 派工坊（Bot Office）：機場塔台＋調度大廳。正面朝 +z，佔 3×3 格。
import { B, box, cyl, sph, cone } from './geo.js';
import { lamp } from './props.js';
import { TorusGeometry } from 'three';

const WALL = 0xf6f1e6, TRIM = 0xdfd5bf, TEAL = 0x3f9f8a, DARK = 0x59606c, GLASS = 0x8fc9e0, ORANGE = 0xf08a3c, ASPH = 0x7b828e;

export function makeDispatch() {
  const b = new B();
  b.add(box(3.0, 0.1, 3.0, 0.02, 1), 0xe9e0d0, { y: 0.05 });
  // 停機坪（前方）：深色鋪面＋黃色虛線＋圓形標記
  b.add(box(2.7, 0.03, 1.2, 0.01, 1), ASPH, { y: 0.115, z: 0.85 });
  for (let k = 0; k < 7; k++) b.add(box(0.22, 0.01, 0.05, 0, 1), 0xffd34d, { x: -1.0 + k * 0.33, y: 0.135, z: 1.3 });
  b.add(new TorusGeometry(0.34, 0.025, 6, 32), 0xffffff, { rx: Math.PI / 2, x: 0.5, y: 0.14, z: 0.8 });
  b.add(box(0.05, 0.01, 0.34, 0, 1), 0xffffff, { x: 0.42, y: 0.14, z: 0.8 });
  b.add(box(0.05, 0.01, 0.34, 0, 1), 0xffffff, { x: 0.58, y: 0.14, z: 0.8 });
  b.add(box(0.2, 0.01, 0.05, 0, 1), 0xffffff, { x: 0.5, y: 0.14, z: 0.8 });
  // 調度大廳
  b.add(box(2.6, 0.12, 1.15, 0.02, 1), TRIM, { y: 0.16, z: -0.35 });
  b.add(box(2.5, 0.78, 1.05, 0.03, 1), WALL, { y: 0.61, z: -0.35 });
  b.add(box(2.7, 0.1, 1.25, 0.02, 1), TEAL, { y: 1.04, z: -0.35 });
  b.add(box(2.4, 0.04, 0.95, 0, 1), 0xeaf3f0, { y: 1.1, z: -0.35 });
  // 前面落地玻璃窗
  for (let k = 0; k < 6; k++) { const x = -1.0 + k * 0.4; if (Math.abs(x - 0.2) < 0.1 && false) continue; b.add(box(0.32, 0.52, 0.04, 0.01, 1), GLASS, { x, y: 0.55, z: 0.19, glow: 0.25 }); b.add(box(0.04, 0.56, 0.05, 0, 1), 0xffffff, { x: x + 0.2, y: 0.55, z: 0.195 }); }
  // 入口雨棚
  b.add(box(0.9, 0.06, 0.45, 0.01, 1), ORANGE, { y: 0.88, z: 0.4 });
  for (const sx of [-1, 1]) b.add(cyl(0.03, 0.03, 0.72, 8), 0xffffff, { x: sx * 0.4, y: 0.5, z: 0.58 });
  // 屋頂設備
  b.add(box(0.5, 0.2, 0.4, 0.02, 1), DARK, { x: 0.8, y: 1.25, z: -0.3 });
  b.add(cyl(0.1, 0.1, 0.12, 12), 0xcfd5de, { x: 0.8, y: 1.42, z: -0.3 });
  // 塔台
  const TX = -0.85, TZ = -0.55;
  b.add(box(0.8, 0.2, 0.8, 0.02, 1), TRIM, { x: TX, y: 0.2, z: TZ });
  b.add(box(0.5, 2.1, 0.5, 0.03, 1), WALL, { x: TX, y: 1.3, z: TZ, g: [0.92, 1] });
  for (const y of [0.9, 1.5]) b.add(box(0.08, 0.2, 0.52, 0.01, 1), GLASS, { x: TX, y, z: TZ });
  b.add(box(0.56, 0.06, 0.56, 0.01, 1), TEAL, { x: TX, y: 2.4, z: TZ });
  b.add(box(1.1, 0.1, 1.1, 0.02, 1), DARK, { x: TX, y: 2.5, z: TZ });
  b.add(box(0.95, 0.5, 0.95, 0.02, 1), GLASS, { x: TX, y: 2.8, z: TZ, glow: 0.45 });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.add(box(0.05, 0.52, 0.05, 0, 1), 0xffffff, { x: TX + sx * 0.475, y: 2.8, z: TZ + sz * 0.475 });
  b.add(box(1.2, 0.08, 1.2, 0.02, 1), TEAL, { x: TX, y: 3.1, z: TZ });
  b.add(cyl(0.025, 0.025, 0.5, 6), 0x8a8f99, { x: TX, y: 3.4, z: TZ });
  b.add(cyl(0.2, 0.0, 0.06, 14), 0xffffff, { x: TX + 0.06, y: 3.55, z: TZ, rz: -0.5 });
  b.add(sph(0.05, 8, 6), 0xff4d4d, { x: TX, y: 3.7, z: TZ, glow: 0.8 });
  // 旗桿＋風向袋
  b.add(cyl(0.015, 0.015, 0.8, 6), 0x8a8f99, { x: 1.35, y: 0.5, z: 0.4 });
  b.add(cone(0.07, 0.34, 8), ORANGE, { x: 1.2, y: 0.82, z: 0.4, rz: Math.PI / 2 });
  // 地勤車輛與貨箱、錐桶
  b.add(box(0.5, 0.2, 0.26, 0.04, 1), 0xffd34d, { x: -0.9, y: 0.25, z: 0.9 });
  b.add(box(0.24, 0.14, 0.24, 0.03, 1), GLASS, { x: -1.0, y: 0.38, z: 0.9 });
  for (const sx of [-1, 1]) b.add(cyl(0.06, 0.06, 0.28, 10), 0x2a3340, { x: -0.9 + sx * 0.17, y: 0.17, z: 0.9, rx: Math.PI / 2 });
  for (let k = 0; k < 3; k++) b.add(box(0.2, 0.2, 0.2, 0.02, 1), [0xd9a066, 0xe6b77c, 0xc98f55][k], { x: 0.15 + k * 0.24, y: 0.25 + (k === 1 ? 0.2 : 0), z: 1.15 });
  for (const x of [0.1, 0.9]) { b.add(cone(0.06, 0.18, 8), ORANGE, { x, y: 0.24, z: 1.35 }); b.add(cyl(0.07, 0.07, 0.02, 8), 0xffffff, { x, y: 0.15, z: 1.35 }); }
  for (const [x, z] of [[-1.4, -1.4], [1.4, -1.4], [-1.4, 1.45], [1.4, 1.45]]) lamp(b, x, z);
  return { geo: b.build(), top: 3.9, smoke: [] };
}
