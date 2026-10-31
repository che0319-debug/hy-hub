// 川泱購物：橘色圓角商場。階段零件（鷹架、圍欄、吊車、旗、驚嘆號）由 construction.js 提供，這裡只負責商店外殼。
import { Color } from 'three';
import { B, box, cyl, sph } from './geo.js';
import { lamp } from './props.js';
import { addFence, addFlag, addScaffold, addSite, alertGeo, craneGeos } from './construction.js';
import { placeholderParts } from './projectBuilding.mjs';

const ORG = 0xff9a4d, ORG2 = 0xffb878, TRIM = 0xfff6e6, DARK = 0x2c3345;
const CZ = -0.32, FLOOR_H = 0.48, HALF_H = 0.36;
const _tint = new Color(), _grey = new Color(0xc5c8ce);

export function tint(hex, desat) {
  if (!desat || typeof hex !== 'number') return hex;
  _tint.set(hex);
  const g = (_tint.r + _tint.g + _tint.b) / 3;
  _tint.r += (g - _tint.r) * 0.82;
  _tint.g += (g - _tint.g) * 0.82;
  _tint.b += (g - _tint.b) * 0.82;
  _tint.lerp(_grey, 0.28);
  return _tint.getHex();
}

function addShopBody(b, parts, col) {
  const half = !!parts.half;
  // 待審、完成、待決定的樓層數就是已完成數，可以是 0。有屋頂時仍畫一整層，旗子才有地方站。
  const floors = half ? 1 : Math.max(parts.roof ? 1 : 0, parts.floors || 0);
  if (!floors) return 0.22;
  b.add(box(2.45, 0.1, 1.85, 0.02, 1), col(0xe6dccb), { y: 0.16, z: CZ });
  let y = 0.22;
  for (let i = 0; i < floors; i++) {
    const h = half ? HALF_H : FLOOR_H;
    b.add(box(2.2, h, 1.58, i === 0 ? 0.08 : 0.05, 2), col(i % 2 ? ORG2 : ORG), { y: y + h / 2, z: CZ });
    if (!half) b.add(box(2.28, 0.045, 1.66, 0.01, 1), col(TRIM), { y: y + h - 0.01, z: CZ });
    const winGlow = parts.lit ? 1.7 : 0;
    const win = parts.lit ? 0xffe08a : 0xb7e3f5;
    if (half) {
      b.add(box(0.72, 0.18, 0.05, 0.01, 1), col(0xd9d3c8), { y: y + h * 0.45, z: CZ + 0.8 });
    } else if (i === 0) {
      b.add(box(0.78, 0.5, 0.06, 0.02, 1), col(TRIM), { y: y + 0.32, z: CZ + 0.8 });
      b.add(cyl(0.39, 0.39, 0.06, 18), col(TRIM), { y: y + 0.56, z: CZ + 0.8, rx: Math.PI / 2 });
      b.add(box(0.58, 0.46, 0.04, 0.01, 1), win, { y: y + 0.3, z: CZ + 0.84, glow: winGlow });
      b.add(cyl(0.29, 0.29, 0.04, 18), win, { y: y + 0.54, z: CZ + 0.84, rx: Math.PI / 2, glow: winGlow });
      for (const sx of [-1, 1]) for (let k = 0; k < 2; k++) {
        const x = sx * (0.72 + k * 0.28);
        b.add(box(0.2, 0.32, 0.04, 0.01, 1), win, { x, y: y + 0.32, z: CZ + 0.8, glow: winGlow });
      }
      for (let k = 0; k < 3; k++) b.add(box(0.7, 0.045, 0.22, 0.01, 1), col(0xf0e6d2), { y: 0.12 + k * 0.035, z: CZ + 1.02 + (2 - k) * 0.1 });
    } else {
      for (let k = 0; k < 5; k++) b.add(box(0.26, 0.22, 0.04, 0.01, 1), win, { x: -0.8 + k * 0.4, y: y + h * 0.55, z: CZ + 0.8, glow: winGlow });
    }
    y += h;
  }
  if (half || !parts.roof) b.add(box(2.24, 0.05, 1.62, 0.01, 1), col(0xb7b2a8), { y: y + 0.03, z: CZ });
  return y;
}

function addSign(b, col, y) {
  b.add(box(0.52, 0.5, 0.2, 0.04, 2), col(0xe2564f), { y: y + 0.36, z: CZ });
  b.add(box(0.52, 0.05, 0.2, 0.02, 1), col(0xb83e38), { y: y + 0.12, z: CZ });
  for (const sx of [-1, 1]) b.add(cyl(0.012, 0.012, 0.24, 4), col(0xffffff), { x: sx * 0.1, y: y + 0.72, z: CZ, rz: sx * 0.3 });
  b.add(sph(0.05, 6, 5), col(0xffffff), { y: y + 0.42, z: CZ + 0.12 });
  b.add(box(0.28, 0.045, 0.02, 0, 1), col(0xffffff), { y: y + 0.5, z: CZ + 0.12 });
  return y + 0.86;
}

// parts 來自 stageParts。回傳的吊車與驚嘆號不併進主體，場景才會轉、才會跳。
export function makeShop(parts) {
  const p = parts || placeholderParts();
  const col = hex => tint(hex, !!p.desaturate);
  const b = new B();
  b.add(box(3.0, 0.1, 3.0, 0.02, 1), col(0xe9e0d0), { y: 0.05 });
  let top = 0.16;
  if (p.scaffold) { addScaffold(b, col); top = 1.5; }
  let bodyTop = 0.22;
  if (p.body) bodyTop = addShopBody(b, p, col);
  if (p.fence) addFence(b, col);
  if (p.roof) {
    b.add(box(2.36, 0.08, 1.74, 0.02, 1), col(TRIM), { y: bodyTop + 0.05, z: CZ });
    top = Math.max(top, bodyTop + 0.1);
    if (p.sign) top = Math.max(top, addSign(b, col, bodyTop + 0.08));
    if (p.flag === 'blue') addFlag(b, 0x2f6bff, -0.95, bodyTop, CZ);
    if (p.flag === 'green') addFlag(b, 0x2fb36f, -0.95, bodyTop, CZ);
    if (p.flag) top = Math.max(top, bodyTop + 0.85);
  } else if (p.body) top = Math.max(top, bodyTop + 0.08);
  if (p.roof) {
    for (const [x, z, ry] of [[-0.95, 1.05, 0.3], [-0.72, 1.18, 0.1]]) b.with({ x, z, ry }, () => {
      b.add(box(0.2, 0.1, 0.14, 0.01, 1), col(0xaab0bd), { y: 0.28 });
      b.add(box(0.2, 0.02, 0.14, 0, 1), col(DARK), { y: 0.2 });
      b.add(box(0.03, 0.18, 0.14, 0, 1), col(0xaab0bd), { x: -0.1, y: 0.35 });
    });
    b.add(box(0.28, 0.16, 0.28, 0.03, 1), col(0xd9b48a), { x: 0.95, y: 0.18, z: 1.1 });
    b.add(sph(0.16, 8, 6), col(0x6fc07a), { x: 0.95, y: 0.38, z: 1.1 });
    for (const [x, z] of [[-1.45, 1.0], [1.45, -1.4]]) lamp(b, x, z);
  }
  let crane = null;
  if (p.crane) {
    // 吊車立在側面。名牌高度跟建築走，不跟著桅杆拉高。
    const built = craneGeos(col, Math.max(1.35, bodyTop + 0.55));
    crane = { ...built, x: 1.42, z: 0.15 };
  }
  let alert = null;
  if (p.alert) {
    // 有屋頂時驚嘆號站在招牌旁、朝鏡頭的那一側。沒屋頂就放在未完成的樓板上。名牌只略高過它。
    // 放在樓面偏右，避開正中的名牌。有屋頂時貼著招牌右側，不要漂到屋外。
    const y = p.roof ? bodyTop + 0.32 : Math.max(bodyTop, p.scaffold ? 1.2 : 0.35) + 0.2;
    alert = {
      geo: alertGeo(p.alert === 'red' ? 0xe5484d : 0xf2a93a),
      x: 0.55,
      y,
      z: p.roof ? -0.05 : CZ + 0.05,
      level: p.alert,
    };
    top = Math.max(top, y + (p.roof ? 0.42 : 0.5));
  }
  return { geo: b.build(), top, crane, alert, smoke: [] };
}

// 這格還沒掛上進行中專案、也沒有完工紀念時，回到改版前的川泱：兩層商場、購物袋招牌、工地圍欄與小吊車。
export function makeChuan() {
  const b = new B();
  b.add(box(3.0, 0.1, 3.0, 0.02, 1), 0xe9e0d0, { y: 0.05 });
  const z = -0.35;
  b.add(box(2.4, 0.12, 1.8, 0.02, 1), 0xe6dccb, { y: 0.16, z });
  b.add(box(2.2, 0.9, 1.6, 0.12, 2), ORG, { y: 0.67, z });
  b.add(box(2.0, 0.5, 1.4, 0.1, 2), ORG2, { y: 1.35, z });
  b.add(box(2.26, 0.06, 1.66, 0.02, 1), TRIM, { y: 1.15, z });
  b.add(box(2.06, 0.06, 1.46, 0.02, 1), TRIM, { y: 1.62, z });
  b.add(box(0.8, 0.62, 0.08, 0.02, 1), TRIM, { y: 0.5, z: z + 0.82 });
  b.add(cyl(0.4, 0.4, 0.08, 20), TRIM, { y: 0.81, z: z + 0.82, rx: Math.PI / 2 });
  b.add(box(0.6, 0.6, 0.06, 0.01, 1), 0xd6f1fb, { y: 0.49, z: z + 0.86, glow: 0.35 });
  b.add(cyl(0.3, 0.3, 0.06, 20), 0xd6f1fb, { y: 0.79, z: z + 0.86, rx: Math.PI / 2, glow: 0.35 });
  b.add(box(0.03, 0.6, 0.07, 0, 1), TRIM, { y: 0.49, z: z + 0.87 });
  for (let k = 0; k < 3; k++) b.add(box(1.0, 0.05, 0.2, 0.01, 1), 0xf0e6d2, { y: 0.14 + k * 0.04, z: z + 1.0 + (2 - k) * 0.12 });
  for (const sx of [-1, 1]) for (let k = 0; k < 2; k++) {
    const x = sx * (0.7 + k * 0.28);
    b.add(box(0.22, 0.42, 0.04, 0.01, 1), 0xa9dcf0, { x, y: 0.55, z: z + 0.82, glow: 0.2 });
    b.add(box(0.26, 0.06, 0.08, 0.01, 1), [0xe2564f, 0x4a90e2, 0x5ec38a, 0xffd34d][(k + (sx > 0 ? 2 : 0))], { x, y: 0.82, z: z + 0.84 });
  }
  for (let k = 0; k < 6; k++) b.add(box(0.22, 0.26, 0.04, 0.01, 1), 0xffe3a3, { x: -0.8 + k * 0.32, y: 1.35, z: z + 0.72, glow: 0.4 });
  b.add(box(0.5, 0.5, 0.2, 0.04, 2), 0xe2564f, { x: 0, y: 2.05, z });
  b.add(box(0.5, 0.05, 0.2, 0.02, 1), 0xb83e38, { y: 1.82, z });
  for (const sx of [-1, 1]) b.add(cyl(0.012, 0.012, 0.24, 4), 0xffffff, { x: sx * 0.1, y: 2.4, z, rz: sx * 0.3 });
  b.add(sph(0.05, 6, 5), 0xffffff, { x: 0, y: 2.1, z: z + 0.11, glow: 0.5 });
  b.add(box(0.28, 0.05, 0.02, 0, 1), 0xffffff, { y: 2.2, z: z + 0.11, glow: 0.5 });
  for (const [x, zz, ry] of [[-0.95, 1.1, 0.3], [-0.75, 1.2, 0.1]]) b.with({ x, z: zz, ry }, () => {
    b.add(box(0.2, 0.1, 0.14, 0.01, 1), 0xaab0bd, { y: 0.28 });
    b.add(box(0.2, 0.02, 0.14, 0, 1), DARK, { y: 0.2 });
    b.add(box(0.03, 0.18, 0.14, 0, 1), 0xaab0bd, { x: -0.1, y: 0.35 });
  });
  b.add(box(0.3, 0.18, 0.3, 0.03, 1), 0xd9b48a, { x: 0.95, y: 0.19, z: 1.15 });
  b.add(sph(0.18, 8, 6), 0x6fc07a, { x: 0.95, y: 0.4, z: 1.15 });
  addSite(b);
  for (const [x, zz] of [[-1.45, 1.0], [1.45, -1.45]]) lamp(b, x, zz);
  return { geo: b.build(), top: 2.6, smoke: [] };
}
