import { Shape, ExtrudeGeometry } from 'three';
// 環形扇面（可只取一段弧）：內外半徑 r0~r1，高 h，弧度 phi0~phi1。
// 形狀座標 (x, y) 轉成世界座標 (x, z = -y)，所以 phi 在 0~π 時在中心的後方（z<0）。
export function arcSector(r0, r1, h, phi0, phi1, seg = 28) {
  const sh = new Shape();
  sh.absarc(0, 0, r1, phi0, phi1, false);
  sh.lineTo(r0 * Math.cos(phi1), r0 * Math.sin(phi1));
  sh.absarc(0, 0, r0, phi1, phi0, true);
  sh.closePath();
  const g = new ExtrudeGeometry(sh, { depth: h, bevelEnabled: false, curveSegments: seg });
  g.rotateX(-Math.PI / 2);
  return g;
}
