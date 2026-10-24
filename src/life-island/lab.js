// 研究院（Q 版實驗室）：圓胖的白綠色小樓、正面大圓窗（窗後有彩色燒瓶）、屋頂冒彩色泡泡的煙囪、天線、門口大燒瓶招牌。
// 正面朝 +z，佔約 3×3 格。
import { B, box, cyl, sph, cone } from './geo.js';
import { lamp } from './props.js';
import { TorusGeometry } from 'three';

const BODY = 0xeef8f3, TEAL = 0x3f9f8a, GLASS = 0x9bd8ea, WOOD = 0x9a6a45;

function flask(b, x, y, z, s, color) {
  b.add(cone(0.12 * s, 0.2 * s, 12), color, { x, y: y + 0.1 * s, z, glow: 0.35 });
  b.add(cyl(0.035 * s, 0.035 * s, 0.1 * s, 8), 0xdff3f8, { x, y: y + 0.24 * s, z, glow: 0.2 });
}

export function makeLab() {
  const b = new B();
  b.add(box(3.0, 0.1, 3.0, 0.02, 1), 0xe9e0d0, { y: 0.05 });
  // 主體：圓胖
  b.add(box(2.0, 1.2, 1.6, 0.32, 4), BODY, { y: 0.72, z: -0.25, g: [0.92, 1.02] });
  b.add(box(2.1, 0.14, 1.7, 0.07, 2), TEAL, { y: 1.36, z: -0.25 });
  b.add(box(1.7, 0.05, 1.3, 0.02, 1), 0xd9efe8, { y: 1.45, z: -0.25 });
  // 正面大圓窗
  const WZ = 0.56;
  b.add(cyl(0.52, 0.52, 0.1, 36), 0xffffff, { x: 0.1, y: 0.8, z: WZ, rx: Math.PI / 2 });
  b.add(cyl(0.45, 0.45, 0.06, 36), GLASS, { x: 0.1, y: 0.8, z: WZ + 0.04, rx: Math.PI / 2, glow: 0.4 });
  b.add(new TorusGeometry(0.5, 0.045, 8, 36), TEAL, { x: 0.1, y: 0.8, z: WZ + 0.05 });
  b.add(box(0.9, 0.04, 0.05, 0, 1), 0xffffff, { x: 0.1, y: 0.58, z: WZ + 0.08 });   // 窗內的檯面
  flask(b, -0.16, 0.6, WZ + 0.09, 1.3, 0xff7a9a); flask(b, 0.1, 0.6, WZ + 0.09, 1.6, 0x7fe0a8); flask(b, 0.36, 0.6, WZ + 0.09, 1.2, 0xffd34d);
  for (const [x, y, c] of [[-0.05, 1.0, 0xffffff], [0.22, 1.05, 0xffffff], [0.0, 1.12, 0xffffff]]) b.add(sph(0.025, 6, 5), c, { x: x + 0.1, y, z: WZ + 0.1, glow: 0.6 });
  // 門（左側）與小雨棚
  b.add(box(0.34, 0.6, 0.05, 0.03, 2), WOOD, { x: -0.78, y: 0.42, z: WZ + 0.0 });
  b.add(cyl(0.03, 0.03, 0.03, 8), 0xffd34d, { x: -0.68, y: 0.42, z: WZ + 0.04, rx: Math.PI / 2 });
  b.add(box(0.5, 0.06, 0.3, 0.02, 1), 0xff7a9a, { x: -0.78, y: 0.82, z: WZ + 0.12, rx: 0.12 });
  b.add(box(0.5, 0.04, 0.3, 0.02, 1), 0xffffff, { x: -0.78, y: 0.76, z: WZ + 0.13 });
  for (let k = 0; k < 2; k++) b.add(box(0.5 - k * 0.06, 0.05, 0.22 - k * 0.04, 0.01, 1), 0xf3ecdc, { x: -0.78, y: 0.12 + k * 0.05, z: WZ + 0.2 + (1 - k) * 0.06 });
  // 屋頂：煙囪冒彩色泡泡、天線
  b.add(cyl(0.14, 0.17, 0.55, 16), 0xd9efe8, { x: 0.65, y: 1.78, z: -0.55 });
  b.add(cyl(0.145, 0.145, 0.07, 16), 0xff7a9a, { x: 0.65, y: 1.9, z: -0.55 });
  b.add(cyl(0.17, 0.14, 0.05, 16), TEAL, { x: 0.65, y: 2.07, z: -0.55 });
  for (const [dx, y, r, c] of [[0.0, 2.2, 0.09, 0xff9fb8], [0.1, 2.38, 0.12, 0x8fe3f0], [-0.05, 2.6, 0.09, 0xffe28a], [0.08, 2.78, 0.07, 0xbdf2c8]]) b.add(sph(r, 10, 8), c, { x: 0.65 + dx, y, z: -0.55, glow: 0.55 });
  b.add(cyl(0.02, 0.02, 0.55, 6), 0x8a8f99, { x: -0.65, y: 1.7, z: -0.55 });
  b.add(cyl(0.2, 0.0, 0.07, 16), 0xffffff, { x: -0.62, y: 1.97, z: -0.55, rz: -0.55, rx: -0.2 });
  b.add(sph(0.045, 8, 6), 0xff4d4d, { x: -0.65, y: 2.0, z: -0.45, glow: 0.8 });
  // 右側外牆：管線與儲槽
  for (const [y, c] of [[0.45, 0xf08a3c], [0.7, TEAL]]) b.add(cyl(0.045, 0.045, 1.2, 8), c, { x: 1.06, y, z: -0.2, rx: Math.PI / 2 });
  b.add(cyl(0.2, 0.2, 0.5, 14), 0xd9d6cc, { x: 1.28, y: 0.38, z: -0.75 }); b.add(sph(0.2, 12, 6), 0xd9d6cc, { x: 1.28, y: 0.63, z: -0.75, s: [1, 0.6, 1] });
  // 門口大燒瓶招牌（右前方）
  b.add(cone(0.4, 0.62, 18), 0xbfe8f2, { x: 1.15, y: 0.42, z: 0.95, glow: 0.3 });
  b.add(cone(0.34, 0.36, 18), 0x6fe0a0, { x: 1.15, y: 0.3, z: 0.95, glow: 0.55 });
  b.add(cyl(0.09, 0.09, 0.26, 10), 0xdff3f8, { x: 1.15, y: 0.86, z: 0.95, glow: 0.2 });
  b.add(cyl(0.11, 0.11, 0.04, 10), 0xffffff, { x: 1.15, y: 1.0, z: 0.95 });
  for (const [x, y, r] of [[1.08, 0.5, 0.045], [1.22, 0.42, 0.06], [1.14, 0.62, 0.035]]) b.add(sph(r, 6, 5), 0xffffff, { x, y, z: 1.2, glow: 0.7 });
  // 前庭：小桌＋燒杯、長椅、盆栽、路燈
  b.add(box(0.5, 0.05, 0.3, 0.01, 1), WOOD, { x: -0.6, y: 0.3, z: 1.1 }); for (const sx of [-1, 1]) b.add(box(0.04, 0.2, 0.04, 0, 1), WOOD, { x: -0.6 + sx * 0.2, y: 0.18, z: 1.1 });
  b.add(cyl(0.05, 0.045, 0.1, 8), 0xff9fb0, { x: -0.7, y: 0.38, z: 1.1, glow: 0.2 }); b.add(cyl(0.05, 0.045, 0.1, 8), 0x9ed0ff, { x: -0.52, y: 0.38, z: 1.1, glow: 0.2 });
  for (const x of [-0.25, 0.35]) { b.add(box(0.3, 0.16, 0.3, 0.03, 1), 0xd9b48a, { x, y: 0.18, z: 1.3 }); b.add(sph(0.2, 10, 8), 0x6fc07a, { x, y: 0.42, z: 1.3 }); }
  for (const [x, z] of [[-1.4, -1.4], [1.4, -1.4], [-1.4, 1.45], [1.4, 1.45]]) lamp(b, x, z);
  return { geo: b.build(), top: 3.0, smoke: [] };
}
