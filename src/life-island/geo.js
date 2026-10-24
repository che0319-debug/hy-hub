import { BoxGeometry, BufferAttribute, Matrix4, Quaternion, Euler, Vector3, Color, ExtrudeGeometry, Shape, SphereGeometry, CylinderGeometry, ConeGeometry } from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const _q = new Quaternion(), _e = new Euler(), _p = new Vector3(), _s = new Vector3(), _m = new Matrix4();
const _white = new Color(1, 1, 1);

export function rng(seed) { let s = seed >>> 0 || 1; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

export const box = (w, h, d, r = 0.05, seg = 2) => (r <= 0 || (seg === 1 && Math.min(w, h, d) < 0.09)) ? new BoxGeometry(w, h, d) : new RoundedBoxGeometry(w, h, d, seg, Math.max(0.002, Math.min(r, Math.min(w, h, d) / 2 - 0.002)));
export const cyl = (rt, rb, h, seg = 14) => new CylinderGeometry(rt, rb, h, seg, 1);
export const sph = (r, ws = 12, hs = 9) => new SphereGeometry(r, ws, hs);
export const cone = (r, h, seg = 12) => new ConeGeometry(r, h, seg, 1);
// triangular prism: triangle in (z,y), extruded along x
export function prismTri(wz, rise, len) {
  const s = new Shape(); s.moveTo(-wz / 2, 0); s.lineTo(wz / 2, 0); s.lineTo(0, rise); s.closePath();
  const g = new ExtrudeGeometry(s, { depth: len, bevelEnabled: false });
  g.translate(0, 0, -len / 2); g.rotateY(Math.PI / 2); return g;
}

export class B {
  constructor() { this.parts = []; this.M = new Matrix4(); }
  with(o, fn) {
    const prev = this.M.clone();
    _e.set(o.rx || 0, o.ry || 0, o.rz || 0); _q.setFromEuler(_e); _p.set(o.x || 0, o.y || 0, o.z || 0); _s.set(1, 1, 1);
    this.M.multiply(_m.compose(_p, _q, _s)); fn(this); this.M = prev; return this;
  }
  add(geo, color, o = {}) {
    const g = geo.index ? geo.toNonIndexed() : geo.clone();
    g.deleteAttribute('uv'); if (g.attributes.uv1) g.deleteAttribute('uv1');
    _e.set(o.rx || 0, o.ry || 0, o.rz || 0); _q.setFromEuler(_e);
    const sc = o.s; if (typeof sc === 'number') _s.set(sc, sc, sc); else if (sc) _s.set(sc[0], sc[1], sc[2]); else _s.set(1, 1, 1);
    _p.set(o.x || 0, o.y || 0, o.z || 0);
    _m.compose(_p, _q, _s); g.applyMatrix4(_m); g.applyMatrix4(this.M);
    const pos = g.attributes.position, n = pos.count;
    let y0 = Infinity, y1 = -Infinity;
    for (let i = 0; i < n; i++) { const y = pos.getY(i); if (y < y0) y0 = y; if (y > y1) y1 = y; }
    const c = new Color(color), col = new Float32Array(n * 3), glow = new Float32Array(n).fill(o.glow || 0);
    const gr = o.g || [1, 1];
    for (let i = 0; i < n; i++) {
      const k = gr[0] + (gr[1] - gr[0]) * ((pos.getY(i) - y0) / (y1 - y0 || 1));
      const cc = o.fn ? o.fn(i, pos.getX(i), pos.getY(i), pos.getZ(i)) : c;
      col[i * 3] = cc.r * k; col[i * 3 + 1] = cc.g * k; col[i * 3 + 2] = cc.b * k;
    }
    g.setAttribute('color', new BufferAttribute(col, 3)); g.setAttribute('aGlow', new BufferAttribute(glow, 1));
    this.parts.push(g); return this;
  }
  build() { const g = mergeGeometries(this.parts, false); this.parts = []; g.computeBoundingSphere(); g.computeBoundingBox(); return g; }
}
