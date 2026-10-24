// 戰略盤：巨型棋盤沙盤。圓角高台上放一張 8×8 棋盤，兩軍棋子與旗幟，周圍有欄杆、地圖卷軸與台階。
// 正面朝 +z，佔 3×3 格。
import { B, box, cyl, sph, cone } from './geo.js';
import { lamp } from './props.js';

const WOOD = 0x9a6a45, WOODD = 0x6f4b32, LIGHT = 0xf3e2bb, DARKSQ = 0xb97f4f, RED = 0xe2564f, BLUE = 0x4f7fe2, GOLD = 0xffb347;

function pawn(b, x, z, c) { b.add(cyl(0.07, 0.09, 0.05, 10), c, { x, y: 0.0, z }); b.add(cone(0.06, 0.16, 10), c, { x, y: 0.1, z }); b.add(sph(0.05, 8, 6), c, { x, y: 0.2, z }); }
function king(b, x, z, c) { b.add(cyl(0.09, 0.11, 0.06, 12), c, { x, y: 0.02, z }); b.add(cyl(0.05, 0.08, 0.26, 10), c, { x, y: 0.18, z }); b.add(sph(0.07, 8, 6), c, { x, y: 0.36, z }); b.add(box(0.03, 0.12, 0.03, 0, 1), GOLD, { x, y: 0.5, z }); b.add(box(0.1, 0.03, 0.03, 0, 1), GOLD, { x, y: 0.51, z }); }
function rook(b, x, z, c) { b.add(cyl(0.09, 0.1, 0.22, 10), c, { x, y: 0.1, z }); for (let k = 0; k < 4; k++) b.add(box(0.04, 0.05, 0.04, 0, 1), c, { x: x + (k % 2 ? 0.05 : -0.05), y: 0.24, z: z + (k < 2 ? 0.05 : -0.05) }); }

export function makeBoard() {
  const b = new B();
  b.add(box(3.0, 0.1, 3.0, 0.02, 1), 0xe9e0d0, { y: 0.05 });
  // 台階與高台
  for (let k = 0; k < 3; k++) b.add(box(1.4 - k * 0.1, 0.07, 0.3, 0.01, 1), 0xf0e6d2, { y: 0.14 + k * 0.07, z: 1.5 - k * 0.08 - 0.15 });
  b.add(box(2.7, 0.22, 2.4, 0.08, 2), 0xe8dcc4, { y: 0.2, z: 0.05 });
  b.add(box(2.58, 0.04, 2.28, 0.03, 1), WOODD, { y: 0.33, z: 0.05 });
  // 8×8 棋盤
  const S = 0.26, X0 = -S * 3.5, Z0 = 0.05 - S * 3.5, Y = 0.37;
  for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) b.add(box(S * 0.98, 0.03, S * 0.98, 0, 1), (i + j) % 2 ? DARKSQ : LIGHT, { x: X0 + i * S, y: Y, z: Z0 + j * S });
  b.add(box(S * 8.4, 0.05, S * 8.4, 0.01, 1), WOODD, { y: Y - 0.025, z: 0.05 });
  const base = Y + 0.02;
  // 兩軍：紅在後（上方）、藍在前（下方）
  b.with({ y: base }, () => {
    for (let i = 0; i < 8; i++) { pawn(b, X0 + i * S, Z0 + 1 * S, RED); pawn(b, X0 + i * S, Z0 + 6 * S, BLUE); }
    rook(b, X0, Z0, RED); rook(b, X0 + 7 * S, Z0, RED); rook(b, X0, Z0 + 7 * S, BLUE); rook(b, X0 + 7 * S, Z0 + 7 * S, BLUE);
    king(b, X0 + 4 * S, Z0, RED); king(b, X0 + 3 * S, Z0 + 7 * S, BLUE);
    pawn(b, X0 + 2 * S, Z0 + 3 * S, RED); pawn(b, X0 + 5 * S, Z0 + 4 * S, BLUE);
  });
  // 沙丘與旗幟：棋盤中央一座小沙丘，插兩面旗
  b.add(sph(0.22, 12, 8), 0xe6cf9a, { x: 0.0, y: base + 0.02, z: 0.05, s: [1.4, 0.45, 1.4] });
  b.add(cyl(0.012, 0.012, 0.45, 6), 0x8a8f99, { x: -0.06, y: base + 0.24, z: 0.05 }); b.add(box(0.2, 0.12, 0.012, 0, 1), RED, { x: 0.04, y: base + 0.42, z: 0.05 });
  b.add(cyl(0.012, 0.012, 0.38, 6), 0x8a8f99, { x: 0.12, y: base + 0.2, z: 0.1 }); b.add(box(0.18, 0.1, 0.012, 0, 1), BLUE, { x: 0.21, y: base + 0.36, z: 0.1 });
  // 周圍欄杆（柱＋繩）
  for (let k = 0; k <= 6; k++) { const t = -1.3 + k * (2.6 / 6); for (const z of [-1.1, 1.2]) b.add(cyl(0.03, 0.035, 0.28, 8), WOODD, { x: t, y: 0.46, z }); }
  for (const x of [-1.3, 1.3]) for (let k = 1; k < 6; k++) b.add(cyl(0.03, 0.035, 0.28, 8), WOODD, { x, y: 0.46, z: -1.1 + k * (2.3 / 6) });
  for (const z of [-1.1, 1.2]) b.add(box(2.6, 0.03, 0.03, 0, 1), GOLD, { y: 0.58, z });
  for (const x of [-1.3, 1.3]) b.add(box(0.03, 0.03, 2.3, 0, 1), GOLD, { x, y: 0.58, z: 0.05 });
  // 四角旗杆
  for (const [x, z, c] of [[-1.3, -1.1, RED], [1.3, -1.1, RED], [-1.3, 1.2, BLUE], [1.3, 1.2, BLUE]]) { b.add(cyl(0.025, 0.03, 0.9, 8), 0x8a8f99, { x, y: 0.75, z }); b.add(box(0.26, 0.16, 0.015, 0, 1), c, { x: x + 0.14, y: 1.12, z }); b.add(sph(0.04, 8, 6), GOLD, { x, y: 1.22, z }); }
  // 地圖卷軸立牌、路燈
  b.with({ x: 1.28, z: 1.38, ry: -0.5 }, () => { for (const sx of [-1, 1]) b.add(box(0.03, 0.6, 0.03, 0, 1), WOODD, { x: sx * 0.22, y: 0.4 }); b.add(box(0.5, 0.36, 0.03, 0.01, 1), 0xf7ebcf, { y: 0.55 }); b.add(box(0.42, 0.02, 0.01, 0, 1), 0x7fa8d0, { y: 0.6, z: 0.02 }); b.add(box(0.3, 0.02, 0.01, 0, 1), 0xd9694a, { y: 0.52, z: 0.02 }); });
  for (const [x, z] of [[-1.4, -1.45], [1.4, -1.45], [-1.45, 1.45]]) lamp(b, x, z);
  return { geo: b.build(), top: 1.5, smoke: [] };
}
