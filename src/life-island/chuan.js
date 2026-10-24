// 川泱購物（樣態 A）：橘色圓角購物中心，大拱門入口，屋頂立購物袋招牌。建設中（有工地圍欄與小吊車）。正面朝 +z，佔 3×3 格。
import { B, box, cyl, sph } from './geo.js';
import { lamp } from './props.js';
import { addSite } from './construction.js';

const ORG = 0xff9a4d, ORG2 = 0xffb878, TRIM = 0xfff6e6, DARK = 0x2c3345;

export function makeChuan() {
  const b = new B();
  b.add(box(3.0, 0.1, 3.0, 0.02, 1), 0xe9e0d0, { y: 0.05 });
  const CZ = -0.35;
  b.add(box(2.4, 0.12, 1.8, 0.02, 1), 0xe6dccb, { y: 0.16, z: CZ });
  b.add(box(2.2, 0.9, 1.6, 0.12, 2), ORG, { y: 0.67, z: CZ });
  b.add(box(2.0, 0.5, 1.4, 0.1, 2), ORG2, { y: 1.35, z: CZ });
  b.add(box(2.26, 0.06, 1.66, 0.02, 1), TRIM, { y: 1.15, z: CZ }); b.add(box(2.06, 0.06, 1.46, 0.02, 1), TRIM, { y: 1.62, z: CZ });
  // 大拱門入口
  b.add(box(0.8, 0.62, 0.08, 0.02, 1), TRIM, { y: 0.5, z: CZ + 0.82 }); b.add(cyl(0.4, 0.4, 0.08, 20), TRIM, { y: 0.81, z: CZ + 0.82, rx: Math.PI / 2 });
  b.add(box(0.6, 0.6, 0.06, 0.01, 1), 0xd6f1fb, { y: 0.49, z: CZ + 0.86, glow: 0.35 }); b.add(cyl(0.3, 0.3, 0.06, 20), 0xd6f1fb, { y: 0.79, z: CZ + 0.86, rx: Math.PI / 2, glow: 0.35 });
  b.add(box(0.03, 0.6, 0.07, 0, 1), TRIM, { y: 0.49, z: CZ + 0.87 });
  for (let k = 0; k < 3; k++) b.add(box(1.0 - k * 0.0, 0.05, 0.2, 0.01, 1), 0xf0e6d2, { y: 0.14 + k * 0.04, z: CZ + 1.0 + (2 - k) * 0.12 });
  // 左右櫥窗（一排小窗，不同色）
  for (const sx of [-1, 1]) for (let k = 0; k < 2; k++) { const x = sx * (0.7 + k * 0.28); b.add(box(0.22, 0.42, 0.04, 0.01, 1), 0xa9dcf0, { x, y: 0.55, z: CZ + 0.82, glow: 0.2 }); b.add(box(0.26, 0.06, 0.08, 0.01, 1), [0xe2564f, 0x4a90e2, 0x5ec38a, 0xffd34d][(k + (sx > 0 ? 2 : 0))], { x, y: 0.82, z: CZ + 0.84 }); }
  // 二樓窗帶
  for (let k = 0; k < 6; k++) b.add(box(0.22, 0.26, 0.04, 0.01, 1), 0xffe3a3, { x: -0.8 + k * 0.32, y: 1.35, z: CZ + 0.72, glow: 0.4 });
  // 屋頂購物袋招牌＋旗
  b.add(box(0.5, 0.5, 0.2, 0.04, 2), 0xe2564f, { x: 0, y: 2.05, z: CZ }); b.add(box(0.5, 0.05, 0.2, 0.02, 1), 0xb83e38, { y: 1.82, z: CZ });
  for (const sx of [-1, 1]) b.add(cyl(0.012, 0.012, 0.24, 4), 0xffffff, { x: sx * 0.1, y: 2.4, z: CZ, rz: sx * 0.3 });
  b.add(sph(0.05, 6, 5), 0xffffff, { x: 0, y: 2.1, z: CZ + 0.11, glow: 0.5 });
  b.add(box(0.28, 0.05, 0.02, 0, 1), 0xffffff, { y: 2.2, z: CZ + 0.11, glow: 0.5 });
  // 入口旁：購物車、花台
  for (const [x, z, ry] of [[-0.95, 1.1, 0.3], [-0.75, 1.2, 0.1]]) b.with({ x, z, ry }, () => { b.add(box(0.2, 0.1, 0.14, 0.01, 1), 0xaab0bd, { y: 0.28 }); b.add(box(0.2, 0.02, 0.14, 0, 1), DARK, { y: 0.2 }); b.add(box(0.03, 0.18, 0.14, 0, 1), 0xaab0bd, { x: -0.1, y: 0.35 }); });
  b.add(box(0.3, 0.18, 0.3, 0.03, 1), 0xd9b48a, { x: 0.95, y: 0.19, z: 1.15 }); b.add(sph(0.18, 8, 6), 0x6fc07a, { x: 0.95, y: 0.4, z: 1.15 });
  addSite(b);
  for (const [x, z] of [[-1.45, 1.0], [1.45, -1.45]]) lamp(b, x, z);
  return { geo: b.build(), top: 2.6, smoke: [] };
}
