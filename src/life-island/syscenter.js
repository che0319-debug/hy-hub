// 系統中心：圖書館式資料中心。石造主樓＋柱廊＋圓頂，兩側是玻璃伺服器翼樓。正面朝 +z。
import { B, box, cyl, sph, cone, prismTri } from './geo.js';
import { lamp } from './props.js';
import { TorusGeometry } from 'three';

const STONE = 0xf3ead8, TRIM = 0xe0d3b6, TEAL = 0x3f9f8a, GLASS = 0x8fc9e0, DARK = 0x4b5563, GOLD = 0xffb347;

export function makeSysCenter() {
  const b = new B();
  b.add(box(3.0, 0.1, 3.0, 0.02, 1), 0xe9e0d0, { y: 0.05 });
  // 台階與前庭
  for (let k = 0; k < 3; k++) b.add(box(1.4 - k * 0.1, 0.06, 0.9 - k * 0.14, 0.01, 1), 0xf6efe0, { y: 0.13 + k * 0.06, z: 1.05 - k * 0.1 });
  b.add(box(0.5, 0.012, 0.9, 0, 1), 0x6f8fb0, { y: 0.11, z: 1.2 });
  // 主樓
  b.add(box(1.9, 0.14, 1.3, 0.02, 1), TRIM, { y: 0.2, z: -0.2 });
  b.add(box(1.8, 1.15, 1.2, 0.03, 1), STONE, { y: 0.84, z: -0.2, g: [0.94, 1] });
  b.add(box(1.9, 0.1, 1.3, 0.02, 1), TRIM, { y: 1.46, z: -0.2 });
  // 柱廊
  for (let k = 0; k < 6; k++) { const x = -0.75 + k * 0.3; b.add(cyl(0.05, 0.058, 1.0, 12), 0xfffaf0, { x, y: 0.77, z: 0.52 }); b.add(box(0.14, 0.05, 0.14, 0, 1), TRIM, { x, y: 1.3, z: 0.52 }); }
  b.add(box(1.9, 0.1, 0.3, 0.01, 1), TRIM, { y: 1.38, z: 0.4 });
  b.add(prismTri(0.42, 0.3, 1.9), 0xefe3cb, { y: 1.52, z: 0.4, ry: Math.PI / 2 });
  b.add(sph(0.08, 8, 6), TEAL, { y: 1.78, z: 0.42 });
  // 入口大門與兩側高窗
  b.add(box(0.46, 0.7, 0.06, 0.02, 1), 0x9a6a45, { y: 0.55, z: 0.4 });
  b.add(box(0.5, 0.06, 0.08, 0, 1), TEAL, { y: 0.94, z: 0.41 });
  for (const x of [-0.62, -0.32, 0.32, 0.62]) { b.add(box(0.14, 0.5, 0.04, 0.01, 1), GLASS, { x, y: 0.74, z: 0.39, glow: 0.2 }); }
  // 圓頂（類似圖書館的穹頂）＋發光資料環
  b.add(cyl(0.5, 0.56, 0.3, 24), STONE, { y: 1.66, z: -0.25 });
  b.add(sph(0.5, 20, 12), TEAL, { y: 1.8, z: -0.25, s: [1, 0.85, 1] });
  b.add(new TorusGeometry(0.52, 0.025, 6, 28), GOLD, { rx: Math.PI / 2, y: 1.82, z: -0.25, glow: 0.7 });
  b.add(cyl(0.015, 0.015, 0.4, 6), 0x8a8f99, { y: 2.45, z: -0.25 });
  b.add(sph(0.05, 8, 6), 0xff6a5c, { y: 2.66, z: -0.25, glow: 0.8 });
  // 兩側伺服器翼樓（玻璃＋機櫃燈）
  for (const sx of [-1, 1]) {
    const x = sx * 1.1;
    b.add(box(0.7, 0.12, 1.1, 0.02, 1), TRIM, { x, y: 0.16, z: -0.15 });
    b.add(box(0.62, 0.78, 1.0, 0.03, 1), 0xd7e6ea, { x, y: 0.61, z: -0.15 });
    b.add(box(0.7, 0.07, 1.1, 0.02, 1), TEAL, { x, y: 1.04, z: -0.15 });
    b.add(box(0.5, 0.58, 0.03, 0.01, 1), 0x2f3b4a, { x, y: 0.6, z: 0.36 });
    for (let r = 0; r < 6; r++) for (let c = 0; c < 4; c++) { const on = (r * 4 + c + (sx > 0 ? 3 : 0)) % 3 !== 0; b.add(box(0.07, 0.035, 0.02, 0, 1), on ? ((r + c) % 4 ? 0x6df2a3 : 0x7fc4ff) : 0x3d4a5c, { x: x - 0.18 + c * 0.12, y: 0.4 + r * 0.075, z: 0.38, glow: on ? 0.8 : 0 }); }
  }
  // 屋頂衛星碟與太陽能板
  b.add(cyl(0.025, 0.025, 0.3, 6), 0x8a8f99, { x: 1.1, y: 1.2, z: -0.1 });
  b.add(cyl(0.2, 0.0, 0.08, 16), 0xffffff, { x: 1.1, y: 1.4, z: -0.1, rz: 0.5, rx: -0.4 });
  for (let k = 0; k < 3; k++) b.add(box(0.16, 0.02, 0.4, 0, 1), 0x3d5a8a, { x: -1.2 + k * 0.18, y: 1.12, z: -0.1, rz: 0.25 });
  // 連接管線（地面）
  b.add(box(0.06, 0.03, 0.9, 0, 1), 0xffb347, { x: -0.55, y: 0.13, z: 1.1 });
  b.add(box(0.06, 0.03, 0.9, 0, 1), 0x6df2a3, { x: 0.55, y: 0.13, z: 1.1 });
  // 前庭小物：長椅、花台、路燈
  for (const x of [-1.2, 1.2]) { b.add(box(0.5, 0.05, 0.16, 0.01, 1), 0x9a6a45, { x, y: 0.2, z: 1.25 }); b.add(box(0.5, 0.14, 0.03, 0, 1), 0x9a6a45, { x, y: 0.3, z: 1.33 }); }
  for (const [x, z] of [[-1.4, -1.4], [1.4, -1.4], [-1.4, 1.45], [1.4, 1.45]]) lamp(b, x, z);
  for (const x of [-0.4, 0.4]) { b.add(box(0.3, 0.16, 0.3, 0.03, 1), 0xd9b48a, { x, y: 0.18, z: 1.35 }); b.add(sph(0.2, 10, 8), 0x6fc07a, { x, y: 0.42, z: 1.35 }); }
  return { geo: b.build(), top: 2.9, smoke: [] };
}
