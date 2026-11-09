// Two static 3×3 buildings, using the island's existing merged geometry builder.
import { B, box, cyl, sph, prismTri } from './geo.js'
const STONE = 0xdcd2c2, TRIM = 0xfffaf0, WOOD = 0x9b6a45, GOLD = 0xf6c453

export function makeVault() {
  const b = new B()
  b.add(box(2.8, 0.16, 2.5, 0.06), STONE, { y: 0.08 })
  b.add(box(2.2, 1.45, 1.65, 0.08), TRIM, { y: 0.88, z: -0.12 })
  b.add(box(2.5, 0.13, 2.1, 0.03), STONE, { y: 1.65 })
  b.add(prismTri(0.7, 0.55, 2.5), STONE, { y: 1.7, z: 0.35 })
  for (const x of [-0.93, 0.93]) {
    b.add(cyl(0.12, 0.15, 1.4, 12), STONE, { x, y: 0.92, z: 0.83 })
    b.add(box(0.34, 0.11, 0.34, 0.02), TRIM, { x, y: 1.55, z: 0.83 })
  }
  b.add(cyl(0.49, 0.49, 0.1, 24), 0x8a8f99, { rx: Math.PI / 2, y: 0.85, z: 0.75 })
  b.add(cyl(0.38, 0.38, 0.12, 24), STONE, { rx: Math.PI / 2, y: 0.85, z: 0.83 })
  b.add(cyl(0.11, 0.11, 0.12, 12), GOLD, { rx: Math.PI / 2, y: 0.85, z: 0.92 })
  for (const angle of [0, Math.PI / 3, -Math.PI / 3]) b.add(box(0.52, 0.045, 0.045, 0.01, 1), GOLD, { y: 0.85, z: 0.99, rz: angle })
  for (const x of [-1, 1]) b.add(box(0.24, 0.35, 0.05, 0.02), 0x8ab8f0, { x, y: 1.07, z: 0.73 })
  b.add(box(1.35, 0.1, 0.28, 0.03), STONE, { y: 0.15, z: 1.08 })
  b.add(cyl(0.12, 0.12, 0.05, 18), GOLD, { rx: Math.PI / 2, y: 1.89, z: 0.72 })
  return { geo: b.build(), top: 2.25, smoke: [] }
}

export function makeLakeside() {
  const b = new B()
  b.add(box(2.8, 0.12, 2.7, 0.12), 0x9fd27f, { y: 0.06 })
  b.add(box(1.75, 0.1, 0.8, 0.15), 0x8ab8f0, { y: 0.13, z: 0.88, x: -0.2 })
  b.add(box(1.65, 0.2, 1.25, 0.04), STONE, { y: 0.2, z: -0.35 })
  b.add(box(1.48, 1.02, 1.15, 0.04), WOOD, { y: 0.8, z: -0.35 })
  b.add(prismTri(1.6, 0.67, 1.8), 0xd9694a, { y: 1.32, z: -0.35 })
  b.add(box(0.4, 0.75, 0.06, 0.02), TRIM, { y: 0.67, z: 0.25, x: -0.32 })
  b.add(box(0.35, 0.39, 0.07, 0.015), 0x8ab8f0, { y: 1.03, z: 0.27, x: 0.38, glow: 0.3 })
  b.add(box(0.04, 0.39, 0.08, 0, 1), TRIM, { y: 1.03, z: 0.28, x: 0.38 })
  for (const x of [-0.05, 0.22, 0.49]) b.add(box(0.23, 0.08, 0.87, 0.01), WOOD, { x, y: 0.23, z: 0.72 })
  b.add(box(0.5, 0.09, 0.2, 0.02), WOOD, { x: 1.03, y: 0.43, z: 0.6 })
  for (const x of [0.86, 1.2]) b.add(box(0.05, 0.3, 0.16, 0.01), WOOD, { x, y: 0.24, z: 0.6 })
  b.add(cyl(0.07, 0.09, 0.6, 8), WOOD, { x: -1.03, y: 0.42, z: -0.73 })
  b.add(sph(0.28, 10, 8), 0x7fc96a, { x: -1.03, y: 0.86, z: -0.73 })
  return { geo: b.build(), top: 2.05, smoke: [] }
}
