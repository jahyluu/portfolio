import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { CylinderGeometry, IcosahedronGeometry, MathUtils, Mesh, SphereGeometry, Vector3, type Material } from 'three'
import type { Vec3 } from './layout'

// shared helpers for the characters (Me, Barista)

const UP = new Vector3(0, 1, 0)

// unit cylinder, slightly narrower at one end so limb segments taper into each other
export const LIMB = new CylinderGeometry(0.82, 1, 1, 7)

export function placeLimb(mesh: Mesh, from: Vector3, to: Vector3, radius: number) {
  const dir = to.clone().sub(from)
  const length = dir.length()
  mesh.position.copy(from).addScaledVector(dir, 0.5)
  if (length > 1e-6) mesh.quaternion.setFromUnitVectors(UP, dir.normalize())
  mesh.scale.set(radius, Math.max(length, 1e-4), radius)
}

// static limb, placed once
export function Limb({ from, to, radius, color, material }: { from: Vec3; to: Vec3; radius: number; color: string; material?: Material }) {
  const ref = useRef<Mesh>(null!)
  const placed = useRef(false)
  useFrame(() => {
    if (placed.current || !ref.current) return
    placeLimb(ref.current, new Vector3(...from), new Vector3(...to), radius)
    placed.current = true
  })
  if (material) return <mesh ref={ref} geometry={LIMB} material={material} castShadow receiveShadow />
  return (
    <mesh ref={ref} geometry={LIMB} castShadow receiveShadow>
      <meshStandardMaterial color={color} flatShading />
    </mesh>
  )
}

// two-bone IK. writes the elbow/knee into `joint`, bending toward `pole`.
// note: clamps `end` in place if it's out of reach
export function reach(root: Vector3, end: Vector3, pole: Vector3, joint: Vector3, upper: number, lower: number) {
  const dir = end.clone().sub(root)
  const d = MathUtils.clamp(dir.length(), 0.01, upper + lower - 0.001)
  dir.normalize()
  end.copy(root).addScaledVector(dir, d)
  const along = (upper * upper - lower * lower + d * d) / (2 * d)
  const off = Math.sqrt(Math.max(upper * upper - along * along, 0))
  const bend = pole.clone().addScaledVector(dir, -pole.dot(dir)).normalize()
  joint.copy(root).addScaledVector(dir, along).addScaledVector(bend, off)
}

// unit sphere, scale it into ellipsoids
const BLOB = new SphereGeometry(1, 12, 8)

export function Blob({ position, radii, rotation = [0, 0, 0], color }: { position: Vec3; radii: Vec3; rotation?: Vec3; color: string }) {
  return (
    <mesh position={position} rotation={rotation} scale={radii} geometry={BLOB} castShadow>
      <meshStandardMaterial color={color} flatShading />
    </mesh>
  )
}

// [angle around the head (0 = forehead, PI = back), hairline height as unit-vector y]
export type Hairline = [number, number][]

function hairlineAt(hairline: Hairline, angle: number) {
  for (let i = 1; i < hairline.length; i++) {
    const [a1, h1] = hairline[i]
    if (angle <= a1) {
      const [a0, h0] = hairline[i - 1]
      return MathUtils.lerp(h0, h1, MathUtils.smoothstep(angle, a0, a1))
    }
  }
  return hairline[hairline.length - 1][1]
}

type HairShell = {
  skull: { center: Vector3; radii: Vector3 }
  hairline: Hairline
  // hair thickness at direction d, as a fraction of skull radius
  thickness: (d: Vector3, angle: number, around: number, line: number) => number
  // [lo, hi] band where hair fades in around the hairline
  edge?: (angle: number, line: number) => [number, number]
  detail?: number
}

// hair as a deformed icosphere: verts above the hairline get pushed out past the skull,
// the rest get pulled inside it, which gives one clean hairline edge
export function makeHairShell({ skull, hairline, thickness, edge = (_, line) => [line - 0.02, line + 0.05], detail = 4 }: HairShell) {
  const geometry = new IcosahedronGeometry(1, detail)
  const position = geometry.attributes.position
  const d = new Vector3()
  for (let i = 0; i < position.count; i++) {
    d.fromBufferAttribute(position, i).normalize()
    const around = Math.atan2(d.x, d.z)
    const angle = Math.abs(around)
    const line = hairlineAt(hairline, angle)
    const [below, above] = edge(angle, line)
    const covered = MathUtils.smoothstep(d.y, below, above)
    const scale = MathUtils.lerp(0.8, 1 + thickness(d, angle, around, line), covered)
    position.setXYZ(
      i,
      skull.center.x + d.x * skull.radii.x * scale,
      skull.center.y + d.y * skull.radii.y * scale,
      skull.center.z + d.z * skull.radii.z * scale,
    )
  }
  geometry.computeVertexNormals()
  return geometry
}
