// 會議帳篷：市集遮陽棚＋長會議桌＋投影布幕＋咖啡推車。正面朝 +z。
import { B, box, cyl, sph, cone } from './geo.js';
import { lamp } from './props.js';

const WOOD = 0x9a6a45, RED = 0xe2674a, CREAM = 0xfff3dc, TEAL = 0x3f9f8a;

export function makeMeeting() {
  const b = new B();
  b.add(box(3.0, 0.1, 3.0, 0.02, 1), 0xe9e0d0, { y: 0.05 });
  // 木地板
  b.add(box(2.5, 0.06, 1.9, 0.02, 1), 0xd6b58a, { y: 0.13, z: 0.1 });
  for (let k = 0; k < 9; k++) b.add(box(0.015, 0.012, 1.9, 0, 1), 0xbf9a6c, { x: -1.1 + k * 0.275, y: 0.165, z: 0.1 });
  // 四根立柱
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.add(cyl(0.045, 0.05, 1.6, 8), WOOD, { x: sx * 1.12, y: 0.96, z: 0.1 + sz * 0.8 });
  // 條紋棚頂（前後坡面，各 11 條）
  const N = 11, W = 2.5 / N;
  for (let k = 0; k < N; k++) {
    const c = k % 2 ? CREAM : RED, x = -1.25 + W * (k + 0.5);
    b.add(box(W, 0.04, 1.05, 0, 1), c, { x, y: 1.9, z: 0.1 + 0.5, rx: 0.38 });
    b.add(box(W, 0.04, 1.05, 0, 1), c, { x, y: 1.9, z: 0.1 - 0.5, rx: -0.38 });
    b.add(box(W, 0.2, 0.03, 0, 1), c, { x, y: 1.62, z: 0.1 + 1.0 });       // 前緣垂簾
    b.add(sph(W * 0.5, 8, 6), c, { x, y: 1.52, z: 0.1 + 1.0, s: [1, 0.55, 0.25] });
  }
  b.add(box(2.55, 0.06, 0.07, 0, 1), WOOD, { y: 2.08, z: 0.1 });
  b.add(cyl(0.012, 0.012, 0.35, 6), 0x8a8f99, { x: 0.0, y: 2.25, z: 0.1 });
  b.add(box(0.28, 0.17, 0.02, 0, 1), TEAL, { x: 0.15, y: 2.33, z: 0.1 });
  // 長桌＋椅子
  b.add(box(1.7, 0.06, 0.5, 0.02, 1), 0xb98856, { y: 0.52, z: 0.1 });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.add(box(0.05, 0.36, 0.05, 0, 1), WOOD, { x: sx * 0.78, y: 0.34, z: 0.1 + sz * 0.2 });
  for (let k = 0; k < 4; k++) for (const sz of [-1, 1]) {
    const x = -0.6 + k * 0.4, z = 0.1 + sz * 0.46;
    b.add(box(0.26, 0.04, 0.26, 0.01, 1), [0x5f8fa8, 0xf0a86a, 0x7fc4a0, 0xe38aa0][k], { x, y: 0.32, z });
    b.add(box(0.26, 0.24, 0.035, 0.01, 1), [0x5f8fa8, 0xf0a86a, 0x7fc4a0, 0xe38aa0][k], { x, y: 0.46, z: z + sz * 0.12 });
    for (const dx of [-1, 1]) b.add(box(0.03, 0.2, 0.03, 0, 1), WOOD, { x: x + dx * 0.1, y: 0.2, z });
  }
  b.add(box(0.14, 0.08, 0.1, 0.01, 1), 0xffffff, { x: -0.3, y: 0.58, z: 0.1 });            // 桌上的文件與杯子
  b.add(cyl(0.035, 0.03, 0.07, 8), 0xffd34d, { x: 0.25, y: 0.59, z: 0.05 });
  b.add(cyl(0.035, 0.03, 0.07, 8), 0xff9fb0, { x: 0.55, y: 0.59, z: 0.2 });
  // 投影布幕（右端，朝桌）
  b.add(box(0.05, 1.5, 0.05, 0, 1), 0x6b7280, { x: -1.05, y: 0.9, z: -0.62 });
  b.add(box(0.9, 0.58, 0.03, 0.01, 1), 0xffffff, { x: -0.62, y: 1.0, z: -0.62 });
  b.add(box(0.94, 0.62, 0.02, 0, 1), 0x4a5260, { x: -0.62, y: 1.0, z: -0.64 });
  for (let k = 0; k < 4; k++) b.add(box(0.14 + (k % 2) * 0.1, 0.05, 0.02, 0, 1), [0x7fc4e8, 0xffb347, 0x9ed6a0, 0xff9fb0][k], { x: -0.82 + (k % 2) * 0.1, y: 1.2 - k * 0.1, z: -0.6 });
  // 咖啡推車（左前）
  b.with({ x: 1.55, z: 1.05, ry: -0.5 }, () => {
    b.add(box(0.6, 0.38, 0.34, 0.02, 1), 0xfff3dc, { y: 0.36 });
    b.add(box(0.64, 0.05, 0.38, 0.01, 1), WOOD, { y: 0.57 });
    for (let k = 0; k < 5; k++) b.add(box(0.12, 0.03, 0.42, 0, 1), k % 2 ? CREAM : TEAL, { x: -0.24 + k * 0.12, y: 0.98, z: 0, rx: 0.2 });
    for (const sx of [-1, 1]) b.add(box(0.025, 0.42, 0.025, 0, 1), WOOD, { x: sx * 0.28, y: 0.78, z: 0.16 });
    for (const sx of [-1, 1]) b.add(cyl(0.09, 0.09, 0.04, 12), 0x2a3340, { x: sx * 0.24, y: 0.1, z: 0.19, rx: Math.PI / 2 });
    b.add(cyl(0.05, 0.04, 0.09, 8), 0xdddddd, { x: 0.1, y: 0.65 });
  });
  // 路燈、花盆、小燈串
  for (const [x, z] of [[-1.4, -1.4], [1.4, -1.4], [-1.4, 1.45], [1.4, 1.45]]) lamp(b, x, z);
  for (const x of [-1.35, 1.35]) { b.add(box(0.3, 0.16, 0.3, 0.03, 1), 0xd9b48a, { x, y: 0.18, z: -0.9 }); b.add(sph(0.2, 10, 8), 0x6fc07a, { x, y: 0.42, z: -0.9 }); }
  for (let k = 0; k < 9; k++) b.add(sph(0.035, 6, 5), [0xffd34d, 0xff9fb0, 0x9ed0ff][k % 3], { x: -1.0 + k * 0.25, y: 1.55 - Math.sin(k / 8 * Math.PI) * -0.06 - 0.12, z: 0.1 + 1.0, glow: 0.7 });
  return { geo: b.build(), top: 2.5, smoke: [] };
}
