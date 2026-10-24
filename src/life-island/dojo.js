// 人生修練館：日式道館＋冥想庭院。木造大廳（紙拉門、雙層瓦屋頂），前院有砂紋、水池、石燈籠、盆景、冥想坐墊與木人樁。
// 正面朝 +z，佔 3×3 格。
import { B, box, cyl, sph, cone, prismTri } from './geo.js';
import { lamp } from './props.js';
import { TorusGeometry } from 'three';

const WOODD = 0x7a5236, WOOD = 0xa87a52, WALL = 0xf3e8d2, TILE = 0x4d5b75, TILE2 = 0x5d6d89, STONE = 0xd8d4ca, GRASS = 0x8fc474;

function lantern(b, x, z) {
  b.add(cyl(0.07, 0.09, 0.08, 8), STONE, { x, y: 0.16, z });
  b.add(cyl(0.035, 0.035, 0.2, 8), STONE, { x, y: 0.3, z });
  b.add(box(0.16, 0.13, 0.16, 0.02, 1), 0xffe7a8, { x, y: 0.47, z, glow: 0.7 });
  b.add(cone(0.15, 0.1, 4), STONE, { x, y: 0.59, z, ry: Math.PI / 4 });
}

export function makeDojo() {
  const b = new B();
  b.add(box(3.0, 0.1, 3.0, 0.02, 1), 0xe9e0d0, { y: 0.05 });
  // 後方：道館大廳
  const HZ = -0.85;
  b.add(box(2.3, 0.14, 1.3, 0.02, 1), STONE, { y: 0.17, z: HZ });
  b.add(box(2.0, 0.7, 1.0, 0.03, 1), WALL, { y: 0.59, z: HZ });
  for (const sx of [-1, 0, 1]) for (const sz of [-1, 1]) b.add(box(0.07, 0.72, 0.07, 0, 1), WOODD, { x: sx * 1.0, y: 0.6, z: HZ + sz * 0.5 });
  for (const sx of [-1, 1]) b.add(box(0.07, 0.72, 0.07, 0, 1), WOODD, { x: sx * 0.5, y: 0.6, z: HZ + 0.5 });
  // 正面紙拉門（白紙＋木格）
  for (let k = 0; k < 4; k++) { const x = -0.75 + k * 0.5; b.add(box(0.44, 0.58, 0.03, 0, 1), 0xfffaf0, { x, y: 0.56, z: HZ + 0.51, glow: 0.18 }); b.add(box(0.02, 0.58, 0.04, 0, 1), WOODD, { x: x + 0.22, y: 0.56, z: HZ + 0.52 }); b.add(box(0.44, 0.02, 0.04, 0, 1), WOODD, { x, y: 0.56, z: HZ + 0.52 }); }
  b.add(box(2.1, 0.07, 0.07, 0, 1), WOODD, { y: 0.93, z: HZ + 0.5 });
  // 雙層瓦屋頂（四邊出簷）
  b.add(box(2.5, 0.07, 1.5, 0.02, 1), TILE, { y: 0.98, z: HZ });
  b.add(prismTri(1.55, 0.5, 2.55), TILE2, { y: 1.0, z: HZ });
  b.add(box(1.5, 0.28, 0.75, 0.03, 1), WALL, { y: 1.22, z: HZ });
  b.add(box(1.8, 0.06, 1.05, 0.02, 1), TILE, { y: 1.4, z: HZ });
  b.add(prismTri(1.1, 0.4, 1.85), TILE2, { y: 1.42, z: HZ });
  for (const sx of [-1, 1]) b.add(cone(0.06, 0.16, 6), 0xffb347, { x: sx * 0.95, y: 1.86, z: HZ });
  b.add(box(1.9, 0.04, 0.04, 0, 1), 0xffb347, { y: 1.83, z: HZ });
  // 匾額
  b.add(box(0.7, 0.2, 0.04, 0.01, 1), WOODD, { y: 1.13, z: HZ + 0.58 });
  b.add(box(0.58, 0.1, 0.02, 0, 1), 0xffd34d, { y: 1.13, z: HZ + 0.61, glow: 0.2 });
  // 前廊與台階
  b.add(box(2.0, 0.05, 0.3, 0.01, 1), WOOD, { y: 0.21, z: HZ + 0.72 });
  for (let k = 0; k < 2; k++) b.add(box(0.8, 0.05, 0.22, 0.01, 1), STONE, { y: 0.13 + k * 0.04, z: HZ + 0.9 + (1 - k) * 0.1 });
  // 前院：砂紋禪園
  b.add(box(2.7, 0.03, 1.15, 0.01, 1), 0xf0e6cf, { y: 0.115, z: 0.7 });
  for (let k = 0; k < 9; k++) b.add(box(2.5, 0.012, 0.02, 0, 1), 0xd9cdb0, { y: 0.135, z: 0.2 + k * 0.1 });
  for (const [x, z, r] of [[-0.7, 0.55, 0.12], [-0.55, 0.42, 0.08], [0.9, 0.9, 0.1]]) b.add(sph(r, 8, 6), 0xb8b2a6, { x, y: 0.14 + r * 0.4, z, s: [1, 0.7, 1] });
  // 水池（冥想池）＋錦鯉＋踏石
  b.add(cyl(0.5, 0.52, 0.07, 28), STONE, { x: 0.65, y: 0.14, z: 0.65 });
  b.add(cyl(0.44, 0.44, 0.02, 28), 0x7fd0e8, { x: 0.65, y: 0.185, z: 0.65, glow: 0.2 });
  for (const [dx, dz, c] of [[-0.1, 0.05, 0xff8a3c], [0.12, -0.08, 0xffffff], [0.05, 0.14, 0xff8a3c]]) b.add(sph(0.045, 6, 5), c, { x: 0.65 + dx, y: 0.2, z: 0.65 + dz, s: [1.6, 0.5, 0.8] });
  for (let k = 0; k < 4; k++) b.add(cyl(0.08, 0.08, 0.03, 8), 0xb8b2a6, { x: 0.15 - k * 0.22, y: 0.14, z: 1.1 - k * 0.05 });
  // 石燈籠、盆景松、冥想坐墊、木人樁
  lantern(b, -1.2, 0.2); lantern(b, 1.25, 0.15);
  b.add(box(0.28, 0.14, 0.28, 0.03, 1), WOOD, { x: -1.0, y: 0.19, z: 1.2 }); b.add(cyl(0.025, 0.04, 0.2, 6), WOODD, { x: -1.0, y: 0.36, z: 1.2 }); b.add(sph(0.17, 8, 6), 0x5aa36a, { x: -1.0, y: 0.52, z: 1.2, s: [1.3, 0.7, 1.3] });
  for (let k = 0; k < 3; k++) { b.add(cyl(0.12, 0.13, 0.05, 14), [0xd9694a, 0xe0a84a, 0x5f8fa8][k], { x: -0.45 + k * 0.3, y: 0.16, z: 0.95 }); b.add(sph(0.028, 5, 4), 0xffffff, { x: -0.45 + k * 0.3, y: 0.2, z: 0.95 }); }
  b.add(cyl(0.045, 0.05, 0.5, 8), WOODD, { x: -1.3, y: 0.38, z: 0.95 }); b.add(box(0.34, 0.05, 0.05, 0, 1), WOODD, { x: -1.3, y: 0.5, z: 0.95 }); b.add(box(0.05, 0.05, 0.3, 0, 1), WOODD, { x: -1.3, y: 0.4, z: 0.95 });
  // 入口小木門（前緣）、路燈
  for (const sx of [-1, 1]) b.add(box(0.07, 0.6, 0.07, 0, 1), WOODD, { x: sx * 0.35, y: 0.4, z: 1.42 });
  b.add(box(0.95, 0.06, 0.1, 0.01, 1), 0xd9694a, { y: 0.74, z: 1.42 }); b.add(box(1.1, 0.04, 0.12, 0.01, 1), WOODD, { y: 0.8, z: 1.42 });
  for (const [x, z] of [[-1.4, -1.45], [1.4, -1.45], [-1.45, 1.45], [1.45, 1.45]]) lamp(b, x, z);
  return { geo: b.build(), top: 2.0, smoke: [] };
}
