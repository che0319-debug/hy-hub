// 本業總部：取自工研院園區 —— 白色帶狀玻璃主樓、屋頂圓筒水塔、圓鼓形入口、弧形退台翼樓、草地中庭與弧形白步道（Q 版）。
// 正面朝 +z，佔 3×3 格。
import { B, box, cyl, sph } from './geo.js';
import { lamp } from './props.js';
import { arcSector } from './shapes.js';

const WHITE = 0xf5f3ee, TRIM = 0xdedacf, GLASS = 0x78b4cf, GLASS2 = 0x9acbdc, GREEN = 0x8fc474, TANK = 0xe4e6e8, DARK = 0x6b7480;
const PI = Math.PI;

// 帶狀窗：貼在方塊四個側面
function ribbons(b, cx, cz, w, d, y0, rows, gap, hh) {
  for (let k = 0; k < rows; k++) {
    const y = y0 + k * gap;
    b.add(box(w * 0.93, hh, 0.03, 0, 1), k % 2 ? GLASS2 : GLASS, { x: cx, y, z: cz + d / 2 + 0.008, glow: 0.12 });
    b.add(box(0.03, hh, d * 0.9, 0, 1), k % 2 ? GLASS2 : GLASS, { x: cx - w / 2 - 0.008, y, z: cz, glow: 0.12 });
    b.add(box(0.03, hh, d * 0.9, 0, 1), k % 2 ? GLASS2 : GLASS, { x: cx + w / 2 + 0.008, y, z: cz, glow: 0.12 });
  }
}
function tree(b, x, z, s = 1, c = 0x6fc07a) { b.add(cyl(0.03 * s, 0.04 * s, 0.2 * s, 6), 0x8b6a4a, { x, y: 0.22 + 0.1 * s, z }); b.add(sph(0.17 * s, 10, 8), c, { x, y: 0.42 + 0.2 * s, z, s: [1, 1.05, 1] }); }

export function makeHQ() {
  const b = new B();
  b.add(box(3.0, 0.1, 3.0, 0.02, 1), 0xe9e0d0, { y: 0.05 });
  const Z0 = 0.35; // 中庭中心
  // 中庭草地與弧形步道
  b.add(cyl(1.0, 1.0, 0.04, 40), GREEN, { y: 0.12, z: Z0 });
  b.add(arcSector(0.52, 0.66, 0.025, 0, 2 * PI, 36), 0xfbf8f0, { y: 0.15, z: Z0 });
  for (let k = 0; k < 15; k++) { // 從入口到前緣的 S 形主步道
    const t = k / 14, z = -0.05 + t * 1.55, x = 0.32 * Math.sin(t * 5.2), dx = 0.32 * 5.2 / 1.55 * Math.cos(t * 5.2);
    b.add(box(0.26, 0.03, 0.2, 0.01, 1), 0xfbf8f0, { x, y: 0.15, z, ry: Math.atan(dx) });
  }
  tree(b, -0.5, Z0 + 0.1, 0.9); tree(b, 0.55, Z0 - 0.05, 1.0); tree(b, -0.1, Z0 + 0.55, 0.8, 0x7fcf86); tree(b, 0.15, Z0 - 0.5, 0.75);
  b.add(box(0.5, 0.05, 0.5, 0.02, 1), 0xfbf8f0, { y: 0.15, z: Z0 });  // 中庭小廣場

  // 主樓（後方正中）
  const MZ = -1.0;
  b.add(box(1.7, 0.12, 1.1, 0.03, 1), TRIM, { y: 0.16, z: MZ });
  b.add(box(1.6, 1.5, 0.95, 0.05, 2), WHITE, { y: 0.97, z: MZ, g: [0.94, 1] });
  ribbons(b, 0, MZ, 1.6, 0.95, 0.42, 5, 0.27, 0.13);
  b.add(box(1.66, 0.07, 1.0, 0.03, 1), TRIM, { y: 1.75, z: MZ });
  // 屋頂：三個圓筒水塔＋機房
  for (const x of [-0.5, 0, 0.5]) { b.add(cyl(0.17, 0.17, 0.32, 18), TANK, { x, y: 1.95, z: MZ - 0.05, g: [0.92, 1] }); b.add(cyl(0.12, 0.17, 0.05, 18), DARK, { x, y: 2.14, z: MZ - 0.05 }); b.add(sph(0.04, 6, 5), DARK, { x, y: 2.19, z: MZ - 0.05 }); }
  b.add(box(0.4, 0.14, 0.3, 0.02, 1), DARK, { x: 0.6, y: 1.85, z: MZ + 0.25 });
  // 圓鼓形入口
  b.add(cyl(0.4, 0.4, 0.46, 28), WHITE, { y: 0.35, z: MZ + 0.62 });
  b.add(cyl(0.405, 0.405, 0.12, 28), GLASS, { y: 0.3, z: MZ + 0.62, glow: 0.18 });
  b.add(cyl(0.405, 0.405, 0.12, 28), GLASS2, { y: 0.47, z: MZ + 0.62, glow: 0.18 });
  b.add(cyl(0.46, 0.46, 0.05, 28), TRIM, { y: 0.61, z: MZ + 0.62 });
  b.add(box(0.2, 0.3, 0.04, 0.01, 1), 0x5b7f9a, { y: 0.27, z: MZ + 1.02 });

  // 兩側弧形退台翼樓：外高內低，每層頂是綠色露台
  const tiers = [[1.2, 1.5, 0.98], [0.98, 1.2, 0.64], [0.8, 0.98, 0.32]];
  for (const [p0, p1] of [[0.7 * PI, 1.22 * PI], [-0.22 * PI, 0.3 * PI]]) {
    tiers.forEach(([r0, r1, h], ti) => {
      b.add(arcSector(r0, r1, h, p0, p1), WHITE, { y: 0.1, z: Z0, g: [0.94, 1] });
      b.add(arcSector(r0 + 0.02, r1 - 0.02, 0.035, p0, p1), ti === 0 ? 0xcfd2d6 : GREEN, { y: 0.1 + h, z: Z0 });
      // 外牆帶狀窗
      for (let y = 0.22; y < h - 0.05; y += 0.2) b.add(arcSector(r1, r1 + 0.014, 0.085, p0 + 0.03, p1 - 0.03), y % 0.4 < 0.2 ? GLASS : GLASS2, { y: 0.1 + y, z: Z0, glow: 0.12 });
    });
  }
  // 翼樓屋頂水塔
  for (const sx of [-1, 1]) { b.add(cyl(0.15, 0.15, 0.28, 16), TANK, { x: sx * 1.12, y: 1.22, z: Z0 - 0.78 }); b.add(cyl(0.1, 0.15, 0.04, 16), DARK, { x: sx * 1.12, y: 1.38, z: Z0 - 0.78 }); }
  // 前緣矮籬與路燈、旗桿
  for (let k = 0; k < 7; k++) b.add(sph(0.11, 8, 6), 0x6fc07a, { x: -0.9 + k * 0.3, y: 0.2, z: 1.42, s: [1, 0.8, 1] });
  for (const [x, z] of [[-1.4, 1.45], [1.4, 1.45], [-1.4, -1.4], [1.4, -1.4]]) lamp(b, x, z);
  b.add(cyl(0.015, 0.015, 0.9, 6), 0x8a8f99, { x: 0.8, y: 0.55, z: 1.3 });
  b.add(box(0.26, 0.16, 0.015, 0, 1), 0x2f9e8f, { x: 0.94, y: 0.92, z: 1.3 });
  return { geo: b.build(), top: 2.4, smoke: [] };
}
