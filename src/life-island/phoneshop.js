// 手機店（樣態 B）：街角小店。黃色遮陽棚、櫥窗貼滿配件、門口有維修工作檯與手機充電桿。正面朝 +z，佔 3×3 格。
import { B, box, cyl, sph } from './geo.js';
import { lamp } from './props.js';

const WALL = 0xf4e1b0, WALL2 = 0xe9cf93, TRIM = 0xfff6e6, DARK = 0x2c3345;

export function makePhoneShop() {
  const b = new B();
  b.add(box(3.0, 0.1, 3.0, 0.02, 1), 0xe9e0d0, { y: 0.05 });
  const CZ = -0.45;
  b.add(box(2.1, 0.12, 1.5, 0.02, 1), 0xe0d8c6, { y: 0.16, z: CZ });
  b.add(box(1.9, 0.7, 1.3, 0.03, 1), WALL, { y: 0.57, z: CZ });
  b.add(box(1.9, 0.5, 1.3, 0.03, 1), WALL2, { y: 1.17, z: CZ });
  b.add(box(1.96, 0.05, 1.36, 0.01, 1), TRIM, { y: 0.92, z: CZ }); b.add(box(2.0, 0.07, 1.4, 0.02, 1), DARK, { y: 1.45, z: CZ });
  // 一樓大櫥窗＋門
  b.add(box(1.0, 0.45, 0.04, 0, 1), 0xa9dcf0, { x: -0.4, y: 0.55, z: CZ + 0.66, glow: 0.2 });
  b.add(box(0.4, 0.5, 0.05, 0.01, 1), 0xd6f1fb, { x: 0.55, y: 0.57, z: CZ + 0.66, glow: 0.3 });
  b.add(box(1.04, 0.04, 0.06, 0, 1), DARK, { x: -0.4, y: 0.33, z: CZ + 0.67 }); b.add(box(1.04, 0.04, 0.06, 0, 1), DARK, { x: -0.4, y: 0.78, z: CZ + 0.67 });
  // 櫥窗內：手機與配件
  for (let k = 0; k < 5; k++) { b.add(box(0.1, 0.17, 0.03, 0.01, 1), [0x4a90e2, 0xe2564f, 0x5ec38a, 0xffd34d, 0x8a8f99][k], { x: -0.75 + k * 0.17, y: 0.5, z: CZ + 0.6, glow: 0.2 }); b.add(box(0.12, 0.04, 0.1, 0, 1), TRIM, { x: -0.75 + k * 0.17, y: 0.4, z: CZ + 0.6 }); }
  for (let k = 0; k < 4; k++) b.add(box(0.08, 0.06, 0.02, 0, 1), [0xff7fa5, 0x7fd6bd, 0xffd34d, 0x8fb4ff][k], { x: -0.7 + k * 0.2, y: 0.66, z: CZ + 0.6 });
  // 二樓窗與招牌
  for (const x of [-0.5, 0.5]) { b.add(box(0.5, 0.3, 0.04, 0.01, 1), 0xffe3a3, { x, y: 1.17, z: CZ + 0.66, glow: 0.4 }); b.add(box(0.025, 0.3, 0.05, 0, 1), TRIM, { x, y: 1.17, z: CZ + 0.67 }); }
  b.add(box(1.2, 0.2, 0.06, 0.02, 1), 0x4a90e2, { y: 1.62, z: CZ + 0.5, glow: 0.35 });
  b.add(box(0.16, 0.14, 0.03, 0.02, 1), 0xffffff, { x: -0.4, y: 1.62, z: CZ + 0.54, glow: 0.5 }); b.add(box(0.7, 0.05, 0.03, 0, 1), 0xffffff, { x: 0.1, y: 1.62, z: CZ + 0.54, glow: 0.5 });
  for (const sx of [-1, 1]) b.add(box(0.05, 0.25, 0.05, 0, 1), DARK, { x: sx * 0.55, y: 1.55, z: CZ + 0.45 });
  // 黃白條紋遮陽棚
  for (let k = 0; k < 8; k++) b.add(box(0.27, 0.03, 0.55, 0, 1), k % 2 ? 0xffffff : 0xffc21a, { x: -0.95 + k * 0.27, y: 0.82 - 0.0, z: CZ + 0.97, rx: -0.28 });
  for (const sx of [-1, 1]) b.add(cyl(0.025, 0.025, 0.62, 6), DARK, { x: sx * 0.95, y: 0.45, z: CZ + 1.22 });
  // 門口：維修工作檯、充電桿、手機立牌
  b.add(box(0.7, 0.05, 0.3, 0.01, 1), 0x9a6a45, { x: -0.8, y: 0.34, z: 1.1 }); for (const sx of [-1, 1]) b.add(box(0.04, 0.2, 0.04, 0, 1), 0x9a6a45, { x: -0.8 + sx * 0.3, y: 0.22, z: 1.1 });
  b.add(box(0.12, 0.02, 0.2, 0, 1), 0xaab0bd, { x: -0.95, y: 0.38, z: 1.1 }); b.add(box(0.14, 0.1, 0.03, 0.01, 1), 0x4a90e2, { x: -0.65, y: 0.43, z: 1.1, glow: 0.3 });
  b.add(cyl(0.035, 0.045, 0.6, 8), 0x6c7388, { x: 0.95, y: 0.4, z: 1.15 }); b.add(box(0.2, 0.1, 0.1, 0.02, 1), 0x4ad66d, { x: 0.95, y: 0.74, z: 1.15, glow: 0.6 });
  for (let k = 0; k < 3; k++) b.add(cyl(0.012, 0.012, 0.18, 4), 0x2c3345, { x: 0.87 + k * 0.08, y: 0.5, z: 1.2, rx: 0.9 });
  b.with({ x: 0.15, z: 1.35, ry: 0.2 }, () => { b.add(box(0.3, 0.5, 0.04, 0.02, 1), 0x2c3345, { y: 0.4 }); b.add(box(0.25, 0.42, 0.02, 0, 1), 0x4a90e2, { y: 0.4, z: 0.02, glow: 0.4 }); });
  for (const [x, z] of [[-1.4, -1.45], [1.4, -1.45], [-1.45, 1.45], [1.45, 1.45]]) lamp(b, x, z);
  return { geo: b.build(), top: 1.9, smoke: [] };
}
