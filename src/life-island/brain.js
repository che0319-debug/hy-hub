// 大腦圖書館（樣態 A）：圓形圖書館，穹頂是一顆淡粉色的大腦，腦溝與神經線會發光，外圈是書架窗與書堆。
// 正面朝 +z，佔 3×3 格。
import { B, box, cyl, sph, cone, rng } from './geo.js';
import { lamp } from './props.js';
import { TorusGeometry } from 'three';

const CREAM = 0xf6efe0, TRIM = 0xe2d6bc, WOOD = 0x9a6a45, PINKS = [0xf8b9cb, 0xf4a9c0, 0xfac6d6, 0xf2b3c9];

export function makeBrain() {
  const b = new B();
  b.add(box(3.0, 0.1, 3.0, 0.02, 1), 0xe9e0d0, { y: 0.05 });
  const CZ = -0.2;
  // 基座與圓形台階
  b.add(cyl(1.35, 1.4, 0.1, 40), TRIM, { y: 0.15, z: CZ });
  b.add(cyl(1.25, 1.3, 0.08, 40), 0xf1e8d4, { y: 0.24, z: CZ });
  // 圓筒外牆＋一圈書架窗（彩色書背）
  b.add(cyl(1.1, 1.14, 0.72, 40), CREAM, { y: 0.64, z: CZ, g: [0.93, 1] });
  b.add(cyl(1.16, 1.16, 0.06, 40), TRIM, { y: 1.02, z: CZ });
  for (let k = 0; k < 14; k++) {
    const a = k / 14 * Math.PI * 2 + Math.PI / 14, x = Math.sin(a) * 1.115, z = CZ + Math.cos(a) * 1.115;
    if (Math.abs(a - Math.PI * 2) < 0.4 || Math.abs(a) < 0.4) continue;      // 正面留給入口
    b.add(box(0.3, 0.42, 0.05, 0.01, 1), 0x6b5a7a, { x, y: 0.66, z, ry: a });
    for (let s = 0; s < 4; s++) b.add(box(0.26, 0.04, 0.03, 0, 1), [0xff8fa8, 0xffd34d, 0x7fd6bd, 0x8fb4ff][(k + s) % 4], { x: x + Math.sin(a) * 0.03, y: 0.5 + s * 0.1, z: z + Math.cos(a) * 0.03, ry: a });
  }
  // 入口：拱門＋兩根柱子＋台階
  for (let k = 0; k < 3; k++) b.add(box(1.0 - k * 0.1, 0.06, 0.34 - k * 0.06, 0.01, 1), 0xf6efe0, { y: 0.14 + k * 0.06, z: CZ + 1.3 + (2 - k) * 0.1 });
  b.add(box(0.5, 0.62, 0.06, 0.02, 1), WOOD, { y: 0.58, z: CZ + 1.12 });
  b.add(cyl(0.25, 0.25, 0.06, 18), WOOD, { y: 0.89, z: CZ + 1.12, rx: Math.PI / 2 });
  for (const sx of [-1, 1]) b.add(cyl(0.06, 0.07, 0.8, 10), 0xfffaf0, { x: sx * 0.38, y: 0.65, z: CZ + 1.18 });
  b.add(box(1.0, 0.07, 0.22, 0.02, 1), TRIM, { y: 1.07, z: CZ + 1.18 });
  // 虛擬 AI 大腦：深藍半透明感的兩個半腦＋青色發光腦迴＋神經網路節點與連線＋光環
  const R = 0.98, YB = 1.1, rnd = rng(11);
  const BLU = [0x2b3fa8, 0x3550c8, 0x2a2f8f, 0x4560d8], CY = 0x1fb5ff, VI = 0x9a6bff;
  b.add(cyl(0.95, 1.0, 0.07, 36), 0x2a2f5a, { y: YB - 0.04, z: CZ });                      // 發光底座
  b.add(new TorusGeometry(0.98, 0.022, 6, 48), CY, { rx: Math.PI / 2, y: YB, z: CZ, glow: 0.9 });
  for (const sx of [-1, 1]) {
    b.add(sph(R * 0.5, 22, 16), BLU[0], { x: sx * 0.26, y: YB + 0.12, z: CZ, s: [1.02, 1.0, 1.9], g: [0.8, 1.15] });
    b.add(sph(R * 0.47, 18, 12), BLU[1], { x: sx * 0.44, y: YB + 0.0, z: CZ + 0.02, s: [1.0, 0.82, 1.78] });
  }
  for (let k = 0; k < 230; k++) {   // 腦迴：發亮的小圓丘（青／藍／紫交錯）
    const sx = k % 2 ? 1 : -1, th = rnd() * Math.PI * 0.46, ph = (rnd() - 0.5) * Math.PI * 1.7;
    const rr = 0.1 + rnd() * 0.07, ex = 0.3 + Math.abs(Math.sin(th)) * 0.62, y = YB + 0.1 + Math.cos(th) * 0.62, z = CZ + Math.sin(ph) * 0.9 * Math.sin(th + 0.5);
    const x = sx * (0.1 + Math.abs(Math.cos(ph)) * ex * Math.sin(th + 0.2));
    if (Math.abs(x) < 0.09) continue;
    const c = [BLU[(rnd() * 4) | 0], BLU[3], CY, VI][k % 4];
    b.add(sph(rr, 8, 6), c, { x, y, z, s: [1, 0.85, 1.25], glow: c === CY || c === VI ? 0.3 : 0.06 });
  }
  b.add(box(0.05, 0.05, 1.7, 0, 1), CY, { y: YB + 0.74, z: CZ, glow: 0.9 });                // 中縫發光
  // 神經網路：節點＋連線懸浮在腦表面
  const nodes = [];
  for (let k = 0; k < 14; k++) { const a = k / 14 * Math.PI * 2, r = 0.55 + (k % 3) * 0.12; nodes.push([Math.sin(a) * r, YB + 0.5 + (k % 4) * 0.12, CZ + Math.cos(a) * r * 1.25]); }
  nodes.forEach(([x, y, z], k) => {
    b.add(sph(0.045, 6, 5), k % 2 ? CY : VI, { x, y, z, glow: 1 });
    const [x2, y2, z2] = nodes[(k + 3) % nodes.length], dx = x2 - x, dy = y2 - y, dz = z2 - z, L = Math.hypot(dx, dy, dz);
    b.with({ x: (x + x2) / 2, y: (y + y2) / 2, z: (z + z2) / 2 }, () => {
      const m = box(0.014, 0.014, L, 0, 1);
      b.add(m, CY, { ry: Math.atan2(dx, dz), rx: -Math.asin(dy / L), glow: 0.8 });
    });
  });
  b.add(new TorusGeometry(0.7, 0.012, 6, 40), VI, { rx: Math.PI / 2, y: YB + 0.38, z: CZ, glow: 0.9, s: [1, 1.4, 1], rz: 0 });
  b.add(new TorusGeometry(0.5, 0.012, 6, 36), CY, { rx: Math.PI / 2 + 0.5, ry: 0.4, y: YB + 0.75, z: CZ, glow: 0.9, s: [1, 1.4, 1] });
  b.add(sph(0.07, 8, 6), 0xffffff, { y: YB + 0.92, z: CZ - 0.1, glow: 1 });
  // 外面的書堆、長椅、花台、路燈
  for (const [x, z, n] of [[-1.25, 1.05, 3], [1.3, 0.95, 4]]) for (let k = 0; k < n; k++) b.add(box(0.34 - k * 0.03, 0.08, 0.24, 0.01, 1), [0xff8fa8, 0x7fd6bd, 0xffd34d, 0x8fb4ff][(k + (x > 0 ? 1 : 0)) % 4], { x, y: 0.14 + k * 0.085, z, ry: k * 0.25 });
  b.add(box(0.55, 0.05, 0.16, 0.01, 1), WOOD, { x: 0.8, y: 0.2, z: 1.3 }); b.add(box(0.55, 0.14, 0.03, 0, 1), WOOD, { x: 0.8, y: 0.3, z: 1.38 });
  for (const x of [-0.7, 0.2]) { b.add(box(0.3, 0.16, 0.3, 0.03, 1), 0xd9b48a, { x, y: 0.18, z: 1.38 }); b.add(sph(0.2, 10, 8), 0x6fc07a, { x, y: 0.42, z: 1.38 }); }
  for (const [x, z] of [[-1.4, -1.4], [1.4, -1.4], [-1.4, 1.45], [1.4, 1.45]]) lamp(b, x, z);
  return { geo: b.build(), top: 3.1, smoke: [] };
}
