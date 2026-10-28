import { useMemo } from 'react'
import { BufferGeometry, CatmullRomCurve3, Color, ExtrudeGeometry, MathUtils, MeshStandardMaterial, Shape, SphereGeometry, TubeGeometry, Vector3 } from 'three'
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import type { Vec3 } from './layout'

// sneakers, loafers and sandals. all share one upper shape and sole outline.
// origin is on the floor under the middle of the shoe, toe toward +z

const LENGTH = 0.27

// u goes from -1 (heel) to 1 (toe)
// upper half width
const WIDTH: [number, number][] = [[-1, 0.038], [-0.45, 0.042], [0.4, 0.05], [1, 0.048]]
// upper height above the sole
const HEIGHT: [number, number][] = [[-1, 0.082], [-0.55, 0.09], [-0.1, 0.08], [0.45, 0.058], [1, 0.044]]

function along(table: [number, number][], u: number) {
  for (let i = 1; i < table.length; i++) {
    const [u1, v1] = table[i]
    if (u <= u1) {
      const [u0, v0] = table[i - 1]
      return MathUtils.lerp(v0, v1, MathUtils.smootherstep(u, u0, u1))
    }
  }
  return table[table.length - 1][1]
}

// end rounding, heel is flatter than the toe
function rounding(u: number, heel = 4, toe = 3.2) {
  const p = u < 0 ? heel : toe
  return Math.pow(Math.max(0, 1 - Math.abs(u) ** p), 1 / p)
}

// size relative to the sneaker, and the sole height it sits on
type Fit = { base: number; tall: number; wide: number }

// point on the upper. c, s = cos/sin around the cross-section, s > 0 is the top
function onUpper(u: number, c: number, s: number, { base, tall, wide }: Fit, out = 0) {
  const e = rounding(u)
  // squarer than a circle so the sides don't look pinched
  const sx = Math.sign(c) * Math.abs(c) ** 0.75
  const sy = Math.sign(s) * Math.abs(s) ** 0.75
  const height = s > 0 ? along(HEIGHT, u) * tall : 0.004
  return new Vector3(sx * (along(WIDTH, u) * wide * e + out), base - 0.002 + sy * (height * e + out), (u * LENGTH) / 2)
}

// deformed sphere, bottom half flattened onto the sole
function upperGeometry(fit: Fit) {
  const sphere = new SphereGeometry(1, 14, 10)
  sphere.rotateX(Math.PI / 2) // poles at the heel and toe
  sphere.deleteAttribute('uv')
  sphere.deleteAttribute('normal')
  const geometry = mergeVertices(sphere)
  const position = geometry.attributes.position
  const v = new Vector3()
  for (let i = 0; i < position.count; i++) {
    v.fromBufferAttribute(position, i)
    const ring = Math.hypot(v.x, v.y)
    const p = onUpper(MathUtils.clamp(v.z, -1, 1), ring > 1e-6 ? v.x / ring : 0, ring > 1e-6 ? v.y / ring : 0, fit)
    position.setXYZ(i, p.x, p.y, p.z)
  }
  geometry.computeVertexNormals()
  return geometry
}

// sole outline, slightly bigger than the upper
function soleGeometry(grow: number, depth: number, bevel: number) {
  const shape = new Shape()
  const n = 12
  const point = (k: number, side: number) => {
    const u = -Math.cos((Math.PI * k) / n)
    const x = side * (along(WIDTH, u) * grow + 0.003) * rounding(u, 3.2, 3)
    // shape y ends up as -z after the rotation
    return [x, -((u * LENGTH) / 2) * (grow * 0.5 + 0.5)] as const
  }
  shape.moveTo(...point(0, 1))
  for (let k = 1; k <= n; k++) shape.lineTo(...point(k, 1))
  for (let k = n - 1; k >= 1; k--) shape.lineTo(...point(k, -1))
  shape.closePath()
  const geometry = new ExtrudeGeometry(shape, { depth: depth - bevel * 2, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 1, curveSegments: 1 })
  geometry.rotateX(-Math.PI / 2)
  geometry.translate(0, bevel, 0)
  geometry.computeVertexNormals()
  return geometry
}

// strap over the foot at u
function strapGeometry(u: number, fit: Fit, radius: number) {
  const points = Array.from({ length: 7 }, (_, i) => {
    const a = (Math.PI * i) / 6
    return onUpper(u, Math.cos(a), Math.sin(a), fit, radius * 0.6)
  })
  return new TubeGeometry(new CatmullRomCurve3(points), 8, radius, 3, false)
}

// geometry is identical for everyone, build it once
const cache = new Map<string, BufferGeometry>()
function cached<T extends BufferGeometry>(key: string, make: () => T) {
  if (!cache.has(key)) cache.set(key, make())
  return cache.get(key) as T
}

const materials = new Map<string, MeshStandardMaterial>()
function matte(color: string, roughness = 0.75) {
  const key = `${color}/${roughness}`
  if (!materials.has(key)) materials.set(key, new MeshStandardMaterial({ color, roughness, flatShading: true }))
  return materials.get(key)!
}

function shade(color: string, amount: number) {
  return `#${new Color(color).multiplyScalar(amount).getHexString()}`
}

const SNEAKER = { outsole: 0.012, midsole: 0.02 }
const SNEAKER_FIT: Fit = { base: SNEAKER.outsole + SNEAKER.midsole, tall: 1, wide: 1 }

// laces follow the slope of the upper
function laces(fit: Fit) {
  return [0, 0.11, 0.22, 0.33].map((u) => {
    const top = (at: number) => onUpper(at, 0, 1, fit).y
    const slope = Math.atan2(top(u + 0.05) - top(u), (0.05 * LENGTH) / 2)
    return { z: (u * LENGTH) / 2, y: top(u) + 0.0005, slope, width: along(WIDTH, u) * fit.wide * 1.15 }
  })
}

export type SneakerColors = { upper: string; outsole: string; midsole: string; lace: string }

// sole and laces are darker shades of the upper
export function sneakerColors(color: string): SneakerColors {
  return { upper: color, midsole: shade(color, 0.9), outsole: shade(color, 0.75), lace: shade(color, 0.85) }
}

export function Sneaker({ position, colors, scale = 1 }: { position: Vec3; colors: SneakerColors; scale?: number }) {
  const parts = useMemo(
    () => ({
      upper: cached('sneaker', () => upperGeometry(SNEAKER_FIT)),
      outsole: cached('outsole', () => soleGeometry(1.1, SNEAKER.outsole, 0.004)),
      midsole: cached('midsole', () => soleGeometry(1.08, SNEAKER.midsole, 0.005)),
      laces: laces(SNEAKER_FIT),
    }),
    [],
  )
  return (
    <group position={position} scale={scale}>
      <mesh geometry={parts.outsole} material={matte(colors.outsole, 0.85)} receiveShadow />
      <mesh geometry={parts.midsole} material={matte(colors.midsole, 0.7)} position={[0, SNEAKER.outsole, 0]} castShadow receiveShadow />
      <mesh geometry={parts.upper} material={matte(colors.upper, 0.72)} castShadow receiveShadow />
      {parts.laces.map(({ z, y, slope, width }, i) => (
        <mesh key={i} position={[0, y, z]} rotation={[-slope, 0, 0]} material={matte(colors.lace, 1)} receiveShadow>
          <boxGeometry args={[width, 0.003, 0.009]} />
        </mesh>
      ))}
      {/* pull tab at the back of the heel */}
      <mesh position={[0, SNEAKER_FIT.base + 0.075, -LENGTH / 2 + 0.006]} rotation={[0.15, 0, 0]} material={matte(colors.midsole, 0.7)} receiveShadow>
        <boxGeometry args={[0.014, 0.022, 0.005]} />
      </mesh>
    </group>
  )
}

// lower, slimmer upper with a saddle strap
const LOAFER = 0.016
const LOAFER_FIT: Fit = { base: LOAFER, tall: 0.75, wide: 0.95 }

export function Loafer({ position, color, sole = '#2a1d14', scale = 1 }: { position: Vec3; color: string; sole?: string; scale?: number }) {
  const parts = useMemo(
    () => ({
      upper: cached('loafer', () => upperGeometry(LOAFER_FIT)),
      sole: cached('loaferSole', () => soleGeometry(1.03, LOAFER, 0.004)),
      strap: cached('loaferStrap', () => strapGeometry(0.05, LOAFER_FIT, 0.004)),
    }),
    [],
  )
  return (
    <group position={position} scale={scale}>
      <mesh geometry={parts.sole} material={matte(sole, 0.8)} receiveShadow />
      <mesh geometry={parts.upper} material={matte(color, 0.55)} castShadow receiveShadow />
      <mesh geometry={parts.strap} material={matte(shade(color, 0.75), 0.6)} receiveShadow />
    </group>
  )
}

// bare foot on a flat sole, instep strap + toe strap
const SANDAL = 0.016
const FOOT_FIT: Fit = { base: SANDAL, tall: 0.5, wide: 0.88 }

export function Sandal({ position, skin, color, scale = 1 }: { position: Vec3; skin: string; color: string; scale?: number }) {
  const parts = useMemo(
    () => ({
      foot: cached('foot', () => upperGeometry(FOOT_FIT)),
      sole: cached('sandalSole', () => soleGeometry(1.0, SANDAL, 0.004)),
      instep: cached('instep', () => strapGeometry(-0.05, FOOT_FIT, 0.009)),
      toes: cached('toeStrap', () => strapGeometry(0.5, FOOT_FIT, 0.005)),
    }),
    [],
  )
  const strap = matte(color, 0.8)
  return (
    <group position={position} scale={scale}>
      <mesh geometry={parts.sole} material={matte(shade(color, 0.85), 0.85)} castShadow receiveShadow />
      <mesh geometry={parts.foot} material={matte(skin, 0.8)} castShadow receiveShadow />
      {/* ankle, otherwise the pant leg floats above the foot */}
      <mesh position={[0, 0.08, -0.058]} material={matte(skin, 0.8)} castShadow>
        <cylinderGeometry args={[0.032, 0.036, 0.09, 6]} />
      </mesh>
      <mesh geometry={parts.instep} material={strap} receiveShadow />
      <mesh geometry={parts.toes} material={strap} receiveShadow />
    </group>
  )
}
