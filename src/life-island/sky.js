// 時間與天氣：依新竹的真實時間算太陽位置，決定白天／黃昏／夜晚的天色與光線；天氣取自 Open-Meteo（免金鑰），取不到就當晴天。
// 網址除錯：#/…?time=19:30&weather=rain（weather：clear partly cloudy fog rain storm）
import { Color, CanvasTexture, SRGBColorSpace, Group, Mesh, SphereGeometry, MeshBasicMaterial, Points, BufferGeometry, BufferAttribute, PointsMaterial, LineSegments, LineBasicMaterial, MathUtils, Vector3, Fog } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const LAT = 24.8138, LON = 120.9675, TZ = 'Asia/Taipei';
const sstep = (a, b, x) => { const t = MathUtils.clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const C = h => new Color(h);
const WX = {
  clear:  { label: '晴',     cloud: 0.12, fog: 0,    rain: 0,    dark: 0 },
  partly: { label: '多雲',   cloud: 0.45, fog: 0,    rain: 0,    dark: 0.05 },
  cloudy: { label: '陰',     cloud: 0.85, fog: 0.15, rain: 0,    dark: 0.22 },
  fog:    { label: '霧',     cloud: 0.6,  fog: 1,    rain: 0,    dark: 0.18 },
  rain:   { label: '雨',     cloud: 0.95, fog: 0.4,  rain: 0.6,  dark: 0.35 },
  storm:  { label: '雷雨',   cloud: 1,    fog: 0.5,  rain: 1,    dark: 0.5 },
};

// 低精度太陽位置（誤差約 1°，夠用）
export function solar(date) {
  const rad = Math.PI / 180, n = date.getTime() / 86400000 + 2440587.5 - 2451545.0;
  const L = (280.46 + 0.9856474 * n) % 360, g = ((357.528 + 0.9856003 * n) % 360) * rad;
  const lam = (L + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * rad, eps = (23.439 - 4e-7 * n) * rad;
  const ra = Math.atan2(Math.cos(eps) * Math.sin(lam), Math.cos(lam)), dec = Math.asin(Math.sin(eps) * Math.sin(lam));
  const gmst = (280.46061837 + 360.98564736629 * n) % 360, H = ((gmst + LON) * rad) - ra, lat = LAT * rad;
  const elev = Math.asin(Math.sin(lat) * Math.sin(dec) + Math.cos(lat) * Math.cos(dec) * Math.cos(H));
  const az = Math.atan2(Math.sin(H), Math.cos(H) * Math.sin(lat) - Math.tan(dec) * Math.cos(lat)) + Math.PI;
  return { elev: elev / rad, az };
}
// 新竹當地的日期時間字串
function taipeiParts(d) {
  const f = new Intl.DateTimeFormat('zh-TW', { timeZone: TZ, month: 'numeric', day: 'numeric', weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(d);
  const o = {}; f.forEach(p => { o[p.type] = p.value; });
  return { md: `${o.month}/${o.day}`, wd: o.weekday.replace('星期', '週'), hm: `${o.hour === '24' ? '00' : o.hour}:${o.minute}` };
}
function classify(code, cc) {
  if (code === 45 || code === 48) return 'fog';
  if (code >= 95) return 'storm';
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 86) || (code >= 71 && code <= 77)) return 'rain';
  if (code === 3 || cc >= 85) return 'cloudy';
  if (code === 2 || cc >= 45) return 'partly';
  if (code === 1 || cc >= 20) return 'partly';
  return 'clear';
}

function cloudGeo() {
  const parts = [[0, 0, 0, 1.0], [1.0, -0.15, 0.1, 0.78], [-1.0, -0.2, -0.1, 0.8], [0.45, 0.35, 0, 0.75], [-0.4, 0.3, 0.2, 0.68], [1.7, -0.3, 0, 0.5], [-1.7, -0.32, 0, 0.5]];
  return mergeGeometries(parts.map(([x, y, z, r]) => { const g = new SphereGeometry(r, 9, 7); g.translate(x, y, z); g.scale(1, 0.72, 0.9); return g; }));
}

export function createAtmosphere({ scene, hemi, sun, water, U, onSky }) {
  const q = new URLSearchParams((location.hash.split('?')[1]) || '');
  const fixedTime = /^\d{1,2}:\d{2}$/.test(q.get('time') || '') ? q.get('time') : null;
  const fixedWx = WX[q.get('weather')] ? q.get('weather') : null;
  let wx = { kind: fixedWx || 'clear', temp: null }, wxAt = 0, disposed = false;

  // 天空漸層
  const cv = document.createElement('canvas'); cv.width = 4; cv.height = 256; const cx = cv.getContext('2d');
  const bg = new CanvasTexture(cv); bg.colorSpace = SRGBColorSpace; scene.background = bg;
  const fog = scene.fog || (scene.fog = new Fog(0xe9efe3, 110, 300));
  const DAY = [C(0x8fc9ec), C(0xcfe8ee), C(0xf2eadb)], DUSK = [C(0x6d7fc4), C(0xf4a97c), C(0xffd9a6)], NIGHT = [C(0x141f4a), C(0x2c3d7c), C(0x4d63a3)], GRAY = [C(0x9aa6b2), C(0xb7c0c8), C(0xcfd3d4)];

  // 星星
  const sp = new Float32Array(500 * 3);
  for (let i = 0; i < 500; i++) { const u = Math.random() * Math.PI * 2, v = Math.acos(0.15 + Math.random() * 0.85); sp[i * 3] = Math.sin(v) * Math.cos(u) * 260; sp[i * 3 + 1] = Math.cos(v) * 260; sp[i * 3 + 2] = Math.sin(v) * Math.sin(u) * 260; }
  const sg = new BufferGeometry(); sg.setAttribute('position', new BufferAttribute(sp, 3));
  const stars = new Points(sg, new PointsMaterial({ color: 0xffffff, size: 1.8, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false })); stars.frustumCulled = false; stars.renderOrder = -1; scene.add(stars);

  // 雲：分散在海灣外圍，不擋住島
  const cg = cloudGeo(), cloudMat = new MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.92, fog: false, depthWrite: false });
  const clouds = new Group(), CL = [];
  for (let i = 0; i < 12; i++) {
    const m = new Mesh(cg, cloudMat), a = (i / 12) * Math.PI * 2 + (i % 3) * 0.2, r = 52 + (i % 4) * 12, s = 4 + (i % 5) * 1.6;
    m.position.set(Math.cos(a) * r, 15 + (i % 4) * 3, Math.sin(a) * r); m.scale.setScalar(s); m.renderOrder = -1; clouds.add(m); CL.push({ m, a, r, y: m.position.y, sp: 0.003 + (i % 3) * 0.0015, s });
  }
  scene.add(clouds);

  // 雨
  const NR = 900, rp = new Float32Array(NR * 6), rpos = [];
  for (let i = 0; i < NR; i++) rpos.push([(Math.random() - 0.5) * 70, Math.random() * 40, (Math.random() - 0.5) * 70]);
  const rg = new BufferGeometry(); rg.setAttribute('position', new BufferAttribute(rp, 3));
  const rain = new LineSegments(rg, new LineBasicMaterial({ color: 0xcfe3ff, transparent: true, opacity: 0.5, fog: false, depthWrite: false })); rain.frustumCulled = false; rain.visible = false; scene.add(rain);

  const tmpC = new Color(), grad = [new Color(), new Color(), new Color()];
  const S = { night: 0, time: '', lastSky: 0, lastUi: 0 };
  const sunBase = new Vector3(-0.4, 0.95, 1.0).normalize(), moonDir = new Vector3(-0.5, 0.9, 0.6).normalize();

  function applyLook(date) {
    const { elev, az } = solar(date);
    const day = sstep(-3, 9, elev), night = 1 - sstep(-9, 1, elev), dusk = Math.exp(-Math.pow((elev - 2) / 7, 2));
    S.night = night; const W = WX[wx.kind], cl = W.cloud;
    for (let k = 0; k < 3; k++) {
      grad[k].copy(NIGHT[k]).lerp(DAY[k], day).lerp(DUSK[k], dusk * 0.85 * (1 - W.dark));
      grad[k].lerp(tmpC.copy(GRAY[k]).multiplyScalar(0.35 + 0.65 * Math.max(day, 0.25 + dusk * 0.4)), Math.min(0.9, W.dark * 1.3 + cl * 0.2));
    }
    const g = cx.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, '#' + grad[0].getHexString()); g.addColorStop(0.5, '#' + grad[1].getHexString()); g.addColorStop(1, '#' + grad[2].getHexString());
    cx.fillStyle = g; cx.fillRect(0, 0, 4, 256); bg.needsUpdate = true;
    fog.color.copy(grad[2]);
    const fk = W.fog; fog.near = 110 - 85 * fk; fog.far = 300 - 190 * fk;
    // 光線
    const dim = 1 - 0.55 * W.dark - 0.2 * cl;
    hemi.intensity = (1.35 + 0.65 * day + 0.15 * dusk) * (1 - 0.1 * W.dark);
    hemi.color.copy(C(0x9fb2f0)).lerp(C(0xfff6ea), day).lerp(C(0xffc9a0), dusk * 0.5);
    hemi.groundColor.copy(C(0x56609a)).lerp(C(0xd9d4f2), day);
    sun.intensity = (0.75 + 0.5 * day) * dim + 0.25 * dusk;
    sun.color.copy(C(0x9fb4ff)).lerp(C(0xfff1d6), day).lerp(C(0xff9b5a), dusk * 0.8);
    const el = MathUtils.degToRad(Math.max(elev, 20)), h = new Vector3(Math.sin(az), 0, -Math.cos(az)), real = new Vector3(h.x * Math.cos(el), Math.sin(el), h.z * Math.cos(el)).normalize();
    sun.position.copy(moonDir).lerp(real, day).normalize().multiplyScalar(70);
    // 水
    const u = water.material.uniforms, wd = sstep(-8, 5, elev);
    u.uShallow.value.copy(C(0x3a6fa8)).lerp(C(0xa4ecd8), wd).lerp(C(0xf0b89a), dusk * 0.2);
    u.uDeep.value.copy(C(0x24468a)).lerp(C(0x6cc6d8), wd).lerp(C(0x8aa0c8), dusk * 0.2);
    u.uSky.value.copy(grad[2]); u.uSunDir.value.copy(sun.position).normalize(); u.uSunCol.value.copy(sun.color).multiplyScalar(0.8 * (0.5 + 0.5 * day));
    if (u.uNight) u.uNight.value = night; U.uNight.value = night;
    stars.material.opacity = night * (1 - cl * 0.85);
    cloudMat.color.copy(C(0xffffff)).lerp(C(0x44507a), night * 0.85).lerp(C(0xffc7a0), dusk * 0.5).lerp(C(0x8b95a1), W.dark * 1.2);
    cloudMat.opacity = 0.55 + 0.4 * cl;
    CL.forEach((c, i) => { const on = i < 3 + Math.round(cl * 9); c.m.visible = on; c.m.scale.setScalar(c.s * (0.8 + cl * 0.6)); });
    rain.visible = W.rain > 0; rain.material.opacity = 0.25 + 0.3 * W.rain;
    return { elev, night, dusk };
  }

  async function loadWeather() {
    if (fixedWx) return;
    try {
      const ctl = new AbortController(), tm = setTimeout(() => ctl.abort(), 6000);
      const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&current=temperature_2m,weather_code,cloud_cover&timezone=${encodeURIComponent(TZ)}`, { signal: ctl.signal });
      clearTimeout(tm); if (!r.ok) throw new Error(r.status);
      const j = (await r.json()).current;
      wx = { kind: classify(j.weather_code, j.cloud_cover), temp: Math.round(j.temperature_2m) }; wxAt = Date.now(); S.lastSky = 0;
    } catch { wxAt = Date.now() - 12 * 60 * 1000; }   // 失敗就維持現狀，3 分鐘後再試
  }
  loadWeather();

  function nowDate() {
    if (!fixedTime) return new Date();
    const [h, m] = fixedTime.split(':').map(Number), d = new Date(), p = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
    return new Date(`${p}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00+08:00`);
  }
  function update(now, dt, center, camPos) {
    if (disposed) return;
    if (now - S.lastSky > 3000) {
      S.lastSky = now; const date = nowDate(), r = applyLook(date);
      if (now - S.lastUi > 20000 || S.lastUi === 0) {
        S.lastUi = now; const p = taipeiParts(date);
        onSky && onSky({ date: p.md, weekday: p.wd, time: p.hm, weather: WX[wx.kind].label, kind: wx.kind, temp: wx.temp, phase: r.night > 0.6 ? '夜晚' : r.dusk > 0.35 ? (r.elev > 0 && date.getHours() < 12 ? '清晨' : '黃昏') : '白天', night: r.night });
      }
    }
    if (!fixedWx && Date.now() - wxAt > 15 * 60 * 1000) { wxAt = Date.now(); loadWeather(); }
    stars.position.copy(camPos);
    for (const c of CL) { c.a += c.sp * dt; c.m.position.set(Math.cos(c.a) * c.r, c.y, Math.sin(c.a) * c.r); }
    if (rain.visible) {
      const v = (30 + 20 * WX[wx.kind].rain) * dt, a = rg.attributes.position.array;
      for (let i = 0; i < NR; i++) {
        const d = rpos[i]; d[1] -= v; if (d[1] < 0) d[1] += 40;
        const x = center.x + d[0], z = center.z + d[2], j = i * 6;
        a[j] = x; a[j + 1] = d[1]; a[j + 2] = z; a[j + 3] = x + 0.12; a[j + 4] = d[1] + 0.9; a[j + 5] = z + 0.05;
      }
      rg.attributes.position.needsUpdate = true;
    }
  }
  return { update, dispose() { disposed = true; }, get weather() { return wx; } };
}
