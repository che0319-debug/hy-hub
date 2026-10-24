// 家：暖色小別墅。兩層、斜屋頂、煙囪冒煙，前院有信箱、小花園、柵欄與小路，窗戶亮著暖光。正面朝 +z，佔 3×3 格。
import { B, box, cyl, sph, cone, prismTri } from './geo.js';
import { lamp } from './props.js';

const WALL = 0xf6d9b8, WALL2 = 0xf0c79a, ROOF = 0xd9694a, ROOF2 = 0xc4573b, TRIM = 0xfff6e6, WOOD = 0x9a6a45, GRASS = 0x9fd27f;

function win(b, x, y, z, w = 0.3, h = 0.3) {
  b.add(box(w + 0.08, h + 0.08, 0.04, 0.01, 1), TRIM, { x, y, z });
  b.add(box(w, h, 0.04, 0, 1), 0xffe3a3, { x, y, z: z + 0.02, glow: 0.45 });
  b.add(box(0.025, h, 0.05, 0, 1), TRIM, { x, y, z: z + 0.025 }); b.add(box(w, 0.025, 0.05, 0, 1), TRIM, { x, y, z: z + 0.025 });
  b.add(box(w + 0.14, 0.06, 0.1, 0.01, 1), WOOD, { x, y: y - h / 2 - 0.07, z: z + 0.05 });
  b.add(box(0.1, 0.05, 0.06, 0.01, 1), 0xe0607a, { x: x - w * 0.25, y: y - h / 2 - 0.02, z: z + 0.08 }); b.add(box(0.1, 0.05, 0.06, 0.01, 1), 0xffd34d, { x: x + w * 0.25, y: y - h / 2 - 0.02, z: z + 0.08 });
}

export function makeHome() {
  const b = new B();
  b.add(box(3.0, 0.1, 3.0, 0.02, 1), 0xe9e0d0, { y: 0.05 });
  b.add(box(2.8, 0.03, 2.8, 0.01, 1), GRASS, { y: 0.115 });
  const HZ = -0.5;
  // 屋身：一樓＋二樓（二樓稍內縮），右側矮側屋
  b.add(box(1.7, 0.12, 1.3, 0.02, 1), 0xe6dccb, { y: 0.19, z: HZ });
  b.add(box(1.6, 0.6, 1.2, 0.03, 1), WALL, { y: 0.55, z: HZ });
  b.add(box(1.6, 0.55, 1.2, 0.03, 1), WALL2, { y: 1.12, z: HZ });
  b.add(box(1.66, 0.05, 1.26, 0.01, 1), TRIM, { y: 0.87, z: HZ });
  b.add(box(0.8, 0.5, 0.9, 0.03, 1), WALL, { x: 1.15, y: 0.5, z: HZ + 0.1 });
  b.add(box(0.9, 0.06, 1.0, 0.02, 1), ROOF2, { x: 1.15, y: 0.78, z: HZ + 0.1 });
  b.add(prismTri(1.0, 0.3, 0.95), ROOF, { x: 1.15, y: 0.8, z: HZ + 0.1 });
  // 主屋斜屋頂（山牆朝側面）＋大屋簷
  b.add(box(1.8, 0.06, 1.4, 0.02, 1), ROOF2, { y: 1.42, z: HZ });
  b.add(prismTri(1.4, 0.62, 1.8), ROOF, { y: 1.44, z: HZ });
  b.add(box(1.84, 0.04, 0.05, 0, 1), TRIM, { y: 2.06, z: HZ });
  // 煙囪＋煙
  b.add(box(0.2, 0.55, 0.2, 0.02, 1), 0xb5654a, { x: 0.55, y: 1.85, z: HZ - 0.2 }); b.add(box(0.26, 0.05, 0.26, 0.01, 1), 0x8a4a38, { x: 0.55, y: 2.14, z: HZ - 0.2 });
  // 山牆圓窗
  b.add(cyl(0.14, 0.14, 0.05, 16), TRIM, { y: 1.72, z: HZ + 0.62, rx: Math.PI / 2 }); b.add(cyl(0.1, 0.1, 0.06, 16), 0xffe3a3, { y: 1.72, z: HZ + 0.63, rx: Math.PI / 2, glow: 0.5 });
  // 窗戶、門、門廊
  win(b, -0.45, 0.62, HZ + 0.6); win(b, 0.45, 0.62, HZ + 0.6, 0.3, 0.3);
  win(b, -0.45, 1.2, HZ + 0.6); win(b, 0.0, 1.2, HZ + 0.6, 0.26, 0.3); win(b, 0.45, 1.2, HZ + 0.6);
  win(b, 1.15, 0.52, HZ + 0.56, 0.26, 0.26);
  b.add(box(0.34, 0.48, 0.05, 0.02, 1), 0x6e8fd0, { x: 0.0, y: 0.5, z: HZ + 0.61 }); b.add(sph(0.025, 6, 5), 0xffd34d, { x: 0.1, y: 0.5, z: HZ + 0.65 });
  for (const sx of [-1, 1]) b.add(cyl(0.035, 0.04, 0.45, 8), TRIM, { x: sx * 0.28, y: 0.45, z: HZ + 0.82 });
  b.add(box(0.7, 0.05, 0.45, 0.01, 1), ROOF2, { y: 0.7, z: HZ + 0.72 }); b.add(prismTri(0.45, 0.14, 0.72), ROOF, { y: 0.72, z: HZ + 0.72 });
  b.add(box(0.7, 0.04, 0.3, 0.01, 1), 0xe6dccb, { y: 0.15, z: HZ + 0.8 });
  // 小路、柵欄、信箱
  for (let k = 0; k < 5; k++) b.add(box(0.36, 0.02, 0.2, 0.01, 1), 0xe6dccb, { x: k % 2 ? 0.04 : -0.04, y: 0.13, z: 0.5 + k * 0.22 });
  for (let k = 0; k < 12; k++) { const x = -1.25 + k * 0.23; if (Math.abs(x) < 0.3) continue; b.add(box(0.07, 0.24, 0.04, 0.01, 1), TRIM, { x, y: 0.26, z: 1.42 }); }
  b.add(box(2.7, 0.03, 0.03, 0, 1), TRIM, { y: 0.3, z: 1.42 });
  b.add(cyl(0.025, 0.03, 0.32, 6), WOOD, { x: -0.5, y: 0.28, z: 1.35 }); b.add(box(0.14, 0.1, 0.18, 0.02, 1), 0xe05a4a, { x: -0.5, y: 0.47, z: 1.35 });
  // 花園、樹、鞦韆、小狗屋
  for (const [x, z, c] of [[-0.95, 0.65, 0xff7fa5], [-0.75, 0.8, 0xffd34d], [-1.05, 0.9, 0xffffff], [0.9, 0.8, 0xff9a5a], [0.7, 0.95, 0xff7fa5]]) { b.add(sph(0.1, 7, 5), 0x6fc07a, { x, y: 0.2, z, s: [1.2, 0.7, 1.2] }); b.add(sph(0.045, 6, 5), c, { x, y: 0.3, z }); }
  b.add(cyl(0.06, 0.08, 0.5, 8), WOOD, { x: -1.2, y: 0.38, z: -0.6 }); b.add(sph(0.38, 10, 8), 0x7fc96a, { x: -1.2, y: 0.8, z: -0.6 }); b.add(sph(0.26, 10, 8), 0x8fd77a, { x: -1.08, y: 1.02, z: -0.5 });
  b.add(box(0.28, 0.2, 0.28, 0.02, 1), 0xc9955f, { x: 1.2, y: 0.22, z: 0.55 }); b.add(prismTri(0.34, 0.14, 0.3), ROOF, { x: 1.2, y: 0.33, z: 0.55 });
  for (const [x, z] of [[-1.4, 1.45], [1.4, 1.45], [1.4, -1.45]]) lamp(b, x, z);
  return { geo: b.build(), top: 2.2, smoke: [] };
}
