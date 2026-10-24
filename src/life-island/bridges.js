// 橋與船：中央島用拱橋連到四座外島，海上有幾艘帆船慢慢漂。
import { Group, Mesh } from 'three';
import { B, box, cyl, sph, prismTri } from './geo.js';

// 找兩座島之間最近的一對馬路格子，當作橋的兩端
function endpoints(a, b, isRoad) {
  let best = null;
  const roadCells = isl => [...isl.cells.values()].filter(c => isRoad(c.i, c.j)).map(c => [c.i + isl.c[0], c.j + isl.c[1]]);
  const A = roadCells(a), Bc = roadCells(b);
  for (const p of A) for (const q of Bc) { const d = Math.hypot(p[0] - q[0], p[1] - q[1]); if (!best || d < best.d) best = { d, p, q }; }
  return best;
}

export function buildBridges(b, islands, isRoad) {
  const central = islands.find(i => i.id === 'central'), list = [];
  for (const isl of islands) {
    if (isl.deco || isl.id === 'central' || !isl.cells) continue;
    const e = endpoints(central, isl, isRoad); if (!e) continue;
    let [ax, az] = e.p, [bx, bz] = e.q;
    const dx = bx - ax, dz = bz - az, L0 = Math.hypot(dx, dz), ux = dx / L0, uz = dz / L0;
    ax -= ux * 0.4; az -= uz * 0.4; bx += ux * 0.4; bz += uz * 0.4;   // 兩端伸進陸地裡
    const L = Math.hypot(bx - ax, bz - az), yaw = Math.atan2(bx - ax, bz - az), N = Math.max(6, Math.ceil(L / 0.55));
    const hy = t => 0.04 + 0.45 * Math.sin(Math.PI * t);
    for (let k = 0; k < N; k++) {
      const t0 = k / N, t1 = (k + 1) / N, tm = (t0 + t1) / 2, seg = L / N;
      const x = ax + (bx - ax) * tm, z = az + (bz - az) * tm, y = hy(tm), pitch = -Math.atan2(hy(t1) - hy(t0), seg);
      b.with({ x, y, z, ry: yaw }, () => {
        b.add(box(1.15, 0.1, seg * 1.08, 0.015, 1), 0xece3d2, { y: -0.02, rx: pitch, g: [0.95, 1] });
        b.add(box(0.9, 0.02, seg * 1.04, 0, 1), 0xc3c7cc, { y: 0.04, rx: pitch });
        if (k % 4 === 2) b.add(box(0.05, 0.02, 0.5, 0, 1), 0xffffff, { y: 0.056, rx: pitch });
        for (const sx of [-1, 1]) {
          b.add(box(0.05, 0.05, seg * 1.05, 0, 1), 0x9a6a45, { x: sx * 0.54, y: 0.24, rx: pitch });
          b.add(box(0.07, 0.25, 0.07, 0.01, 1), 0xf3ead8, { x: sx * 0.54, y: 0.14, z: 0 });
          if (k % 3 === 1) b.add(sph(0.075, 8, 6), 0xffe3a3, { x: sx * 0.54, y: 0.36, z: 0, glow: 1.0 });
        }
      });
    }
    // 橋墩
    for (const t of [0.3, 0.7]) { const x = ax + (bx - ax) * t, z = az + (bz - az) * t; b.add(cyl(0.16, 0.2, 1.2, 10), 0xdcd2c2, { x, y: hy(t) - 0.6, z }); }
    list.push({ id: isl.id, a: [ax, az], b: [bx, bz] });
  }
  return list;
}

function sailboat(b, c) {
  b.add(box(0.5, 0.12, 1.1, 0.04, 1), 0xf7f1e4, { y: 0.0 }); b.add(box(0.52, 0.04, 1.12, 0.02, 1), c, { y: 0.07 });
  b.add(prismTri(0.3, 0.1, 0.5), 0xf7f1e4, { z: 0.78, y: -0.05 });
  b.add(cyl(0.025, 0.03, 1.5, 6), 0x9a6a45, { y: 0.8, z: 0.05 });
  b.add(prismTri(0.04, 1.2, 0.8), 0xffffff, { x: 0, y: 0.2, z: -0.28, ry: 0 });
  b.add(box(0.025, 0.7, 0.55, 0, 1), 0xffffff, { y: 0.9, z: -0.3 });
  b.add(box(0.025, 0.45, 0.35, 0, 1), c, { y: 1.0, z: 0.4 });
}

// 幾艘帆船在海面上慢慢繞圈；spots 是水面上確認沒有島的位置
export function makeBoats(matToon, matOL, spots) {
  const g = new Group(), boats = [];
  spots.forEach(([x, z, c, rx, rz, sp], i) => {
    const b = new B(); sailboat(b, c);
    const m = new Mesh(b.build(), matToon); m.castShadow = true; const h = new Group(); h.add(m); h.scale.setScalar(1.5); g.add(h);
    boats.push({ h, m, x, z, rx, rz, sp, ph: i * 1.7 });
  });
  return { group: g, update(t) { for (const o of boats) { const a = o.ph + t * o.sp, px = o.x + Math.cos(a) * o.rx, pz = o.z + Math.sin(a) * o.rz;
    o.h.position.set(px, -0.38 + Math.sin(t * 1.3 + o.ph) * 0.04, pz); o.h.rotation.y = Math.atan2(-Math.sin(a) * o.rx, Math.cos(a) * o.rz) * -1 + Math.PI / 2 * 0 ; o.h.rotation.z = Math.sin(t * 1.1 + o.ph) * 0.05; } } };
}
