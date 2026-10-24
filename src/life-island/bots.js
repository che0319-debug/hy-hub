// 五位 Agent 小人：Atlas（黑圓＋星章）、小因（棕色水滴）、Sam（粉紅六邊形）、950157（紅圓）、HY（青綠圓角方塊）。
// 共通特徵：兩顆白色直長眼。身高約 0.45，腳底在 y=0。
import { Group, Mesh, TorusGeometry, SphereGeometry, MeshBasicMaterial, CylinderGeometry, RingGeometry } from 'three';
import { B, sph, cyl, cone, box } from './geo.js';

export const BOT_COLORS = { atlas: 0x15171c, xiaoyin: 0x9c6a3c, sam: 0xf0409a, p950157: 0xf23d4b, hy: 0x37b5a4 };
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
  }
  return b.build();
}

export function makeBot(kind, mat, ol, status = 'wait') {
  const root = new Group(), body = new Group(); root.add(body);
  const geo = bodyGeo(kind);
  const m = new Mesh(geo, mat); m.castShadow = true; body.add(m);
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
  return { root, body, ring, dot, dotRing, status, kind };
}

// 每幀動畫：待機輕輕上下、待你確認時跳動並讓光環閃爍
export function animateBot(bot, t, phase = 0) {
  const s = bot.status, bob = Math.sin(t * 2.2 + phase);
  bot.body.position.y = 0.012 * (bob + 1);
  bot.body.rotation.z = 0.025 * Math.sin(t * 1.6 + phase);
  let jump = 0;
  if (s === 'you') { const k = (t * 1.6 + phase) % 2; jump = k < 0.5 ? Math.sin(k / 0.5 * Math.PI) * 0.09 : 0; bot.body.position.y += jump; bot.ring.material.opacity = 0.55 + 0.45 * Math.abs(Math.sin(t * 3 + phase)); }
  else if (s === 'ai') { bot.ring.rotation.y = t * 1.5; bot.ring.material.opacity = 0.9; }
  else bot.ring.material.opacity = 0.9;
  bot.dot.position.y = 0.63 + jump + 0.015 * Math.sin(t * 3 + phase);
  bot.dotRing.position.y = bot.dot.position.y; bot.dotRing.rotation.z = t * 2;
}
