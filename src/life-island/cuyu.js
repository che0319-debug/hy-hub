// 川嶼甜點店（樣態 C）：法式甜點坊。奶油色牆、條紋遮陽篷、櫥窗擺蛋糕與塔，門口小圓桌。建設中（有工地圍欄與小吊車）。正面朝 +z，佔 3×3 格。
import { B, box, cyl, sph, prismTri } from './geo.js';
import { lamp } from './props.js';
import { addSite } from './construction.js';

const CREAM = 0xfdf0d5, PINK = 0xf7b8c8, MINT = 0x9fe0cc, TRIM = 0xfffaf0, ROOF = 0x7fb8c8;

export function makeCuyu() {
  const b = new B();
  b.add(box(3.0, 0.1, 3.0, 0.02, 1), 0xe9e0d0, { y: 0.05 });
  const CZ = -0.4;
  b.add(box(2.0, 0.12, 1.5, 0.02, 1), 0xece3d2, { y: 0.16, z: CZ });
  b.add(box(1.8, 0.75, 1.3, 0.03, 1), CREAM, { y: 0.6, z: CZ });
  b.add(box(1.86, 0.06, 1.36, 0.01, 1), PINK, { y: 0.98, z: CZ });
  // 斜面屋頂（法式 mansard 風）＋小老虎窗
  b.add(box(1.9, 0.06, 1.4, 0.02, 1), ROOF, { y: 1.04, z: CZ }); b.add(prismTri(1.4, 0.42, 1.9), ROOF, { y: 1.06, z: CZ });
  for (const x of [-0.5, 0.5]) { b.add(box(0.26, 0.2, 0.2, 0.02, 1), CREAM, { x, y: 1.2, z: CZ + 0.3 }); b.add(prismTri(0.26, 0.12, 0.22), PINK, { x, y: 1.3, z: CZ + 0.3 }); b.add(box(0.14, 0.12, 0.02, 0, 1), 0xffe3a3, { x, y: 1.2, z: CZ + 0.41, glow: 0.45 }); }
  // 大櫥窗＋門
  b.add(box(1.0, 0.48, 0.04, 0, 1), 0xd6f1fb, { x: -0.35, y: 0.55, z: CZ + 0.66, glow: 0.25 });
  b.add(box(0.36, 0.55, 0.05, 0.01, 1), 0xf7b8c8, { x: 0.55, y: 0.58, z: CZ + 0.66 }); b.add(box(0.26, 0.4, 0.02, 0, 1), 0xd6f1fb, { x: 0.55, y: 0.6, z: CZ + 0.69, glow: 0.3 });
  for (const sx of [-0.85, -0.35, 0.15]) b.add(box(0.03, 0.48, 0.06, 0, 1), TRIM, { x: sx + 0.0, y: 0.55, z: CZ + 0.67 });
  // 櫥窗內蛋糕與塔
  for (let k = 0; k < 3; k++) { const x = -0.65 + k * 0.3; b.add(cyl(0.1, 0.1, 0.07, 14), TRIM, { x, y: 0.4, z: CZ + 0.55 }); b.add(cyl(0.085, 0.085, 0.08, 14), [PINK, MINT, 0xffe08a][k], { x, y: 0.46, z: CZ + 0.55 }); b.add(sph(0.025, 6, 5), 0xe2564f, { x, y: 0.53, z: CZ + 0.55 }); }
  // 條紋遮陽篷
  for (let k = 0; k < 9; k++) b.add(box(0.22, 0.03, 0.55, 0, 1), k % 2 ? TRIM : PINK, { x: -0.88 + k * 0.22, y: 0.88, z: CZ + 0.96, rx: -0.28 });
  for (let k = 0; k < 9; k++) b.add(sph(0.045, 6, 5), k % 2 ? PINK : TRIM, { x: -0.88 + k * 0.22, y: 0.73, z: CZ + 1.2 });
  // 招牌
  b.add(box(1.0, 0.16, 0.05, 0.02, 1), 0xfff6e6, { y: 1.0, z: CZ + 0.7 }); b.add(box(0.6, 0.05, 0.03, 0, 1), PINK, { y: 1.0, z: CZ + 0.74, glow: 0.3 });
  // 門口小圓桌、椅子、盆花
  for (const x of [-0.8, -0.2]) { b.add(cyl(0.16, 0.16, 0.03, 14), TRIM, { x, y: 0.4, z: 1.1 }); b.add(cyl(0.02, 0.03, 0.22, 6), 0x2c3345, { x, y: 0.28, z: 1.1 }); for (const sz of [-1, 1]) b.add(cyl(0.07, 0.07, 0.03, 10), MINT, { x: x + sz * 0.24, y: 0.3, z: 1.1 }); b.add(cyl(0.05, 0.05, 0.04, 8), PINK, { x, y: 0.44, z: 1.1 }); }
  b.add(box(0.2, 0.16, 0.2, 0.02, 1), 0xd9b48a, { x: 0.95, y: 0.2, z: 1.1 }); b.add(sph(0.14, 8, 6), 0xff9fbd, { x: 0.95, y: 0.4, z: 1.1 });
  addSite(b);
  for (const [x, z] of [[-1.4, -1.0], [1.4, -1.45]]) lamp(b, x, z);
  return { geo: b.build(), top: 1.9, smoke: [] };
}
