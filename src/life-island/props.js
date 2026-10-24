import { Color, InstancedMesh, Object3D, Matrix4, DodecahedronGeometry, IcosahedronGeometry, CylinderGeometry } from 'three';
import { B, box, cyl, sph, cone, rng } from './geo.js';

const WOOD = 0x9b6a45, WOOD_D = 0x7a4d33, TRIM = 0xfffaf0;
const g3 = (a, b, c) => [a, b, c];

export function treeGeos() {
  const out = {};
  { // round tree
    const b = new B(); b.add(cyl(0.05, 0.075, 0.34, 8), WOOD, { y: 0.17, g: [0.8, 1] });
    b.add(sph(0.34, 12, 8), 0x86d18f, { y: 0.62, g: [0.82, 1.1] });
    b.add(sph(0.24, 10, 7), 0x93da93, { x: 0.22, y: 0.5, z: 0.1, g: [0.85, 1.1] });
    b.add(sph(0.22, 10, 7), 0x7bc98a, { x: -0.2, y: 0.46, z: -0.08, g: [0.85, 1.1] });
    b.add(sph(0.2, 10, 7), 0x9be29a, { x: 0.02, y: 0.88, z: 0.02, g: [0.9, 1.1] });
    out.round = b.build();
  }
  { // pine / cone
    const b = new B(); b.add(cyl(0.045, 0.065, 0.28, 8), WOOD, { y: 0.14 });
    b.add(cone(0.38, 0.5, 10), 0x5cb98e, { y: 0.5, g: [0.8, 1.05] });
    b.add(cone(0.3, 0.46, 10), 0x69c79a, { y: 0.78, g: [0.8, 1.05] });
    b.add(cone(0.2, 0.4, 10), 0x78d3a4, { y: 1.04, g: [0.85, 1.1] });
    b.add(sph(0.04, 6, 5), 0xffe08a, { y: 1.26 });
    out.pine = b.build();
  }
  { // cherry blossom
    const b = new B(); b.add(cyl(0.05, 0.08, 0.38, 8), 0x8a5a48, { y: 0.19 });
    b.add(sph(0.36, 12, 8), 0xf8b4cb, { y: 0.66, g: [0.85, 1.08] });
    b.add(sph(0.25, 10, 7), 0xfcc6d8, { x: 0.24, y: 0.52, z: 0.1, g: [0.85, 1.1] });
    b.add(sph(0.23, 10, 7), 0xf4a8c2, { x: -0.22, y: 0.5, z: -0.08, g: [0.85, 1.1] });
    out.cherry = b.build();
  }
  { // bush
    const b = new B(); b.add(sph(0.2, 10, 7), 0x7ccb86, { y: 0.15, s: [1, 0.85, 1], g: [0.8, 1.1] });
    b.add(sph(0.15, 8, 6), 0x8fd899, { x: 0.17, y: 0.12, z: 0.05, s: [1, 0.85, 1], g: [0.8, 1.1] });
    b.add(sph(0.14, 8, 6), 0x72c27f, { x: -0.15, y: 0.11, z: -0.04, s: [1, 0.85, 1], g: [0.8, 1.1] });
    out.bush = b.build();
  }
  { // berry bush
    const b = new B(); b.add(sph(0.22, 10, 7), 0x72c27f, { y: 0.16, s: [1, 0.85, 1], g: [0.8, 1.1] });
    for (let i = 0; i < 7; i++) { const a = i * 2.4; b.add(sph(0.035, 5, 4), 0xff7a8e, { x: Math.cos(a) * 0.17, y: 0.14 + (i % 3) * 0.06, z: Math.sin(a) * 0.17 }); }
    out.berry = b.build();
  }
  { // flower
    const b = new B(); b.add(cyl(0.007, 0.007, 0.09, 3), 0x6fbf7a, { y: 0.045 });
    for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI * 2; b.add(sph(0.03, 5, 4), 0xffffff, { x: Math.cos(a) * 0.035, y: 0.1, z: Math.sin(a) * 0.035, s: [1, 0.6, 1] }); }
    b.add(sph(0.024, 5, 4), 0xffd35c, { y: 0.108 });
    out.flower = b.build();
  }
  { // grass tuft
    const b = new B();
    for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI * 2; b.add(cone(0.025, 0.14, 4), 0x6ec07a, { x: Math.cos(a) * 0.03, y: 0.07, z: Math.sin(a) * 0.03, rz: Math.cos(a) * 0.3, rx: -Math.sin(a) * 0.3, g: [0.8, 1.1] }); }
    out.tuft = b.build();
  }
  { // rock
    const b = new B(); b.add(new DodecahedronGeometry(0.14, 0), 0xcfc7c0, { y: 0.07, s: [1.2, 0.75, 1], g: [0.85, 1.05] });
    b.add(new DodecahedronGeometry(0.09, 0), 0xdcd5cd, { x: 0.15, y: 0.04, z: 0.06, s: [1.1, 0.7, 1] });
    out.rock = b.build();
  }
  return out;
}

export function instanced(geo, mat, list, tints) {
  const m = new InstancedMesh(geo, mat, list.length), o = new Object3D(), c = new Color();
  list.forEach((p, i) => {
    o.position.set(p.x, p.y || 0, p.z); o.rotation.set(0, p.ry || 0, 0); o.scale.setScalar(p.s || 1); o.updateMatrix(); m.setMatrixAt(i, o.matrix);
    if (tints) { const t = tints[i % tints.length]; c.set(t); m.setColorAt(i, c); } else m.setColorAt(i, c.setRGB(1, 1, 1));
  });
  m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true;
  m.castShadow = true; m.receiveShadow = true; return m;
}

export function fence(b, x0, z0, x1, z1) {
  const dx = x1 - x0, dz = z1 - z0, L = Math.hypot(dx, dz), n = Math.max(2, Math.round(L / 0.24)), ang = Math.atan2(dx, dz);
  b.with({ x: x0, z: z0, ry: ang }, () => {
    for (let i = 0; i <= n; i++) b.add(box(0.06, 0.26, 0.06, 0.025, 1), 0xf3e2c4, { z: L * i / n, y: 0.13, g: [0.9, 1] });
    for (const y of [0.1, 0.19]) b.add(box(0.035, 0.03, L, 0.012, 1), 0xe6cfa6, { z: L / 2, y });
  });
}
export function lamp(b, x, z) {
  b.add(cyl(0.025, 0.035, 0.46, 8), 0x6f5a73, { x, y: 0.23, z });
  b.add(sph(0.07, 10, 8), 0xffffff, { x, y: 0.5, z, glow: 2 });
  b.add(cone(0.1, 0.07, 10), 0x6f5a73, { x, y: 0.6, z });
}
