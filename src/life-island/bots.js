// 依 HY 2026-11-08 角色截圖：黑色 HY 四瓣星、Atlas 黑圓、Sam 橘六邊形、
// Wade 粉紅水滴、小因粉紅圓角塊、950157 藍圓、Nana 橘色雲朵。
// 角色本色與腳下工作狀態色分開；執行者造型維持不變。
import { Group, Mesh, TorusGeometry, SphereGeometry, MeshBasicMaterial, Shape, ExtrudeGeometry } from 'three';
import { B, sph, cyl, box } from './geo.js';

export const BOT_COLORS = { atlas: 0x000000, xiaoyin: 0xf63898, sam: 0xf39825, p950157: 0x2d85f7, hy: 0x000000, nana: 0xf39825, claude: 0xff8a1f, gpt: 0x9bd62c, grokbuild: 0xeceff3 };
export const WADE_LOOK = { body: 0xf63898, eye: 0xffffff };
export const STATUS_COLORS = { wait: 0x8d99ab, ai: 0x2f6bff, you: 0xf2a93a, done: 0x2fb36f, bad: 0xe5484d };

// 截圖的兩眼朝同一方向傾斜，右眼略高；不影響執行者的眼睛。
function portraitEyes(b, z, y = 0.285, dx = 0.065) {
  for (const side of [-1, 1]) b.add(sph(0.027, 12, 10), 0xffffff,
    { x: side * dx, y: y + side * 0.018, z, s: [0.72, 1.65, 0.5], rz: 0.42 });
}

// 平滑輪廓加厚及圓邊，讓正面符合截圖、旋轉時仍保有 3D 體積。
function silhouette(kind) {
  const s = new Shape();
  if (kind === 'hy') {
    s.moveTo(-0.105, 0.10);
    s.bezierCurveTo(-0.10, 0.20, -0.035, 0.29, 0.015, 0.24);
    s.bezierCurveTo(0.06, 0.21, 0.085, 0.16, 0.105, 0.11);
    s.bezierCurveTo(0.27, 0.09, 0.30, -0.015, 0.12, -0.085);
    s.bezierCurveTo(0.095, -0.24, -0.005, -0.29, -0.09, -0.11);
    s.bezierCurveTo(-0.27, -0.09, -0.30, -0.01, -0.105, 0.10);
  } else if (kind === 'wade') {
    s.moveTo(-0.15, 0.16);
    s.bezierCurveTo(-0.12, 0.25, -0.055, 0.20, 0.07, 0.15);
    s.bezierCurveTo(0.23, 0.07, 0.23, -0.09, 0.11, -0.17);
    s.bezierCurveTo(-0.02, -0.27, -0.23, -0.18, -0.19, -0.02);
    s.bezierCurveTo(-0.18, 0.05, -0.17, 0.11, -0.15, 0.16);
  } else if (kind === 'xiaoyin') {
    s.moveTo(-0.10, 0.20);
    s.bezierCurveTo(-0.06, 0.24, 0.00, 0.20, 0.11, 0.15);
    s.quadraticCurveTo(0.15, 0.13, 0.17, 0.07);
    s.lineTo(0.23, -0.10);
    s.quadraticCurveTo(0.25, -0.16, 0.17, -0.18);
    s.lineTo(-0.10, -0.25);
    s.quadraticCurveTo(-0.15, -0.26, -0.17, -0.20);
    s.lineTo(-0.24, -0.03);
    s.quadraticCurveTo(-0.26, 0.02, -0.22, 0.08);
    s.lineTo(-0.10, 0.20);
  } else if (kind === 'sam') {
    // 圓角六邊形，保留截圖的不對稱傾角。
    s.moveTo(-0.04, 0.21);
    s.quadraticCurveTo(-0.07, 0.23, -0.10, 0.20);
    s.lineTo(-0.23, 0.05); s.quadraticCurveTo(-0.25, 0.02, -0.23, -0.02);
    s.lineTo(-0.15, -0.19); s.quadraticCurveTo(-0.14, -0.21, -0.10, -0.22);
    s.lineTo(0.06, -0.26); s.quadraticCurveTo(0.09, -0.27, 0.12, -0.24);
    s.lineTo(0.24, -0.09); s.quadraticCurveTo(0.26, -0.06, 0.24, -0.02);
    s.lineTo(0.17, 0.15); s.quadraticCurveTo(0.16, 0.18, 0.12, 0.19);
    s.lineTo(-0.04, 0.21);
  } else if (kind === 'nana') {
    s.moveTo(-0.21, 0.02);
    s.bezierCurveTo(-0.27, 0.16, -0.12, 0.25, -0.025, 0.19);
    s.bezierCurveTo(0.065, 0.27, 0.19, 0.21, 0.19, 0.12);
    s.bezierCurveTo(0.32, 0.07, 0.29, -0.09, 0.16, -0.10);
    s.bezierCurveTo(0.12, -0.20, 0.01, -0.21, -0.06, -0.16);
    s.bezierCurveTo(-0.23, -0.23, -0.30, -0.08, -0.21, 0.02);
  }
  s.closePath();
  const g = new ExtrudeGeometry(s, { depth: 0.24, steps: 1, bevelEnabled: true, bevelThickness: 0.025, bevelSize: 0.018, bevelSegments: 3, curveSegments: 16 });
  g.translate(0, 0, -0.12);
  return g;
}

function leaderBadge(b) {
  const x = 0.18, y = 0.12, z = 0.175;
  b.add(cyl(0.077, 0.077, 0.018, 24), 0xffffff, { x, y, z, rx: Math.PI / 2 });
  b.add(cyl(0.065, 0.065, 0.022, 24), BOT_COLORS.sam, { x, y, z: z + 0.012, rx: Math.PI / 2 });
  const star = new Shape();
  for (let i = 0; i < 10; i++) {
    const a = Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 0.019 : 0.039;
    if (i) star.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    else star.moveTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  star.closePath();
  b.add(new ExtrudeGeometry(star, { depth: 0.006, bevelEnabled: false }), 0xffffff, { x, y, z: z + 0.025 });
}

function bodyGeo(kind) {
  const b = new B();
  switch (kind) {
    case 'atlas':
    case 'p950157': {
      b.add(sph(0.215, 24, 18), BOT_COLORS[kind], { y: 0.235, g: [0.86, 1.04] });
      portraitEyes(b, 0.197);
      break; }
    case 'hy':
    case 'xiaoyin':
    case 'sam':
    case 'nana': {
      b.add(silhouette(kind), BOT_COLORS[kind], { y: 0.29, g: [0.90, 1.04] });
      portraitEyes(b, 0.151, 0.31);
      if (kind === 'hy') leaderBadge(b);
      break; }
    case 'claude': {   // 橘色像素小怪物：方身、兩側方手、四隻短腳、兩顆黑色直長眼
      const O = BOT_COLORS.claude;
      b.add(box(0.42, 0.3, 0.24, 0.015, 1), O, { y: 0.27, g: [0.9, 1.05] });
      for (const s of [-1, 1]) { b.add(box(0.1, 0.1, 0.18, 0.01, 1), O, { x: s * 0.255, y: 0.19 }); b.add(box(0.07, 0.07, 0.16, 0.01, 1), O, { x: s * 0.31, y: 0.19 }); }
      for (const x of [-0.14, -0.06, 0.06, 0.14]) b.add(box(0.045, 0.12, 0.08, 0, 1), O, { x, y: 0.06, g: [0.85, 1] });
      for (const s of [-1, 1]) b.add(box(0.045, 0.1, 0.02, 0, 1), 0x1c1c1f, { x: s * 0.1, y: 0.29, z: 0.125 });
      break; }
    case 'gpt': {      // 彩色圓點家族的青蘋果綠小圓團：扁圓身體、頭頂兩顆大圓眼
      const G = BOT_COLORS.gpt;
      b.add(sph(0.22, 22, 16), G, { y: 0.2, s: [1.08, 0.88, 0.98], g: [0.84, 1.06] });
      for (const s of [-1, 1]) { b.add(sph(0.07, 14, 10), 0xffffff, { x: s * 0.1, y: 0.4, z: 0.04 }); b.add(sph(0.032, 8, 6), 0x1c1c1f, { x: s * 0.1, y: 0.405, z: 0.1 }); }
      b.add(box(0.12, 0.018, 0.02, 0.005, 1), 0x2f6a10, { y: 0.17, z: 0.2 });
      break; }
    case 'grokbuild': { // Grok 圖示：白色圓角方塊、兩顆斜的深色膠囊眼
      b.add(box(0.4, 0.38, 0.34, 0.1, 3), BOT_COLORS.grokbuild, { y: 0.235, g: [0.9, 1.05] });
      b.add(box(0.4, 0.14, 0.34, 0.08, 2), 0x2b2d33, { y: 0.4, z: -0.0, g: [0.9, 1] });
      for (const [x, y, r] of [[-0.065, 0.2, 0.55], [0.1, 0.28, 0.55]]) b.add(sph(0.03, 10, 8), 0x1c1d22, { x, y, z: 0.172, s: [0.8, 2.0, 0.5], rz: r });
      break; }
    case 'wade': {
      b.add(silhouette(kind), WADE_LOOK.body, { y: 0.26, g: [0.90, 1.04] });
      portraitEyes(b, 0.151, 0.29, 0.06);
      break; }
  }
  return b.build();
}

export function makeBot(kind, mat, ol, status = 'wait') {
  const root = new Group(), body = new Group(); root.add(body);
  const geo = bodyGeo(kind);
  const m = new Mesh(geo, mat); m.castShadow = true; body.add(m); m.userData.botId = kind;
  if (ol) body.add(new Mesh(geo, ol));
  // 腳下狀態環
  const sc = STATUS_COLORS[status] ?? STATUS_COLORS.wait;
  const ring = new Mesh(new TorusGeometry(0.31, 0.022, 6, 32).rotateX(Math.PI / 2), new MeshBasicMaterial({ color: sc, transparent: true, opacity: 0.9 }));
  ring.position.y = 0.02; root.add(ring);
  // 頭上狀態點（待你確認時會跳動）
  const dot = new Mesh(new SphereGeometry(0.055, 12, 10), new MeshBasicMaterial({ color: sc }));
  dot.position.y = 0.62; root.add(dot);
  const dotRing = new Mesh(new TorusGeometry(0.075, 0.012, 6, 20), new MeshBasicMaterial({ color: 0xffffff }));
  dotRing.position.y = 0.62; dotRing.rotation.x = Math.PI / 2; root.add(dotRing);
  return { root, body, ring, dot, dotRing, status, kind, mesh: m };
}

// 每幀動畫：待機輕輕上下、待你確認時跳動並讓光環閃爍
export function animateBot(bot, t, phase = 0, moving = false, hello = false) {
  const s = bot.status, spd = moving ? 9 : 2.2, bob = Math.sin(t * spd + phase);
  bot.body.position.y = moving ? 0.03 * Math.abs(bob) : 0.012 * (bob + 1);
  bot.body.rotation.z = moving ? 0.07 * Math.sin(t * spd * 0.5 + phase) : 0.025 * Math.sin(t * 1.6 + phase);
  let jump = 0;
  if (s === 'you' || hello) { const k = (t * (hello ? 2.2 : 1.6) + phase) % 2; jump = k < 0.5 ? Math.sin(k / 0.5 * Math.PI) * (hello ? 0.06 : 0.09) : 0; bot.body.position.y += jump; }
  if (s === 'you') bot.ring.material.opacity = 0.55 + 0.45 * Math.abs(Math.sin(t * 3 + phase));
  else if (s === 'ai') { bot.ring.rotation.y = t * 1.5; bot.ring.material.opacity = 0.9; }
  else bot.ring.material.opacity = 0.9;
  bot.dot.position.y = 0.63 + jump + 0.015 * Math.sin(t * 3 + phase);
  bot.dotRing.position.y = bot.dot.position.y; bot.dotRing.rotation.z = t * 2;
}
