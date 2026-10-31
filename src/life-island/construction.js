// 建設中標示：工地圍欄、三角錐、告示牌與小吊車。給「建設中」的建築使用，疊在建築前面。
import { B, box, cyl } from './geo.js';

export function addSite(b, { crane = true } = {}) {
  const Y = 0xffc21a, D = 0x2c3345;
  // 前緣圍欄（黃黑斜紋用交錯色塊）
  for (let k = 0; k < 12; k++) b.add(box(0.2, 0.3, 0.04, 0, 1), k % 2 ? Y : D, { x: -1.25 + k * 0.23, y: 0.28, z: 1.46 });
  for (const sx of [-1, 1]) b.add(box(0.05, 0.4, 0.05, 0, 1), 0x8a8f99, { x: sx * 1.4, y: 0.3, z: 1.46 });
  for (const [x, z] of [[-1.35, 1.25], [1.35, 1.25]]) { b.add(cyl(0.01, 0.1, 0.22, 8), 0xff6a2a, { x, y: 0.22, z }); b.add(cyl(0.07, 0.07, 0.02, 8), 0xffffff, { x, y: 0.2, z }); }
  // 告示牌「建設中」
  b.add(cyl(0.02, 0.02, 0.5, 6), 0x8a8f99, { x: 1.2, y: 0.38, z: 1.3 }); b.add(box(0.42, 0.26, 0.03, 0.01, 1), Y, { x: 1.2, y: 0.72, z: 1.3 }); b.add(box(0.3, 0.05, 0.02, 0, 1), D, { x: 1.2, y: 0.76, z: 1.33 }); b.add(box(0.2, 0.04, 0.02, 0, 1), D, { x: 1.2, y: 0.68, z: 1.33 });
  if (crane) {   // 後角小吊車
    b.add(box(0.22, 0.1, 0.22, 0.01, 1), Y, { x: -1.3, y: 0.15, z: -1.3 });
    b.add(box(0.08, 1.2, 0.08, 0, 1), Y, { x: -1.3, y: 0.75, z: -1.3 });
    b.add(box(1.4, 0.06, 0.06, 0, 1), Y, { x: -0.7, y: 1.4, z: -1.3 }); b.add(box(0.3, 0.06, 0.06, 0, 1), D, { x: -1.55, y: 1.4, z: -1.3 });
    b.add(cyl(0.006, 0.006, 0.4, 4), D, { x: -0.1, y: 1.2, z: -1.3 }); b.add(box(0.12, 0.08, 0.12, 0.01, 1), 0xff6a2a, { x: -0.1, y: 0.98, z: -1.3 });
  }
}

// ---- 專案建築共用的階段零件。吊臂與驚嘆號拆開，場景才轉得動、跳得動。----

export function addScaffold(b, tint) {
  const pole = tint(0x8b929c), deck = tint(0xd5d8de);
  b.add(box(2.5, 0.08, 2.5, 0.02, 1), tint(0xd9d4cb), { y: 0.1 });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.add(box(0.07, 1.35, 0.07, 0.01, 1), pole, { x: sx * 0.72, y: 0.78, z: sz * 0.72 });
  for (const z of [-0.72, 0.72]) b.add(box(1.5, 0.045, 0.05, 0, 1), pole, { y: 0.7, z });
  for (const x of [-0.72, 0.72]) b.add(box(0.05, 0.045, 1.5, 0, 1), pole, { x, y: 1.2 });
  b.add(box(1.35, 0.04, 1.35, 0.01, 1), deck, { y: 0.46 });
  b.add(box(1.15, 0.28, 0.9, 0.04, 1), tint(0xc8c4bc), { y: 0.28 });
}

export function addFence(b, tint) {
  const Y = tint(0xffc21a), D = tint(0x2c3345);
  for (let k = 0; k < 12; k++) b.add(box(0.2, 0.3, 0.04, 0, 1), k % 2 ? Y : D, { x: -1.25 + k * 0.23, y: 0.28, z: 1.46 });
  for (const sx of [-1, 1]) b.add(box(0.05, 0.4, 0.05, 0, 1), tint(0x8a8f99), { x: sx * 1.4, y: 0.3, z: 1.46 });
  for (const [x, z] of [[-1.35, 1.25], [1.35, 1.25]]) {
    b.add(cyl(0.01, 0.1, 0.22, 8), tint(0xff6a2a), { x, y: 0.22, z });
    b.add(cyl(0.07, 0.07, 0.02, 8), tint(0xffffff), { x, y: 0.2, z });
  }
  b.add(cyl(0.02, 0.02, 0.5, 6), tint(0x8a8f99), { x: 1.2, y: 0.38, z: 1.3 });
  b.add(box(0.42, 0.26, 0.03, 0.01, 1), Y, { x: 1.2, y: 0.72, z: 1.3 });
  b.add(box(0.3, 0.05, 0.02, 0, 1), D, { x: 1.2, y: 0.76, z: 1.33 });
  b.add(box(0.2, 0.04, 0.02, 0, 1), D, { x: 1.2, y: 0.68, z: 1.33 });
}

export function addFlag(b, color, x, y, z) {
  b.add(cyl(0.02, 0.02, 0.72, 6), 0xf7f4ee, { x, y: y + 0.36, z });
  b.add(box(0.38, 0.22, 0.03, 0.01, 1), color, { x: x + 0.2, y: y + 0.58, z });
}

// 桅杆在原點，吊臂的原點在桅杆頂，場景繞 Y 慢慢轉。
export function craneGeos(tint, mastH) {
  const H = Math.max(1.15, mastH || 1.15);
  const mast = new B(), jib = new B();
  const Y = tint(0xffc21a), D = tint(0x2c3345);
  mast.add(box(0.28, 0.1, 0.28, 0.02, 1), Y, { y: 0.08 });
  mast.add(box(0.09, H, 0.09, 0, 1), Y, { y: H / 2 + 0.12 });
  mast.add(box(0.2, 0.14, 0.2, 0.02, 1), D, { y: H + 0.16 });
  jib.add(box(1.55, 0.06, 0.07, 0, 1), Y, { x: 0.55 });
  jib.add(box(0.42, 0.06, 0.08, 0, 1), D, { x: -0.32 });
  jib.add(box(0.02, 0.48, 0.02, 0, 1), D, { x: 1.15, y: -0.26 });
  jib.add(box(0.14, 0.1, 0.12, 0.02, 1), tint(0xff6a2a), { x: 1.15, y: -0.52 });
  return { mastGeo: mast.build(), jibGeo: jib.build(), jibY: H + 0.2 };
}

export function alertGeo(color) {
  const b = new B();
  b.add(box(0.4, 0.86, 0.06, 0.08, 1), 0xffffff, { y: 0.08, z: -0.03 });
  b.add(box(0.16, 0.42, 0.08, 0.03, 1), color, { y: 0.22 });
  b.add(box(0.16, 0.16, 0.08, 0.04, 2), color, { y: -0.16 });
  return b.build();
}
