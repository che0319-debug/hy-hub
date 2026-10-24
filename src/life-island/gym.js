// 健身房：玻璃盒子健身館。兩層玻璃牆盒子，看得到跑步機、啞鈴架與健身腳踏車，屋頂立著大啞鈴招牌，門口有啞鈴花台與水壺。
// 正面朝 +z，佔 3×3 格。
import { B, box, cyl, sph } from './geo.js';
import { lamp } from './props.js';

const GLASS = 0xa9dcf0, FRAME = 0x39455c, ACC = 0xff7a3c, DARK = 0x2c3345;

function dumbbell(b, x, y, z, s = 1, c = DARK, ry = 0) {
  b.with({ x, y, z, ry }, () => {
    b.add(cyl(0.025 * s, 0.025 * s, 0.34 * s, 8), 0xaab0bd, { rz: Math.PI / 2 });
    for (const sx of [-1, 1]) { b.add(cyl(0.09 * s, 0.09 * s, 0.05 * s, 12), c, { x: sx * 0.14 * s, rz: Math.PI / 2 }); b.add(cyl(0.065 * s, 0.065 * s, 0.05 * s, 12), c, { x: sx * 0.19 * s, rz: Math.PI / 2 }); }
  });
}
function treadmill(b, x, z) {
  b.add(box(0.26, 0.05, 0.5, 0.01, 1), DARK, { x, y: 0.2, z }); b.add(box(0.2, 0.02, 0.44, 0, 1), 0x6c7388, { x, y: 0.235, z });
  b.add(box(0.03, 0.3, 0.03, 0, 1), DARK, { x: x - 0.1, y: 0.38, z: z - 0.2 }); b.add(box(0.03, 0.3, 0.03, 0, 1), DARK, { x: x + 0.1, y: 0.38, z: z - 0.2 }); b.add(box(0.26, 0.1, 0.05, 0.01, 1), 0x4a90e2, { x, y: 0.55, z: z - 0.22, glow: 0.3 });
}
function bike(b, x, z) {
  b.add(cyl(0.1, 0.1, 0.03, 12), DARK, { x, y: 0.28, z, rz: Math.PI / 2 }); b.add(box(0.04, 0.26, 0.04, 0, 1), ACC, { x, y: 0.4, z: z - 0.02 }); b.add(box(0.12, 0.04, 0.12, 0.01, 1), DARK, { x, y: 0.55, z: z + 0.1 });
  b.add(box(0.14, 0.04, 0.04, 0, 1), DARK, { x, y: 0.58, z: z - 0.12 });
}

export function makeGym() {
  const b = new B();
  b.add(box(3.0, 0.1, 3.0, 0.02, 1), 0xe9e0d0, { y: 0.05 });
  const CZ = -0.35;
  b.add(box(2.3, 0.12, 1.7, 0.02, 1), 0xd9dde5, { y: 0.16, z: CZ });
  // 地板與室內器材（先放，再蓋玻璃）
  b.add(box(2.1, 0.03, 1.5, 0, 1), 0xf2e3c8, { y: 0.24, z: CZ });
  treadmill(b, -0.7, CZ - 0.25); treadmill(b, -0.35, CZ - 0.25); treadmill(b, 0.0, CZ - 0.25);
  bike(b, 0.55, CZ - 0.2); bike(b, 0.85, CZ - 0.2);
  b.add(box(0.8, 0.05, 0.14, 0.01, 1), DARK, { x: -0.45, y: 0.42, z: CZ + 0.3 });                         // 啞鈴架
  b.add(box(0.8, 0.05, 0.14, 0.01, 1), DARK, { x: -0.45, y: 0.3, z: CZ + 0.3 });
  for (let k = 0; k < 4; k++) { dumbbell(b, -0.7 + k * 0.17, 0.48, CZ + 0.3, 0.45, [0xff7a3c, 0x4a90e2, 0xe2564f, 0x5ec38a][k]); dumbbell(b, -0.7 + k * 0.17, 0.36, CZ + 0.3, 0.55, DARK); }
  b.add(box(0.5, 0.03, 0.3, 0, 1), 0x4a90e2, { x: 0.7, y: 0.26, z: CZ + 0.35 });                             // 瑜珈墊
  b.add(sph(0.12, 10, 8), 0xff7a3c, { x: 0.95, y: 0.38, z: CZ + 0.3, glow: 0.1 });                            // 健身球
  // 玻璃盒子：四根角柱、玻璃牆、二樓樓板
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.add(box(0.08, 1.4, 0.08, 0, 1), FRAME, { x: sx * 1.12, y: 0.9, z: CZ + sz * 0.8 });
  b.add(box(2.24, 0.05, 1.64, 0.01, 1), FRAME, { y: 0.62, z: CZ });
  for (const [x, z, w, d] of [[0, CZ + 0.8, 2.16, 0.03], [0, CZ - 0.8, 2.16, 0.03], [-1.12, CZ, 0.03, 1.56], [1.12, CZ, 0.03, 1.56]]) b.add(box(w, 1.3, d, 0, 1), GLASS, { x, y: 0.9, z, glow: 0.12 });
  for (let k = 1; k < 4; k++) b.add(box(0.03, 1.3, 0.05, 0, 1), FRAME, { x: -1.12 + k * 0.56, y: 0.9, z: CZ + 0.82 });
  b.add(box(2.24, 0.04, 0.05, 0, 1), FRAME, { y: 1.32, z: CZ + 0.82 });
  // 二樓：幾台器材剪影
  for (let k = 0; k < 3; k++) { b.add(box(0.3, 0.06, 0.3, 0.01, 1), DARK, { x: -0.7 + k * 0.7, y: 0.68, z: CZ - 0.1 }); b.add(box(0.04, 0.4, 0.04, 0, 1), ACC, { x: -0.7 + k * 0.7, y: 0.9, z: CZ - 0.1 }); }
  // 屋頂＋大啞鈴招牌
  b.add(box(2.34, 0.08, 1.78, 0.02, 1), DARK, { y: 1.58, z: CZ });
  b.add(box(2.34, 0.04, 0.06, 0, 1), ACC, { y: 1.5, z: CZ + 0.88 });
  for (const sx of [-1, 1]) b.add(box(0.06, 0.4, 0.06, 0, 1), 0x8a8f99, { x: sx * 0.4, y: 1.82, z: CZ });
  dumbbell(b, 0, 2.04, CZ, 1.5, ACC);
  b.add(box(0.7, 0.14, 0.05, 0.01, 1), 0xfff6e6, { y: 1.5, z: CZ + 0.86, glow: 0.35 });
  // 入口：玻璃門＋台階、啞鈴花台、水壺、長椅
  b.add(box(0.4, 0.62, 0.05, 0.01, 1), 0xd6f1fb, { y: 0.55, z: CZ + 0.83, glow: 0.3 });
  for (let k = 0; k < 2; k++) b.add(box(0.9, 0.05, 0.2, 0.01, 1), 0xf0e6d2, { y: 0.14 + k * 0.04, z: CZ + 1.0 + (1 - k) * 0.18 });
  for (const x of [-0.85, 0.85]) { b.add(box(0.5, 0.2, 0.28, 0.03, 1), 0xd9dde5, { x, y: 0.2, z: 1.1 }); b.add(sph(0.16, 8, 6), 0x6fc07a, { x: x - 0.1, y: 0.42, z: 1.1 }); dumbbell(b, x + 0.1, 0.34, 1.1, 0.7, ACC); }
  b.add(box(0.5, 0.05, 0.16, 0.01, 1), 0x9a6a45, { x: 1.2, y: 0.2, z: 0.7 }); b.add(cyl(0.05, 0.05, 0.14, 8), 0x4a90e2, { x: 1.1, y: 0.3, z: 0.7 });
  for (const [x, z] of [[-1.4, -1.45], [1.4, -1.45], [-1.45, 1.45], [1.45, 1.45]]) lamp(b, x, z);
  return { geo: b.build(), top: 2.5, smoke: [] };
}
