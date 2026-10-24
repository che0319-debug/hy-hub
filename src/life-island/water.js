import { Mesh, CircleGeometry, ShaderMaterial, DataTexture, RedFormat, UnsignedByteType, LinearFilter, Color, Vector3, DoubleSide, MeshBasicMaterial, CanvasTexture } from 'three';

const HALF = 36, N = 1024;
export function makeDistTexture(tiles, apothem = 0.92) {
  const occ = new Uint8Array(N * N), cell = (2 * HALF) / N;
  for (const t of tiles) {
    const ix0 = Math.max(0, Math.floor((t.x - 1 + HALF) / cell)), ix1 = Math.min(N - 1, Math.ceil((t.x + 1 + HALF) / cell));
    const iz0 = Math.max(0, Math.floor((t.z - 1 + HALF) / cell)), iz1 = Math.min(N - 1, Math.ceil((t.z + 1 + HALF) / cell));
    for (let iz = iz0; iz <= iz1; iz++) for (let ix = ix0; ix <= ix1; ix++) {
      const x = -HALF + (ix + 0.5) * cell, z = -HALF + (iz + 0.5) * cell, dx = x - t.x, dz = z - t.z;
      if (t.sq ? (Math.abs(dx) <= 0.52 && Math.abs(dz) <= 0.52) : (Math.abs(dx) <= apothem && Math.abs(dx * 0.5 + dz * 0.866) <= apothem && Math.abs(dx * 0.5 - dz * 0.866) <= apothem)) occ[iz * N + ix] = 1;
    }
  }
  // chamfer distance transform (3-4)
  const INF = 1e9, d = new Float32Array(N * N);
  for (let i = 0; i < N * N; i++) d[i] = occ[i] ? 0 : INF;
  const a = 1, b = 1.4142;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    let v = d[y * N + x];
    if (x > 0) v = Math.min(v, d[y * N + x - 1] + a);
    if (y > 0) { v = Math.min(v, d[(y - 1) * N + x] + a); if (x > 0) v = Math.min(v, d[(y - 1) * N + x - 1] + b); if (x < N - 1) v = Math.min(v, d[(y - 1) * N + x + 1] + b); }
    d[y * N + x] = v;
  }
  for (let y = N - 1; y >= 0; y--) for (let x = N - 1; x >= 0; x--) {
    let v = d[y * N + x];
    if (x < N - 1) v = Math.min(v, d[y * N + x + 1] + a);
    if (y < N - 1) { v = Math.min(v, d[(y + 1) * N + x] + a); if (x < N - 1) v = Math.min(v, d[(y + 1) * N + x + 1] + b); if (x > 0) v = Math.min(v, d[(y + 1) * N + x - 1] + b); }
    d[y * N + x] = v;
  }
  const out = new Uint8Array(N * N);
  for (let i = 0; i < N * N; i++) out[i] = Math.min(255, Math.round((d[i] * cell) / 4 * 255));
  const tex = new DataTexture(out, N, N, RedFormat, UnsignedByteType);
  tex.minFilter = tex.magFilter = LinearFilter; tex.needsUpdate = true;
  return tex;
}

export function makeWater(distTex, level) {
  const mat = new ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: {
      uTime: { value: 0 }, uDist: { value: distTex }, uHalf: { value: HALF },
      uShallow: { value: new Color(0xa6f0e0) }, uDeep: { value: new Color(0x62b8ee) }, uSky: { value: new Color(0xcfeaf8) },
      uFoam: { value: new Color(0xffffff) }, uSunDir: { value: new Vector3(0.3, 0.8, 0.5) }, uSunCol: { value: new Color(0xfff2d0) },
      uNight: { value: 0 }, uFade: { value: 25 }, uFade2: { value: 52 }
    },
    vertexShader: `varying vec3 vW; void main(){ vec4 w = modelMatrix*vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }`,
    fragmentShader: `
      varying vec3 vW;
      uniform float uTime, uHalf, uNight, uFade, uFade2; uniform sampler2D uDist;
      uniform vec3 uShallow, uDeep, uSky, uFoam, uSunDir, uSunCol;
      float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
      float vn(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
        return mix(mix(hash(i),hash(i+vec2(1,0)),f.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x), f.y); }
      void main(){
        vec2 p = vW.xz; float t = uTime;
        float d = texture2D(uDist, p/(2.0*uHalf)+0.5).r * 4.0;
        if (abs(p.x) > uHalf || abs(p.y) > uHalf) d = 4.0;
        // soft rolling normal
        vec2 q = p*0.8;
        float n1 = vn(q*1.6 + vec2(t*0.10, t*0.07)), n2 = vn(q*3.1 - vec2(t*0.13, -t*0.09));
        vec2 g = vec2(vn(q*1.6+vec2(t*0.10+0.1, t*0.07)) - n1, vn(q*1.6+vec2(t*0.10, t*0.07+0.1)) - n1) * 2.2
               + vec2(vn(q*3.1-vec2(t*0.13-0.1, -t*0.09)) - n2, vn(q*3.1-vec2(t*0.13, -t*0.09-0.1)) - n2) * 1.1;
        vec3 N = normalize(vec3(-g.x, 1.0, -g.y));
        vec3 V = normalize(cameraPosition - vW);
        float fres = pow(1.0 - max(dot(N, V), 0.0), 3.0);
        float k = smoothstep(0.0, 3.2, d);
        vec3 col = mix(uShallow, uDeep, k);
        col = mix(col, col*1.08 + 0.02, (n1-0.5)*0.3);
        col = mix(col, uSky, fres*0.5);
        // sun glints
        vec3 H = normalize(V + normalize(uSunDir));
        float sp = pow(max(dot(N, H), 0.0), 320.0);
        float sparkle = smoothstep(0.55, 0.9, vn(q*9.0 + t*0.6));
        col += uSunCol * (sp * 0.9 * (1.0 - 0.7*uNight) + sp*sparkle*(0.6 + 1.6*uNight));
        // foam + shore ripples
        float wob = (vn(p*2.2 + t*0.25) - 0.5) * 0.16 + sin(atan(p.y, p.x)*11.0 + t*1.1)*0.025;
        float dd = d + wob*smoothstep(1.2, 0.0, d);
        float foam = 1.0 - smoothstep(0.03, 0.2, dd + 0.02*sin(t*1.4 + p.x*3.0));
        float rings = fract(dd*1.15 - t*0.10);
        float line = smoothstep(0.0, 0.05, rings) * (1.0 - smoothstep(0.05, 0.16, rings));
        line *= (1.0 - smoothstep(0.2, 2.6, dd)) * smoothstep(0.18, 0.4, dd) * (0.55 + 0.45*vn(p*3.0 + t*0.3));
        float cn = vn(p*0.42 + vec2(t*0.025, t*0.018)) + 0.35*vn(p*0.9 - vec2(t*0.03, 0.0));
        float cl = 1.0 - smoothstep(0.0, 0.05, abs(fract(cn*5.0) - 0.5) - 0.44);
        col = mix(col, uSky*1.05, cl * 0.22 * smoothstep(0.6, 2.0, d));
        float shallowGlow = (1.0 - smoothstep(0.0, 0.9, d));
        col = mix(col, uShallow*1.12 + 0.05, shallowGlow*0.45);
        col = mix(col, uFoam*0.93, clamp(foam + line*0.5, 0.0, 1.0) * mix(1.0, 0.55, uNight));
        float a = mix(0.62, 0.95, k);
        a = max(a, foam);
        float r = length(p);
        a *= 1.0 - smoothstep(uFade, uFade2, r);
        gl_FragColor = vec4(col, a);
      }`
  });
  const m = new Mesh(new CircleGeometry(160, 128).rotateX(-Math.PI / 2), mat);
  m.position.y = level; m.renderOrder = 2;
  return m;
}
export function blobTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(0,0,0,0.5)'); g.addColorStop(0.6, 'rgba(0,0,0,0.25)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = g; x.fillRect(0, 0, 64, 64); return new CanvasTexture(c);
}
