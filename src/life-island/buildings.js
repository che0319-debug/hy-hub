import { Color } from 'three';
import { B, box, cyl, sph, cone, prismTri, rng } from './geo.js';
import { TorusGeometry, CylinderGeometry } from 'three';

const TRIM = 0xfffaf0, WOOD = 0x9b6a45, WOOD_D = 0x7a4d33, STONE = 0xdcd2c2, BRICK = 0xd98f72, GOLD = 0xf6c453;
export const WALLS = [0xfff1d8, 0xffe4d2, 0xe9f7dc, 0xfff0bd, 0xffe6ec, 0xf6f6d6];
export const ROOFS = {
  research: [0x5a8fe0, 0x4aa8c9, 0x6a86e0],
  business: [0xf27b66, 0xf59a4a, 0xee6f7e],
  proposal: [0x9a82dc, 0xc383d6, 0x8a8be0],
  system: [0x3fb89f, 0x57c28a, 0x2fb1b8]
};
const tor = (r, t, arc = Math.PI * 2) => new TorusGeometry(r, t, 6, 20, arc);

function windowPiece(b, x, y, z, ry = 0, w = 0.2, h = 0.24, flower = false) {
  b.with({ x, y, z, ry }, () => {
    b.add(box(w + 0.08, h + 0.08, 0.05, 0.03, 1), TRIM);
    b.add(box(w, h, 0.06, 0.02, 1), 0xffffff, { glow: 1, z: 0.006 });
    b.add(box(0.022, h, 0.075, 0.01, 1), TRIM, { z: 0.004 });
    b.add(box(w, 0.022, 0.075, 0.01, 1), TRIM, { z: 0.004 });
    if (flower) {
      b.add(box(w + 0.12, 0.07, 0.1, 0.025, 1), WOOD, { y: -h / 2 - 0.08, z: 0.05 });
      b.add(sph(0.045, 8, 6), 0x79c98a, { x: -0.07, y: -h / 2 - 0.03, z: 0.06 });
      b.add(sph(0.045, 8, 6), 0x79c98a, { x: 0.07, y: -h / 2 - 0.03, z: 0.06 });
      b.add(sph(0.03, 8, 6), 0xff8fa8, { x: -0.04, y: -h / 2 - 0.0, z: 0.08 });
      b.add(sph(0.03, 8, 6), 0xffd35c, { x: 0.05, y: -h / 2 + 0.0, z: 0.08 });
    }
  });
}
function archWindow(b, x, y, z, ry = 0, w = 0.2, h = 0.3) {
  b.with({ x, y, z, ry }, () => {
    b.add(box(w + 0.08, h - w / 2, 0.05, 0.02, 1), TRIM, { y: -w / 4 });
    b.add(cyl((w + 0.08) / 2, (w + 0.08) / 2, 0.05, 14), TRIM, { rx: Math.PI / 2, y: (h - w / 2) / 2 - w / 4 });
    b.add(box(w, h - w / 2, 0.06, 0.015, 1), 0xffffff, { glow: 1, y: -w / 4, z: 0.006 });
    b.add(cyl(w / 2, w / 2, 0.06, 14), 0xffffff, { glow: 1, rx: Math.PI / 2, y: (h - w / 2) / 2 - w / 4, z: 0.006 });
    b.add(box(0.02, h, 0.075, 0.008, 1), TRIM, { z: 0.004 });
  });
}
function door(b, x, w = 0.27, h = 0.42, col = WOOD_D, z = 0, ry = 0, y0 = 0.1) {
  b.with({ x, y: y0, z, ry }, () => {
    b.add(box(w + 0.08, h - w / 2 + 0.04, 0.05, 0.02, 1), TRIM, { y: (h - w / 2) / 2 });
    b.add(cyl((w + 0.08) / 2, (w + 0.08) / 2, 0.05, 14), TRIM, { rx: Math.PI / 2, y: h - w / 2 });
    b.add(box(w, h - w / 2, 0.07, 0.02, 1), col, { y: (h - w / 2) / 2, z: 0.005 });
    b.add(cyl(w / 2, w / 2, 0.07, 14), col, { rx: Math.PI / 2, y: h - w / 2, z: 0.005 });
    b.add(sph(0.02, 8, 6), GOLD, { x: w * 0.28, y: h * 0.42, z: 0.045 });
    b.add(box(w + 0.16, 0.05, 0.2, 0.02, 1), STONE, { y: 0.02, z: 0.1 });
  });
}
// gable roof (ridge along x). returns ridge y
function gable(b, w, d, yT, col, colDark, a = 0.62, over = 0.16, sideOver = 0.12, wall = WALLS[0]) {
  const ta = Math.tan(a), ca = Math.cos(a), sa = Math.sin(a);
  const rise = (d / 2) * ta, yR = yT + rise + 0.05, t = 0.09, wS = (d / 2 + over) / ca, L = w + sideOver * 2;
  for (const s of [1, -1]) {
    const zc = (wS / 2) * ca, yc = yR - (wS / 2) * sa + 0.02;
    b.add(box(L, t, wS, 0.04, 2), col, { y: yc, z: s * zc, rx: s * a, g: [0.9, 1.06] });
  }
  b.add(cyl(0.06, 0.06, L + 0.02, 10), colDark, { rz: Math.PI / 2, y: yR + 0.03 });
  b.add(prismTri(d - 0.02, rise + 0.03, w - 0.03), wall, { y: yT - 0.01 });
  return yR;
}
function chimney(b, x, z, yBase, hgt) {
  b.add(box(0.17, hgt, 0.17, 0.03, 1), BRICK, { x, y: yBase + hgt / 2, z, g: [0.9, 1] });
  b.add(box(0.22, 0.05, 0.22, 0.02, 1), 0x8f6b5c, { x, y: yBase + hgt + 0.01, z });
  return { x, y: yBase + hgt + 0.06, z };
}
function sign(b, x, z, col, ry = 0) {
  b.with({ x, z, ry }, () => {
    b.add(cyl(0.025, 0.025, 0.44, 8), WOOD_D, { y: 0.22 });
    b.add(box(0.3, 0.2, 0.04, 0.03, 1), col, { y: 0.38, z: 0.03 });
    b.add(box(0.24, 0.13, 0.05, 0.02, 1), TRIM, { y: 0.38, z: 0.035 });
    b.add(sph(0.035, 8, 6), col, { y: 0.38, z: 0.065 });
  });
}
function flowerPot(b, x, z, c) {
  b.add(cyl(0.05, 0.04, 0.07, 8), 0xe0906a, { x, y: 0.035, z });
  b.add(sph(0.06, 8, 6), 0x7fcf8c, { x, y: 0.09, z });
  b.add(sph(0.035, 8, 6), c, { x: x + 0.02, y: 0.14, z });
}

// ---- forms (local: +z is the front, y up, origin at ground centre). returns {geo, top, smoke:[], beam}
function house(it, k, R, roofCol, wallCol) {
  const b = new B(), w = 1.14 + R() * 0.08, d = 0.95, two = k > 0.5;
  const dk = new Color(roofCol).multiplyScalar(0.75);
  b.add(box(w + 0.1, 0.11, d + 0.1, 0.04), STONE, { y: 0.055 });
  const h1 = two ? 0.6 : 0.62 + 0.2 * k;
  b.add(box(w, h1, d, 0.07), wallCol, { y: 0.11 + h1 / 2, g: [0.88, 1] });
  let yT = 0.11 + h1, w2 = w, d2 = d;
  windowPiece(b, w * 0.24, 0.11 + h1 * 0.55, d / 2 + 0.01, 0, 0.2, 0.22, true);
  windowPiece(b, w / 2 + 0.01, 0.11 + h1 * 0.58, 0, Math.PI / 2, 0.2, 0.22);
  windowPiece(b, -w / 2 - 0.01, 0.11 + h1 * 0.58, 0, -Math.PI / 2, 0.2, 0.22);
  door(b, -w * 0.2, 0.26, 0.42, WOOD_D, d / 2);
  if (two) {
    w2 = w * 0.86; d2 = d * 0.84;
    b.add(box(w + 0.1, 0.07, d + 0.1, 0.03), TRIM, { y: yT + 0.0 });
    const h2 = 0.5; b.add(box(w2, h2, d2, 0.07), wallCol, { y: yT + h2 / 2, g: [0.9, 1], z: -0.03 });
    windowPiece(b, -w2 * 0.2, yT + h2 * 0.55, d2 / 2 - 0.03 + 0.01, 0, 0.2, 0.22);
    windowPiece(b, w2 * 0.2, yT + h2 * 0.55, d2 / 2 - 0.03 + 0.01, 0, 0.2, 0.22, true);
    windowPiece(b, w2 / 2 + 0.01, yT + h2 * 0.55, -0.03, Math.PI / 2, 0.2, 0.22);
    // little balcony over the door
    b.add(box(0.5, 0.05, 0.22, 0.02, 1), WOOD, { x: -w * 0.2, y: yT + 0.02, z: d / 2 + 0.08 });
    for (const sx of [-1, 1]) b.add(cyl(0.015, 0.015, 0.12, 6), TRIM, { x: -w * 0.2 + sx * 0.22, y: yT + 0.1, z: d / 2 + 0.17 });
    b.add(box(0.46, 0.025, 0.025, 0.01, 1), TRIM, { x: -w * 0.2, y: yT + 0.16, z: d / 2 + 0.17 });
    yT += h2;
  }
  const yR = gable(b, w2, d2, yT, roofCol, dk, 0.62, 0.16, 0.12, wallCol);
  // attic round window on the gable
  b.add(cyl(0.07, 0.07, 0.06, 12), TRIM, { rz: Math.PI / 2, x: w2 / 2 + 0.01, y: yT + 0.14 });
  const smoke = [];
  if (R() > 0.35) smoke.push(chimney(b, w2 * 0.28, -d2 * 0.1, yR - 0.1, 0.34));
  if (it.type === 'business') sign(b, w * 0.58, d / 2 + 0.16, roofCol, 0.0);
  else flowerPot(b, -w * 0.2 - 0.26, d / 2 + 0.18, 0xff8fa8);
  flowerPot(b, w * 0.5, d / 2 + 0.2, 0xffd35c);
  return { geo: b.build(), top: yR + 0.2, smoke };
}

function library(it, k, R, roofCol, wallCol) {
  const b = new B(), dk = new Color(roofCol).multiplyScalar(0.75), W = 1.3, D = 0.9, H = 0.6;
  b.add(box(W + 0.1, 0.11, D + 0.1, 0.04), STONE, { y: 0.055 });
  b.add(box(W, H, D, 0.07), wallCol, { y: 0.11 + H / 2, g: [0.88, 1], z: 0.05 });
  // tower
  const T = 0.62 + 0.5 + 0.8 * k, tr = 0.36, tz = -0.12;
  b.add(cyl(tr, tr + 0.02, T, 18), wallCol, { y: 0.11 + T / 2, z: tz, g: [0.86, 1.02] });
  b.add(cyl(tr + 0.06, tr + 0.06, 0.07, 18), TRIM, { y: 0.11 + T, z: tz });
  b.add(cone(tr + 0.14, 0.62, 18), roofCol, { y: 0.11 + T + 0.07 + 0.31, z: tz, g: [0.88, 1.08] });
  b.add(sph(0.045, 8, 6), GOLD, { y: 0.11 + T + 0.07 + 0.64, z: tz });
  b.add(cyl(0.012, 0.012, 0.15, 6), GOLD, { y: 0.11 + T + 0.07 + 0.72, z: tz });
  // flag
  b.add(box(0.14, 0.08, 0.012, 0.005, 1), 0xff7f6e, { x: 0.075, y: 0.11 + T + 0.07 + 0.76, z: tz });
  // clock
  b.add(cyl(0.13, 0.13, 0.05, 16), TRIM, { rx: Math.PI / 2, y: 0.11 + T * 0.78, z: tz + tr - 0.005 });
  b.add(cyl(0.1, 0.1, 0.055, 16), 0xffffff, { rx: Math.PI / 2, y: 0.11 + T * 0.78, z: tz + tr + 0.005, glow: 0 });
  b.add(box(0.015, 0.075, 0.02, 0.005, 1), 0x6b5b6e, { y: 0.11 + T * 0.78 + 0.03, z: tz + tr + 0.035 });
  b.add(box(0.06, 0.015, 0.02, 0.005, 1), 0x6b5b6e, { x: 0.025, y: 0.11 + T * 0.78, z: tz + tr + 0.035 });
  b.add(cyl(tr + 0.035, tr + 0.035, 0.06, 18), TRIM, { y: 0.11 + T * 0.58, z: tz });
  b.add(cyl(tr + 0.035, tr + 0.035, 0.06, 18), TRIM, { y: 0.11 + T * 0.94, z: tz });
  // hall roof + porch pediment
  gable(b, W, D, 0.11 + H, roofCol, dk, 0.5, 0.14, 0.1, wallCol);
  for (const sx of [-1, 1]) b.add(cyl(0.05, 0.055, H - 0.02, 10), TRIM, { x: sx * 0.34, y: 0.11 + (H - 0.02) / 2, z: D / 2 + 0.16 });
  b.add(box(0.9, 0.07, 0.3, 0.03, 1), TRIM, { y: 0.11 + H - 0.01, z: D / 2 + 0.12 });
  b.add(prismTri(0.3, 0.2, 0.9), TRIM, { y: 0.11 + H + 0.02, z: D / 2 + 0.12 });
  door(b, 0, 0.3, 0.44, 0x6b5b9e, D / 2 + 0.05);
  archWindow(b, -0.5, 0.11 + 0.32, D / 2 + 0.06, 0, 0.15, 0.26);
  archWindow(b, 0.5, 0.11 + 0.32, D / 2 + 0.06, 0, 0.15, 0.26);
  // books stack signage
  const bc = [0xff8f7a, 0xffd35c, 0x7fcf8c, 0x8ab8f0];
  for (let i = 0; i < 3; i++) b.add(box(0.26 - i * 0.02, 0.07, 0.19, 0.025, 1), bc[(i + (R() * 4 | 0)) % 4], { x: W / 2 - 0.05 + 0.2, y: 0.035 + i * 0.075, z: D / 2 + 0.1, ry: (i - 1) * 0.25 });
  return { geo: b.build(), top: 0.11 + T + 0.07 + 0.8, smoke: [] };
}

function workshop(it, k, R, roofCol, wallCol) {
  const b = new B(), dk = new Color(roofCol).multiplyScalar(0.72), W = 1.5, D = 1.05, H = 0.52 + 0.28 * k;
  b.add(box(W + 0.1, 0.11, D + 0.1, 0.04), STONE, { y: 0.055 });
  b.add(box(W, H, D, 0.07), wallCol, { y: 0.11 + H / 2, g: [0.88, 1] });
  // barrel roof
  const rr = D / 2 + 0.1, rh = 0.4;
  const bg = new CylinderGeometry(rr, rr, W + 0.2, 22, 1, false, 0, Math.PI);
  b.add(bg, roofCol, { rz: Math.PI / 2, y: 0.11 + H - 0.04, s: [rh / rr, 1, 1], g: [0.9, 1.1] });
  b.add(cyl(0.012, 0.012, 0.01, 4), roofCol, { y: 0 });
  // big door with X brace
  b.add(box(0.62, 0.5, 0.05, 0.03, 1), TRIM, { x: -0.3, y: 0.11 + 0.25, z: D / 2 + 0.005 });
  b.add(box(0.54, 0.44, 0.07, 0.02, 1), WOOD, { x: -0.3, y: 0.11 + 0.25, z: D / 2 + 0.012 });
  for (const s of [1, -1]) b.add(box(0.03, 0.62, 0.08, 0.01, 1), 0xe9d3a8, { x: -0.3, y: 0.11 + 0.25, z: D / 2 + 0.02, rz: s * 0.7 });
  // round window
  b.add(cyl(0.14, 0.14, 0.05, 16), TRIM, { rx: Math.PI / 2, x: 0.38, y: 0.11 + H * 0.58, z: D / 2 + 0.01 });
  b.add(cyl(0.1, 0.1, 0.06, 16), 0xffffff, { rx: Math.PI / 2, x: 0.38, y: 0.11 + H * 0.58, z: D / 2 + 0.016, glow: 1 });
  b.add(box(0.2, 0.02, 0.07, 0.01, 1), TRIM, { x: 0.38, y: 0.11 + H * 0.58, z: D / 2 + 0.02 });
  windowPiece(b, W / 2 + 0.01, 0.11 + H * 0.55, 0, Math.PI / 2, 0.22, 0.22);
  windowPiece(b, -W / 2 - 0.01, 0.11 + H * 0.55, 0, -Math.PI / 2, 0.22, 0.22);
  // gear sign
  b.with({ x: 0.38, y: 0.11 + H + 0.13, z: D / 2 + 0.06 }, () => {
    b.add(cyl(0.11, 0.11, 0.05, 16), 0xf5a04a, { rx: Math.PI / 2 });
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; b.add(box(0.06, 0.06, 0.05, 0.015, 1), 0xf5a04a, { x: Math.cos(a) * 0.12, y: Math.sin(a) * 0.12, rz: a }); }
    b.add(cyl(0.04, 0.04, 0.06, 10), 0xfff1d8, { rx: Math.PI / 2, z: 0.005 });
  });
  // chimney
  b.add(cyl(0.085, 0.1, 0.62, 12), BRICK, { x: -0.5, y: 0.11 + H + 0.4, z: -0.2, g: [0.9, 1] });
  b.add(cyl(0.11, 0.11, 0.05, 12), 0x8f6b5c, { x: -0.5, y: 0.11 + H + 0.72, z: -0.2 });
  // crates & barrel
  b.add(box(0.2, 0.2, 0.2, 0.03, 1), 0xc99a62, { x: 0.65, y: 0.2, z: D / 2 + 0.2, ry: 0.2 });
  b.add(box(0.15, 0.15, 0.15, 0.03, 1), 0xd9ac72, { x: 0.68, y: 0.475, z: D / 2 + 0.2, ry: -0.3 });
  b.add(cyl(0.1, 0.1, 0.22, 12), 0x8a6a8a, { x: -0.72, y: 0.22, z: D / 2 + 0.2 });
  b.add(cyl(0.105, 0.105, 0.025, 12), 0xd6c6e0, { x: -0.72, y: 0.18, z: D / 2 + 0.2 });
  b.add(cyl(0.105, 0.105, 0.025, 12), 0xd6c6e0, { x: -0.72, y: 0.28, z: D / 2 + 0.2 });
  return { geo: b.build(), top: 0.11 + H + 0.76, smoke: [{ x: -0.5, y: 0.11 + H + 0.77, z: -0.2 }] };
}

function lighthouse(it, k, R, roofCol, wallCol) {
  const b = new B(), dk = new Color(roofCol).multiplyScalar(0.75);
  const hutH = 0.4, Ht = 0.7 + 0.9 * k;
  b.add(cyl(0.64, 0.68, 0.1, 20), STONE, { y: 0.05 });
  b.add(cyl(0.56, 0.6, hutH, 20), wallCol, { y: 0.1 + hutH / 2, g: [0.88, 1] });
  b.add(cyl(0.64, 0.58, 0.07, 20), roofCol, { y: 0.1 + hutH + 0.02 });
  door(b, 0, 0.26, 0.38, WOOD_D, 0.55, 0);
  windowPiece(b, 0.32, 0.1 + hutH * 0.55, 0.46, 0.55, 0.14, 0.16);
  windowPiece(b, -0.32, 0.1 + hutH * 0.55, 0.46, -0.55, 0.14, 0.16);
  const y0 = 0.1 + hutH + 0.05, n = 3;
  for (let i = 0; i < n; i++) {
    const rb = 0.4 - i * (0.1 / n) , rt = 0.4 - (i + 1) * (0.1 / n);
    b.add(cyl(rt + 0.005, rb, Ht / n, 18), i % 2 === 0 ? 0xfff5e6 : roofCol, { y: y0 + (i + 0.5) * Ht / n, g: [0.9, 1.04] });
  }
  const yG = y0 + Ht;
  windowPiece(b, 0, y0 + Ht * 0.45, 0.34, 0, 0.12, 0.18);
  b.add(cyl(0.44, 0.38, 0.07, 18), TRIM, { y: yG + 0.02 });
  for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; b.add(cyl(0.013, 0.013, 0.13, 5), TRIM, { x: Math.cos(a) * 0.41, y: yG + 0.1, z: Math.sin(a) * 0.41 }); }
  b.add(tor(0.41, 0.014), TRIM, { rx: Math.PI / 2, y: yG + 0.16 });
  b.add(cyl(0.2, 0.2, 0.3, 14), 0xffffff, { y: yG + 0.2, glow: 1 });
  for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI * 2 + 0.78; b.add(box(0.03, 0.32, 0.03, 0.01, 1), TRIM, { x: Math.cos(a) * 0.2, y: yG + 0.2, z: Math.sin(a) * 0.2 }); }
  b.add(cyl(0.27, 0.27, 0.05, 14), roofCol, { y: yG + 0.38 });
  b.add(cone(0.27, 0.3, 14), roofCol, { y: yG + 0.55, g: [0.9, 1.08] });
  b.add(sph(0.04, 8, 6), GOLD, { y: yG + 0.72 });
  return { geo: b.build(), top: yG + 0.78, smoke: [], beam: { y: yG + 0.2 } };
}

function tent(it, k, R, roofCol, wallCol) {
  const b = new B(), c2 = 0xfff3e0, c1 = new Color(roofCol);
  const cc = [c1, new Color(c2)];
  // counter
  b.add(box(0.95, 0.34, 0.52, 0.05), WOOD, { y: 0.17 });
  b.add(box(1.0, 0.05, 0.57, 0.025), 0xe9c690, { y: 0.355 });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.add(cyl(0.03, 0.03, 0.78, 8), WOOD_D, { x: sx * 0.47, y: 0.39 + 0.0, z: sz * 0.26 });
  // striped canopy
  b.add(cone(0.78, 0.38, 8), 0xffffff, { y: 0.9 + 0.1, fn: (i) => cc[Math.floor(i / 3) % 2], g: [0.92, 1.08], ry: Math.PI / 8 });
  b.add(cyl(0.78, 0.78, 0.0001, 8), 0xffffff, { y: 0.79, fn: () => cc[0], ry: Math.PI / 8 });
  b.add(sph(0.05, 8, 6), GOLD, { y: 1.33 });
  // scallop fringe
  for (let i = 0; i < 8; i++) { const a = (i + 0.5) / 8 * Math.PI * 2; b.add(sph(0.085, 8, 6), cc[i % 2], { x: Math.sin(a) * 0.72, y: 0.8, z: Math.cos(a) * 0.72, s: [1, 0.7, 1] }); }
  // goods
  const fruit = [0xff7a6b, 0xffc24a, 0xa5d86e, 0xff9ec0];
  for (let i = 0; i < 6; i++) b.add(sph(0.065, 10, 8), fruit[(i + (R() * 4 | 0)) % 4], { x: -0.32 + i * 0.13, y: 0.43, z: 0.03 + (i % 2) * 0.1 });
  b.add(box(0.26, 0.14, 0.2, 0.03, 1), 0xc99a62, { x: 0.62, y: 0.07, z: 0.5, ry: 0.3 });
  b.add(sph(0.07, 8, 6), 0xffc24a, { x: 0.62, y: 0.2, z: 0.5 });
  // front sign board
  b.add(box(0.5, 0.12, 0.04, 0.02, 1), TRIM, { y: 0.28, z: 0.3 });
  b.add(box(0.44, 0.07, 0.05, 0.02, 1), c1, { y: 0.28, z: 0.31 });
  // lantern
  b.add(sph(0.055, 8, 6), 0xffffff, { x: 0.47, y: 0.74, z: 0.26, glow: 2 });
  b.add(sph(0.055, 8, 6), 0xffffff, { x: -0.47, y: 0.74, z: 0.26, glow: 2 });
  return { geo: b.build(), top: 1.4, smoke: [] };
}

export const FORMS = { house, library, workshop, lighthouse, tent };
export function makeBuilding(item, idx) {
  const R = rng(1000 + idx * 77);
  const k = Math.max(0, Math.min(1, (item.height - 1) / 2.6));
  const rc = ROOFS[item.type] || ROOFS.system;
  const roofCol = rc[idx % rc.length];
  const wallCol = item.form === 'lighthouse' ? 0xfff5e6 : WALLS[(idx * 5 + 1) % WALLS.length];
  return FORMS[item.form](item, k, R, roofCol, wallCol);
}
