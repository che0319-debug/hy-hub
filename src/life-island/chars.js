import { Color, BufferAttribute, Group, Mesh, SphereGeometry, TorusGeometry, CatmullRomCurve3, TubeGeometry, Vector3 } from 'three';
import { B, sph, cyl, cone, box } from './geo.js';
import { toon, outline } from './mats.js';

const SKIN = 0xffdcbc;
function mk(geo, mat, ol) {
  const g = new Group(); const m = new Mesh(geo, mat); m.castShadow = true; g.add(m);
  if (ol) { const o = new Mesh(geo, ol); g.add(o); }
  return g;
}
export function makeWalker(mat, ol, BODY = 0xff8f7a) {
  const root = new Group(), body = new Group(); root.add(body);
  // static torso + head
  const t = new B();
  t.add(sph(0.12, 14, 10), BODY, { y: 0.17, s: [1, 1.05, 0.92], g: [0.85, 1.05] });                // body
  t.add(sph(0.075, 10, 8), 0x7fd6bd, { y: 0.19, z: -0.115, s: [1, 1.2, 0.7] });                         // backpack
  t.add(sph(0.172, 18, 14), SKIN, { y: 0.4, g: [0.94, 1.04] });                                      // head
  t.add(new SphereGeometry(0.182, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.46), 0x7a5240, { y: 0.4, rx: -0.35, z: -0.02 }); // hair
  t.add(sph(0.05, 8, 6), 0x7a5240, { x: -0.14, y: 0.37, z: -0.06 }); t.add(sph(0.05, 8, 6), 0x7a5240, { x: 0.14, y: 0.37, z: -0.06 });
  // beanie hat
  t.add(new SphereGeometry(0.19, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.4), 0xffc94d, { y: 0.405, rx: -0.22, z: 0.0 });
  t.add(new TorusGeometry(0.168, 0.026, 8, 24), 0xfff1c9, { rx: Math.PI / 2 - 0.2, y: 0.468, z: 0.03 });
  t.add(sph(0.045, 8, 6), 0xffffff, { y: 0.6, z: -0.03 });
  // face
  for (const s of [-1, 1]) {
    t.add(sph(0.026, 10, 8), 0x3b2a33, { x: s * 0.066, y: 0.385, z: 0.158, s: [1, 1.3, 0.55] });
    t.add(sph(0.009, 6, 5), 0xffffff, { x: s * 0.066 + 0.008, y: 0.396, z: 0.17 });
    t.add(sph(0.032, 8, 6), 0xff9fae, { x: s * 0.108, y: 0.35, z: 0.132, s: [1, 0.7, 0.4] });
  }
  t.add(new TorusGeometry(0.02, 0.0055, 5, 8, Math.PI), 0x8a4a4a, { y: 0.352, z: 0.168, rz: Math.PI });
  const torsoGeo = t.build();
  body.add(mk(torsoGeo, mat, ol));
  // arms (pivot at shoulder)
  const armGeo = (() => { const a = new B(); a.add(sph(0.04, 8, 6), BODY, { y: -0.045, s: [1, 1.7, 1] }); a.add(sph(0.036, 8, 6), SKIN, { y: -0.1 }); return a.build(); })();
  const mkArm = (s) => { const p = new Group(); p.position.set(s * 0.125, 0.25, 0); p.add(mk(armGeo, mat, ol)); body.add(p); return p; };
  const armL = mkArm(-1), armR = mkArm(1);
  // legs
  const legGeo = (() => { const a = new B(); a.add(cyl(0.028, 0.03, 0.06, 6), 0x6d5aa8, { y: -0.03 }); a.add(sph(0.05, 10, 8), 0x7b5a4a, { y: -0.075, z: 0.02, s: [1, 0.7, 1.35] }); return a.build(); })();
  const mkLeg = (s) => { const p = new Group(); p.position.set(s * 0.05, 0.1, 0); p.add(mk(legGeo, mat, ol)); body.add(p); return p; };
  const legL = mkLeg(-1), legR = mkLeg(1);
  return { root, body, armL, armR, legL, legR };
}

export function makeCat(mat, ol) {
  const root = new Group(), body = new Group(); root.add(body);
  const ORG = 0xf6a95d, CRM = 0xfff0d6, DK = 0xd98a44;
  const t = new B();
  t.add(sph(0.085, 12, 10), ORG, { y: 0.1, s: [0.9, 0.85, 1.35], g: [0.85, 1.05] });
  t.add(sph(0.06, 10, 8), CRM, { y: 0.075, z: 0.06, s: [0.8, 0.6, 0.9] });
  for (const z of [-0.05, 0.0, 0.05]) t.add(sph(0.05, 8, 6), DK, { y: 0.172 - Math.abs(z) * 0.12, z, s: [1, 0.3, 0.32] });
  t.add(sph(0.075, 14, 10), ORG, { y: 0.175, z: 0.115, s: [1.05, 0.95, 0.95] });
  for (const s of [-1, 1]) {
    t.add(cone(0.026, 0.055, 4), ORG, { x: s * 0.048, y: 0.243, z: 0.105, rz: -s * 0.25 });
    t.add(cone(0.014, 0.03, 4), 0xffb3bf, { x: s * 0.048, y: 0.24, z: 0.112, rz: -s * 0.25 });
    t.add(sph(0.014, 6, 5), 0x3b2a33, { x: s * 0.03, y: 0.19, z: 0.183, s: [1, 1.3, 0.6] });
    t.add(sph(0.018, 6, 5), CRM, { x: s * 0.018, y: 0.158, z: 0.178 });
  }
  t.add(sph(0.012, 6, 5), 0xff8fa8, { y: 0.172, z: 0.188 });
  const geo = t.build();
  body.add(mk(geo, mat, ol));
  const legGeo = (() => { const a = new B(); a.add(cyl(0.017, 0.02, 0.07, 6), ORG, { y: -0.035 }); a.add(sph(0.022, 6, 5), CRM, { y: -0.07, z: 0.008, s: [1, 0.7, 1.2] }); return a.build(); })();
  const legs = [[-1, 0.055], [1, 0.055], [-1, -0.055], [1, -0.055]].map(([sx, z]) => { const p = new Group(); p.position.set(sx * 0.04, 0.07, z); p.add(mk(legGeo, mat, ol)); body.add(p); return p; });
  const curve = new CatmullRomCurve3([new Vector3(0, 0, 0), new Vector3(0, 0.06, -0.06), new Vector3(0, 0.15, -0.08), new Vector3(0, 0.21, -0.04)]);
  const tail = new Group(); tail.position.set(0, 0.1, -0.1);
  tail.add(mk(new TubeGeometry(curve, 8, 0.016, 6), mat, null));
  const tg = tail.children[0].children[0], tc = new Color(ORG), n = tg.geometry.attributes.position.count, ca = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { ca[i * 3] = tc.r; ca[i * 3 + 1] = tc.g; ca[i * 3 + 2] = tc.b; }
  tg.geometry.setAttribute('color', new BufferAttribute(ca, 3));
  body.add(tail);
  return { root, body, legs, tail };
}
