// 五位 Agent 小人：Atlas（黑圓＋星章）、小因（棕色水滴）、Sam（粉紅六邊形）、950157（紅圓）、HY（青綠圓角方塊）。
// 共通特徵：兩顆白色直長眼。身高約 0.45，腳底在 y=0。
import { Group, Mesh, TorusGeometry, SphereGeometry, MeshBasicMaterial, CylinderGeometry, RingGeometry } from 'three';
import { B, sph, cyl, cone, box } from './geo.js';

export const BOT_COLORS = { atlas: 0x15171c, xiaoyin: 0x9c6a3c, sam: 0xf0409a, p950157: 0xf23d4b, hy: 0x37b5a4, claude: 0xff8a1f, gpt: 0x9bd62c, grokbuild: 0xeceff3 };
export const STATUS_COLORS = { wait: 0x8d99ab, ai: 0x2f6bff, you: 0xf2a93a, done: 0x2fb36f, bad: 0xe5484d };

function eyes(b, z, y = 0.27, dx = 0.075) {
  for (const s of [-1, 1]) b.add(sph(0.03, 10, 8), 0xffffff, { x: s * dx, y, z, s: [0.62, 1.55, 0.5], rz: s * -0.16 });
}

function bodyGeo(kind) {
  const b = new B();
  switch (kind) {
    case 'atlas': {
      b.add(sph(0.215, 22, 16), BOT_COLORS.atlas, { y: 0.235, g: [0.82, 1.05] });
      eyes(b, 0.195);
      // 隊長星章（右下）
      b.add(cyl(0.055, 0.055, 0.025, 16), 0xf5a02b, { x: 0.15, y: 0.1, z: 0.14, rx: Math.PI / 2, ry: 0 });
      b.add(sph(0.022, 5, 4), 0xffffff, { x: 0.15, y: 0.1, z: 0.158, s: [1, 1, 0.5] });
      break; }
    case 'xiaoyin': {
      // 水滴：下圓、左上尖
      b.add(sph(0.2, 20, 14), BOT_COLORS.xiaoyin, { y: 0.21, s: [1, 0.96, 0.95], g: [0.82, 1.05] });
      b.add(cone(0.15, 0.24, 14), BOT_COLORS.xiaoyin, { x: -0.07, y: 0.4, z: -0.01, rz: 0.55, g: [0.9, 1.0] });
      eyes(b, 0.18, 0.23, 0.07);
      break; }
    case 'sam': {
      b.add(cyl(0.225, 0.225, 0.34, 6), BOT_COLORS.sam, { y: 0.235, rx: Math.PI / 2, ry: Math.PI / 6, g: [0.86, 1.04] });
      eyes(b, 0.18, 0.25);
      break; }
    case 'p950157': {
      b.add(sph(0.215, 22, 16), BOT_COLORS.p950157, { y: 0.235, g: [0.84, 1.05] });
      eyes(b, 0.195);
      break; }
    case 'hy': {
      b.add(box(0.4, 0.38, 0.36, 0.1, 3), BOT_COLORS.hy, { y: 0.235, rz: -0.12, ry: 0.0, g: [0.86, 1.05] });
      eyes(b, 0.187, 0.25);
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
