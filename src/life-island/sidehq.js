// 副業總部（樣態 A）：玻璃帷幕小辦公樓，退台式三層，頂樓有 LOGO 招牌與停機坪，大廳入口有旋轉門。正面朝 +z，佔 3×3 格。
import { B, box, cyl, sph } from './geo.js';
import { lamp } from './props.js';

const FR = 0x39455c, GL = 0x8fcbe8, GL2 = 0xb4e0f2, CON = 0xe4e6ea;

export function makeSideHQ() {
  const b = new B();
  b.add(box(3.0, 0.1, 3.0, 0.02, 1), 0xe9e0d0, { y: 0.05 });
  const CZ = -0.25;
  b.add(box(2.5, 0.12, 2.0, 0.02, 1), CON, { y: 0.16, z: CZ });
  // 三層退台：下寬上窄
  const tiers = [[2.1, 1.6, 0.8, 0.22], [1.7, 1.3, 0.8, 1.04], [1.3, 1.0, 0.7, 1.86], [1.0, 0.8, 0.7, 2.68]];
  tiers.forEach(([w, d, h, y0], t) => {
    b.add(box(w, h, d, 0.02, 1), GL, { y: y0 + h / 2 + 0.0, z: CZ, g: [0.85, 1.1], glow: 0.1 });
    for (const sz of [-1, 1]) for (let k = 0; k <= 4; k++) b.add(box(0.035, h, 0.04, 0, 1), FR, { x: -w / 2 + k * w / 4, y: y0 + h / 2, z: CZ + sz * d / 2 });
    for (const sx of [-1, 1]) for (let k = 1; k < 3; k++) b.add(box(0.04, h, 0.035, 0, 1), FR, { x: sx * w / 2, y: y0 + h / 2, z: CZ - d / 2 + k * d / 3 });
    for (let k = 0; k <= 2; k++) for (const sz of [-1, 1]) b.add(box(w, 0.03, 0.04, 0, 1), FR, { y: y0 + k * h / 2, z: CZ + sz * d / 2 });
    b.add(box(w + 0.06, 0.06, d + 0.06, 0.01, 1), FR, { y: y0 + h + 0.03, z: CZ });
    // 室內樓層亮燈小方塊
    for (let k = 0; k < 4; k++) b.add(box(w * 0.16, 0.2, 0.02, 0, 1), 0xfff1c4, { x: -w * 0.36 + k * w * 0.24, y: y0 + h * 0.5, z: CZ + d / 2 - 0.02, glow: 0.5 });
  });
  // 屋頂停機坪
  b.add(cyl(0.38, 0.4, 0.06, 24), 0x59607a, { x: -0.3, y: 3.44, z: CZ });
  b.add(box(0.07, 0.015, 0.34, 0, 1), 0xffffff, { x: -0.38, y: 3.48, z: CZ, glow: 0.3 }); b.add(box(0.07, 0.015, 0.34, 0, 1), 0xffffff, { x: -0.22, y: 3.48, z: CZ, glow: 0.3 }); b.add(box(0.2, 0.015, 0.06, 0, 1), 0xffffff, { x: -0.3, y: 3.48, z: CZ, glow: 0.3 });
  // LOGO 招牌（立在屋頂右側）
  b.add(box(0.07, 0.4, 0.07, 0, 1), 0x8a8f99, { x: 0.35, y: 3.57, z: CZ + 0.2 });
  b.add(box(0.5, 0.3, 0.05, 0.02, 1), 0x4a90e2, { x: 0.35, y: 3.82, z: CZ + 0.2, glow: 0.3 });
  b.add(box(0.28, 0.07, 0.03, 0, 1), 0xffffff, { x: 0.35, y: 3.84, z: CZ + 0.23, glow: 0.5 });
  b.add(cyl(0.012, 0.012, 0.35, 6), 0x8a8f99, { x: 0.55, y: 3.67, z: CZ - 0.2 }); b.add(sph(0.025, 6, 5), 0xff4d4d, { x: 0.55, y: 3.86, z: CZ - 0.2, glow: 1 });
  // 大廳入口：雨遮、旋轉門、台階
  b.add(box(0.9, 0.05, 0.5, 0.01, 1), 0xff7a3c, { y: 0.55, z: CZ + 1.15 });
  for (const sx of [-1, 1]) b.add(cyl(0.03, 0.03, 0.35, 6), 0x8a8f99, { x: sx * 0.4, y: 0.37, z: CZ + 1.35 });
  b.add(cyl(0.2, 0.2, 0.4, 16), 0xd6f1fb, { y: 0.4, z: CZ + 0.8, glow: 0.3 });
  b.add(box(0.36, 0.4, 0.02, 0, 1), FR, { y: 0.4, z: CZ + 0.8 }); b.add(box(0.02, 0.4, 0.36, 0, 1), FR, { y: 0.4, z: CZ + 0.8 });
  for (let k = 0; k < 2; k++) b.add(box(1.0, 0.05, 0.2, 0.01, 1), 0xf0e6d2, { y: 0.14 + k * 0.04, z: CZ + 1.15 + (1 - k) * 0.2 });
  // 前庭：花台、旗桿、長椅
  for (const x of [-1.0, 1.0]) { b.add(box(0.5, 0.2, 0.3, 0.03, 1), CON, { x, y: 0.2, z: 1.25 }); b.add(sph(0.17, 8, 6), 0x6fc07a, { x, y: 0.42, z: 1.25 }); }
  b.add(cyl(0.015, 0.015, 0.9, 6), 0x8a8f99, { x: -1.3, y: 0.6, z: 0.95 }); b.add(box(0.26, 0.15, 0.015, 0, 1), 0x4a90e2, { x: -1.17, y: 0.95, z: 0.95 });
  for (const [x, z] of [[-1.4, -1.45], [1.4, -1.45], [-1.45, 1.45], [1.45, 1.45]]) lamp(b, x, z);
  return { geo: b.build(), top: 4.1, smoke: [] };
}
