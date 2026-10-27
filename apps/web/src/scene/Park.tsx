import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  AdditiveBlending,
  BufferGeometry,
  CatmullRomCurve3,
  Color,
  DoubleSide,
  Float32BufferAttribute,
  InstancedMesh,
  Object3D,
  Vector3,
  type Group,
} from 'three'
import { EAST, Flat, LEVEL, NIGHT, NightMaterial, PARK_SOUTH, glowTexture, rainHitsPerSquareMeter } from './OutsideKit'
import { GLOW } from './palette'
import { seeded } from './primitives'

// the park across the street from the window: a small river winding through it with
// stone banks, a sandy gravel trail following it, big branching cherry trees arching
// over the water, petals falling and floating downstream, ducks, benches and warm
// lamps. things are a little oversized so they read from the cafe.
// (people will come later)

const PARK_BACK = 29 // a hedge runs across here; the river slips out through a gap in it
const GROUND_END = 36 // grass carries on past the hedge, under the river
const WATER_Y = LEVEL.walk + 0.004 // level with the grass, rocks hide the edges
const TRAIL_Y = LEVEL.walk + 0.003

// --- the river's course, north to east (x, z). it enters at the park's north edge,
// winds south, bends east and runs into the hedge. everything along it (banks, trail,
// trees, benches, ducks) is placed from this line
const COURSE: [x: number, z: number][] = [
  [19.2, -20],
  [19.8, -16],
  [18.5, -11.8],
  [20.2, -7.6],
  [19.5, -4.2],
  [21.0, -1.8],
  [23.8, -1.0],
  [26.6, -1.8],
  [29.4, -1.4],
  // past the hedge, fading off into the dark
  [32.5, -1.0],
  [35.5, -1.2],
]
// the trail runs on the river's right side (the street side, then the south side),
// this far out from the water's edge
const TRAIL = { gap: 0.5, width: 1.4 }
const SAMPLES = 400

// the course, sampled evenly along its length: center points, the direction to the
// right of the flow, and the river's half-width (it swells and narrows a little)
const RIVER = (() => {
  const curve = new CatmullRomCurve3(
    COURSE.map(([x, z]) => new Vector3(x, 0, z)),
    false,
    'centripetal',
  )
  const points: Vector3[] = []
  const rights: Vector3[] = []
  const widths: number[] = []
  for (let i = 0; i <= SAMPLES; i++) {
    const u = i / SAMPLES
    const tangent = curve.getTangentAt(u)
    points.push(curve.getPointAt(u))
    rights.push(new Vector3(-tangent.z, 0, tangent.x).normalize())
    widths.push(2 + 0.25 * Math.sin(u * 12))
  }
  return { points, rights, widths, length: curve.getLength() }
})()

// a spot along the river: index = how far along (0 to SAMPLES, fractions ok),
// offset = meters to the right of the center line (negative = left)
function along(index: number, offset: number, target = new Vector3()) {
  const i = Math.min(Math.max(Math.floor(index), 0), SAMPLES - 1)
  const f = Math.min(Math.max(index - i, 0), 1)
  const { points, rights } = RIVER
  target.lerpVectors(points[i], points[i + 1], f)
  target.x += (rights[i].x + (rights[i + 1].x - rights[i].x) * f) * offset
  target.z += (rights[i].z + (rights[i + 1].z - rights[i].z) * f) * offset
  return target
}

// first sample at or past a z (the north-south stretch) or an x (the eastward stretch)
const indexAtZ = (z: number) => RIVER.points.findIndex((p) => p.z >= z)
const indexAtX = (x: number) => RIVER.points.findIndex((p) => p.x >= x)
const halfWidth = (i: number) => RIVER.widths[Math.round(i)]
const trailMid = (i: number) => halfWidth(i) + TRAIL.gap + TRAIL.width / 2
// the trail stops just short of the hedge
const TRAIL_END = RIVER.points.findIndex((_, i) => along(i, trailMid(i)).x > PARK_BACK - 1.4)

type Tree = { x: number; z: number; lean: Vector3; size: number }

const TREES: Tree[] = (() => {
  const trees: Tree[] = []
  const add = (spot: Vector3, lean: Vector3, size: number) => trees.push({ x: spot.x, z: spot.z, lean, size })
  // street side, between the curb and the trail, leaning out over the trail and water
  for (const [z, size] of [[-17, 1.05], [-12.5, 1.15], [-8, 1.0], [-3.5, 1.1]]) {
    add(new Vector3(EAST.park + 0.65, 0, z), new Vector3(1, 0, 0), size)
  }
  // other bank, just past its path, leaning back over the path and water: along the
  // north-south stretch, then the eastward stretch
  for (const [z, size] of [[-15, 1.1], [-10.3, 1.0], [-5.8, 1.15]]) {
    const i = indexAtZ(z)
    add(along(i, -(trailMid(i) + 1.6)), RIVER.rights[i].clone(), size)
  }
  for (const [x, size] of [[22, 1.05], [25.4, 0.95]]) {
    const i = indexAtX(x)
    add(along(i, -(trailMid(i) + 1.6)), RIVER.rights[i].clone(), size)
  }
  for (const [x, size] of [[21.4, 1.0], [24.6, 1.1]]) {
    const i = indexAtX(x)
    add(along(i, trailMid(i) + 1.6), RIVER.rights[i].clone().negate(), size)
  }
  // a few standing on their own toward the hedge
  for (const [x, z, size] of [[27.2, -18.5, 0.85], [27.3, -13, 0.95], [27.0, -8.2, 0.9]]) {
    add(new Vector3(x, 0, z), new Vector3(), size)
  }
  return trees
})()

// warm lantern posts just past the trail
const LAMPS = [indexAtZ(-13), indexAtZ(-3.2), indexAtX(25.6)]
// on the trail's outer edge, facing the water. the last one sits under the middle
// lantern's light, about a meter along from its post
const BENCHES = [indexAtZ(-6), indexAtX(22.8), LAMPS[1] + Math.round((1.0 / RIVER.length) * SAMPLES)]
// a little arched footbridge over the river, just in front of the hedge
const BRIDGE = { index: indexAtX(PARK_BACK - 2.1), rise: 0.7, deck: 1.4 }

// a second gravel path on the river's other (left) bank, mirroring the main trail: it
// comes in at the park's north edge with the river, follows every bend, passes the
// bridge's far end and stops just short of the hedge. the bridge joins the two trails
const LEFT_PATH = {
  from: 0,
  to: RIVER.points.findIndex((_, i) => along(i, -trailMid(i)).x > PARK_BACK - 1.4),
}
// swimming: drift back and forth along the river around a spot. offset = meters
// right of center, range = how many samples each way
const SWIMMERS: { kind: DuckKind; index: number; offset: number; range: number; speed: number; phase: number }[] = [
  { kind: 'mallard', index: indexAtZ(-8), offset: -0.6, range: 22, speed: 0.08, phase: 0 },
  { kind: 'white', index: indexAtZ(-4.6), offset: 0.5, range: 16, speed: 0.1, phase: 2 },
  { kind: 'brown', index: indexAtZ(-13), offset: 0.2, range: 26, speed: 0.06, phase: 4 },
  { kind: 'mallard', index: indexAtX(23), offset: -0.3, range: 14, speed: 0.09, phase: 1 },
]
// standing on the far bank's rocks, looking at the water
const STANDERS: { kind: DuckKind; index: number }[] = [
  { kind: 'brown', index: indexAtZ(-3.4) },
  { kind: 'white', index: indexAtZ(-3.4) + 7 },
]

export function Park() {
  return (
    <group>
      <Grounds />
      <Gravel />
      <River />
      <BankRocks />
      <Ripples />
      <CherryTrees />
      <FallingPetals />
      <FloatingPetals />
      <Ducks />
      {BENCHES.map((i) => {
        // trail's outer edge, turned so the seat faces back toward the water (-right)
        const spot = along(i, halfWidth(i) + TRAIL.gap + TRAIL.width + 0.25)
        const right = RIVER.rights[i]
        return <Bench key={i} x={spot.x} z={spot.z} facing={Math.atan2(-right.x, -right.z)} />
      })}
      <Bridge />
      {LAMPS.map((i) => (
        <ParkLamp key={i} index={i} />
      ))}
      <Hedge />
    </group>
  )
}

// --- the cherry trees, grown from a simple branching recipe.
// a trunk splits into 3 limbs, each limb into 2-3 branches, each of those into 2-3
// twigs. every split leans out along `lean` (toward the river) and up, so the crowns
// are wide at the top and arch over the water. blossom clusters sit at the ends

type Branch = { from: Vector3; to: Vector3; radius: number }
type Bloom = { position: Vector3; radius: number; color: number; spin: number }

function growCherry(base: Vector3, lean: Vector3, size: number, seed: number) {
  const branches: Branch[] = []
  const blooms: Bloom[] = []
  let n = seed * 1000
  const rand = () => seeded(n++)

  const grow = (from: Vector3, dir: Vector3, length: number, radius: number, depth: number) => {
    const to = from.clone().addScaledVector(dir, length)
    branches.push({ from, to, radius })
    if (depth >= 1) {
      blooms.push({
        position: to.clone(),
        radius: (0.38 + rand() * 0.22) * size * (depth === 3 ? 1 : 0.85),
        color: Math.floor(rand() * NIGHT.blossom.length),
        spin: rand() * 6,
      })
    }
    if (depth === 3) return
    const children = depth === 0 ? 3 : rand() > 0.45 ? 3 : 2
    // two directions at right angles to this branch, to splay the children around it
    const side = Math.abs(dir.y) < 0.9 ? new Vector3(0, 1, 0) : new Vector3(1, 0, 0)
    const p1 = new Vector3().crossVectors(dir, side).normalize()
    const p2 = new Vector3().crossVectors(dir, p1).normalize()
    const spread = depth === 0 ? 0.75 : 0.65
    for (let k = 0; k < children; k++) {
      const angle = (k / children) * Math.PI * 2 + rand() * 1.2
      const child = dir
        .clone()
        .addScaledVector(p1, Math.cos(angle) * spread)
        .addScaledVector(p2, Math.sin(angle) * spread)
        .addScaledVector(lean, 0.35)
      // outer twigs may droop a touch, everything else keeps reaching up
      child.y = Math.max(child.y, depth === 2 ? -0.05 : 0.15)
      child.normalize()
      grow(to, child, length * (0.66 + rand() * 0.12), radius * 0.6, depth + 1)
    }
  }

  grow(base, new Vector3(lean.x * 0.3, 1, lean.z * 0.3).normalize(), 1.7 * size, 0.15 * size, 0)
  return { branches, blooms }
}

// the whole grove is grown once, when the page loads
const GROVE = (() => {
  const trees = TREES.map((t, i) => growCherry(new Vector3(t.x, LEVEL.walk, t.z), t.lean, t.size, i + 1))
  return { branches: trees.flatMap((t) => t.branches), blooms: trees.flatMap((t) => t.blooms) }
})()

// every branch and every blossom cluster in the park: two draw calls total
function CherryTrees() {
  const branchMesh = useRef<InstancedMesh>(null!)
  const bloomMesh = useRef<InstancedMesh>(null!)

  useLayoutEffect(() => {
    const dummy = new Object3D()
    const up = new Vector3(0, 1, 0)
    const dir = new Vector3()
    GROVE.branches.forEach(({ from, to, radius }, i) => {
      dir.subVectors(to, from)
      const length = dir.length()
      dir.normalize()
      dummy.position.copy(from).addScaledVector(dir, length / 2)
      dummy.quaternion.setFromUnitVectors(up, dir)
      dummy.scale.set(radius, length, radius)
      dummy.updateMatrix()
      branchMesh.current.setMatrixAt(i, dummy.matrix)
    })
    branchMesh.current.instanceMatrix.needsUpdate = true

    const color = new Color()
    GROVE.blooms.forEach(({ position, radius, color: c, spin }, i) => {
      dummy.position.copy(position)
      dummy.rotation.set(spin, spin * 2, 0)
      dummy.scale.set(radius, radius * 0.75, radius)
      dummy.updateMatrix()
      bloomMesh.current.setMatrixAt(i, dummy.matrix)
      bloomMesh.current.setColorAt(i, color.set(NIGHT.blossom[c]))
    })
    bloomMesh.current.instanceMatrix.needsUpdate = true
    if (bloomMesh.current.instanceColor) bloomMesh.current.instanceColor.needsUpdate = true
    branchMesh.current.computeBoundingSphere()
    bloomMesh.current.computeBoundingSphere()
    // re-run whenever the grove is regrown (new shape or new colors), not just on first load
  }, [GROVE])

  return (
    <group>
      {/* unit-height cylinder, a bit thinner at the top, stretched per branch */}
      <instancedMesh key={`b${GROVE.branches.length}`} ref={branchMesh} args={[undefined, undefined, GROVE.branches.length]}>
        <cylinderGeometry args={[0.65, 1, 1, 6]} />
        <NightMaterial color={NIGHT.bark} />
      </instancedMesh>
      <instancedMesh key={`f${GROVE.blooms.length}`} ref={bloomMesh} args={[undefined, undefined, GROVE.blooms.length]}>
        <icosahedronGeometry args={[1, 0]} />
        <NightMaterial color="#ffffff" />
      </instancedMesh>
    </group>
  )
}

const FALLING_PETALS = 260

// petals drifting down out of the crowns, swaying and tumbling, onto the grass or water
function FallingPetals() {
  const mesh = useRef<InstancedMesh>(null!)
  const dummy = useMemo(() => new Object3D(), [])
  const petals = useMemo(
    () =>
      Array.from({ length: FALLING_PETALS }, (_, i) => {
        const bloom = GROVE.blooms[(i * 7) % GROVE.blooms.length]
        const x = bloom.position.x + (seeded(i + 500) - 0.5) * 0.8
        const z = bloom.position.z + (seeded(i + 600) - 0.5) * 0.8
        // close enough to the river's center line = lands on the water
        const nearest = RIVER.points.reduce((best, p) => Math.min(best, Math.hypot(p.x - x, p.z - z)), Infinity)
        const overWater = nearest < 1.9
        return {
          x,
          z,
          top: bloom.position.y,
          drop: bloom.position.y - (overWater ? WATER_Y : LEVEL.walk),
          speed: 0.3 + seeded(i + 700) * 0.3,
          phase: seeded(i + 800) * 10,
        }
      }),
    [],
  )

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    petals.forEach((p, i) => {
      const fallen = (t * p.speed + p.phase) % p.drop
      dummy.position.set(p.x + Math.sin(t * 1.3 + p.phase) * 0.25, p.top - fallen, p.z + Math.cos(t * 0.9 + p.phase) * 0.2)
      dummy.rotation.set(t * 2 + p.phase, t * 1.5, p.phase)
      dummy.updateMatrix()
      mesh.current.setMatrixAt(i, dummy.matrix)
    })
    mesh.current.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, FALLING_PETALS]} frustumCulled={false}>
      <planeGeometry args={[0.06, 0.04]} />
      <meshBasicMaterial color={NIGHT.petal} side={DoubleSide} fog={false} />
    </instancedMesh>
  )
}

const FLOATING_PETALS = 180

// petals that landed on the river, drifting slowly downstream and starting over upstream
function FloatingPetals() {
  const mesh = useRef<InstancedMesh>(null!)
  const dummy = useMemo(() => new Object3D(), [])
  const petals = useMemo(
    () =>
      Array.from({ length: FLOATING_PETALS }, (_, i) => ({
        start: seeded(i + 1000) * SAMPLES,
        side: (seeded(i + 900) - 0.5) * 1.7, // fraction of the half-width, -0.85 to 0.85
        speed: ((0.08 + seeded(i + 1100) * 0.08) / RIVER.length) * SAMPLES, // samples per second
        spin: seeded(i + 1200) * 6,
      })),
    [],
  )

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    petals.forEach((p, i) => {
      const index = (p.start + t * p.speed) % SAMPLES
      along(index, p.side * halfWidth(index), dummy.position)
      dummy.position.y = WATER_Y + 0.003
      dummy.rotation.set(-Math.PI / 2, 0, p.spin + t * 0.1)
      dummy.updateMatrix()
      mesh.current.setMatrixAt(i, dummy.matrix)
    })
    mesh.current.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, FLOATING_PETALS]} frustumCulled={false}>
      <planeGeometry args={[0.07, 0.05]} />
      <meshBasicMaterial color={NIGHT.petal} fog={false} />
    </instancedMesh>
  )
}

// a flat strip following the river, from offset `from(i)` to `to(i)` (meters right of
// center) at each sample, between samples start and end
function ribbon(from: (i: number) => number, to: (i: number) => number, y: number, start = 0, end = SAMPLES) {
  const positions: number[] = []
  const indices: number[] = []
  const a = new Vector3()
  const b = new Vector3()
  for (let i = start; i <= end; i++) {
    along(i, from(i), a)
    along(i, to(i), b)
    positions.push(a.x, y, a.z, b.x, y, b.z)
    if (i < end) {
      const k = (i - start) * 2
      indices.push(k, k + 1, k + 2, k + 1, k + 3, k + 2)
    }
  }
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

function Grounds() {
  const { park, zFrom } = EAST
  const trail = useMemo(() => ribbon((i) => halfWidth(i) + TRAIL.gap, (i) => halfWidth(i) + TRAIL.gap + TRAIL.width, TRAIL_Y, 0, TRAIL_END), [])
  const leftPath = useMemo(
    () => ribbon((i) => -(halfWidth(i) + TRAIL.gap + TRAIL.width), (i) => -(halfWidth(i) + TRAIL.gap), TRAIL_Y, LEFT_PATH.from, LEFT_PATH.to),
    [],
  )
  return (
    <group>
      <Flat position={[(park + GROUND_END) / 2, LEVEL.walk - 0.1, (zFrom + PARK_SOUTH) / 2]} size={[GROUND_END - park, 0.2, PARK_SOUTH - zFrom]} color={NIGHT.grass} />
      {/* sandy gravel trails along both banks; the bridge joins them */}
      <mesh geometry={trail}>
        <meshBasicMaterial color={NIGHT.trail} side={DoubleSide} fog={false} />
      </mesh>
      <mesh geometry={leftPath}>
        <meshBasicMaterial color={NIGHT.trail} side={DoubleSide} fog={false} />
      </mesh>
    </group>
  )
}

function River() {
  const water = useMemo(() => ribbon((i) => -halfWidth(i), (i) => halfWidth(i), WATER_Y), [])
  return (
    <mesh geometry={water}>
      <meshBasicMaterial color={NIGHT.water} side={DoubleSide} fog={false} />
    </mesh>
  )
}

// stones covering both banks: two staggered rows of chunky rocks along each edge,
// one sitting in the water's edge and one on the grass, so no seam shows
function BankRocks() {
  const mesh = useRef<InstancedMesh>(null!)
  const rocks = useMemo(() => {
    const step = (0.34 / RIVER.length) * SAMPLES
    const list: { x: number; z: number; r: number; spin: number; color: string }[] = []
    let n = 0
    for (const side of [-1, 1]) {
      for (const [row, shift] of [[-0.05, 0], [0.18, step / 2]]) {
        for (let i = shift; i < SAMPLES; i += step, n++) {
          const r = 0.16 + seeded(n + 1300) * 0.12
          const spot = along(i, side * (halfWidth(i) + row + (seeded(n + 1400) - 0.5) * 0.1))
          list.push({ x: spot.x, z: spot.z, r, spin: seeded(n + 1600) * 6, color: NIGHT.rocks[Math.floor(seeded(n + 1700) * NIGHT.rocks.length)] })
        }
      }
    }
    return list
  }, [])

  useLayoutEffect(() => {
    const dummy = new Object3D()
    const color = new Color()
    rocks.forEach(({ x, z, r, spin, color: c }, i) => {
      dummy.position.set(x, LEVEL.walk + r * 0.12, z)
      dummy.rotation.set(spin, spin * 2, 0)
      dummy.scale.set(r, r * 0.55, r)
      dummy.updateMatrix()
      mesh.current.setMatrixAt(i, dummy.matrix)
      mesh.current.setColorAt(i, color.set(c))
    })
    mesh.current.instanceMatrix.needsUpdate = true
    if (mesh.current.instanceColor) mesh.current.instanceColor.needsUpdate = true
    mesh.current.computeBoundingSphere()
  }, [rocks])

  return (
    // keyed by count: a new count remounts the mesh, so the placing above always runs on it
    <instancedMesh key={rocks.length} ref={mesh} args={[undefined, undefined, rocks.length]}>
      <icosahedronGeometry args={[1, 0]} />
      <NightMaterial color="#ffffff" />
    </instancedMesh>
  )
}

// every raindrop that lands on the river makes a ring that spreads and fades over
// RIPPLE_LIFE seconds. the number of rings alive at once = drops landing on the river
// per second x how long each lasts, so they always match the rain (capped for speed)
const RIPPLE_LIFE = 1.4
const RIVER_AREA = RIVER.length * 2 * (RIVER.widths.reduce((sum, w) => sum + w, 0) / RIVER.widths.length)
const RIPPLES = Math.min(Math.round(rainHitsPerSquareMeter() * RIVER_AREA * RIPPLE_LIFE), 900)

function Ripples() {
  const mesh = useRef<InstancedMesh>(null!)
  const dummy = useMemo(() => new Object3D(), [])
  const color = useMemo(() => new Color(), [])

  useLayoutEffect(() => {
    for (let i = 0; i < RIPPLES; i++) mesh.current.setColorAt(i, color.set(0x000000))
  }, [color])

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    for (let i = 0; i < RIPPLES; i++) {
      // staggered so drops keep landing steadily instead of all at once
      const cycle = t / RIPPLE_LIFE + i / RIPPLES
      const life = cycle % 1
      // each new drop lands somewhere new on the water
      const n = Math.floor(cycle) * 7919 + i * 31
      const index = seeded(n + 1) * SAMPLES
      along(index, (seeded(n) - 0.5) * 1.8 * halfWidth(index), dummy.position)
      dummy.position.y = WATER_Y + 0.002
      dummy.rotation.set(-Math.PI / 2, 0, 0)
      // mostly small rings, now and then a bigger drop
      const size = seeded(n + 2) > 0.85 ? 0.3 : 0.16
      dummy.scale.setScalar(0.02 + life * size)
      dummy.updateMatrix()
      mesh.current.setMatrixAt(i, dummy.matrix)
      mesh.current.setColorAt(i, color.set(NIGHT.ripple).multiplyScalar((1 - life) * 0.8))
    }
    mesh.current.instanceMatrix.needsUpdate = true
    if (mesh.current.instanceColor) mesh.current.instanceColor.needsUpdate = true
  })

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, RIPPLES]} frustumCulled={false}>
      <ringGeometry args={[0.8, 1, 12]} />
      <meshBasicMaterial transparent opacity={0.45} blending={AdditiveBlending} depthWrite={false} fog={false} />
    </instancedMesh>
  )
}

type DuckKind = 'mallard' | 'white' | 'brown'
const DUCK_COLORS: Record<DuckKind, { body: string; head: string }> = {
  mallard: { body: '#8a7c68', head: '#2f6b3a' },
  white: { body: '#e6e2d6', head: '#e6e2d6' },
  brown: { body: '#6e5640', head: '#5a4533' },
}

// a light scatter of chunky gravel on both trails, big enough to read as texture from
// the cafe. lighter than the trail so it stands out. few stones, and they never move,
// so it's cheap
const GRAVEL = { main: 900, left: 650, size: [0.015, 0.03] }

function Gravel() {
  const mesh = useRef<InstancedMesh>(null!)
  const count = GRAVEL.main + GRAVEL.left
  useLayoutEffect(() => {
    const dummy = new Object3D()
    const color = new Color()
    const [small, big] = GRAVEL.size
    for (let k = 0; k < count; k++) {
      const across = TRAIL.gap + 0.1 + seeded(k + 2100) * (TRAIL.width - 0.2)
      if (k < GRAVEL.main) {
        const index = seeded(k + 2000) * TRAIL_END
        along(index, halfWidth(index) + across, dummy.position)
      } else {
        const index = LEFT_PATH.from + seeded(k + 2000) * (LEFT_PATH.to - LEFT_PATH.from)
        along(index, -(halfWidth(index) + across), dummy.position)
      }
      const r = small + seeded(k + 2400) * (big - small)
      dummy.position.y = TRAIL_Y + r * 0.2
      dummy.rotation.set(seeded(k + 2200) * 6, seeded(k + 2300) * 6, 0)
      dummy.scale.set(r, r * 0.6, r)
      dummy.updateMatrix()
      mesh.current.setMatrixAt(k, dummy.matrix)
      // random rather than in turn, so no pattern shows along the trail
      mesh.current.setColorAt(k, color.set(NIGHT.gravel[Math.floor(seeded(k + 2500) * NIGHT.gravel.length)]))
    }
    mesh.current.instanceMatrix.needsUpdate = true
    if (mesh.current.instanceColor) mesh.current.instanceColor.needsUpdate = true
    mesh.current.computeBoundingSphere()
  }, [count])
  return (
    // keyed by count: a new count remounts the mesh, so the placing above always runs on it
    <instancedMesh key={count} ref={mesh} args={[undefined, undefined, count]}>
      <icosahedronGeometry args={[1, 0]} />
      <NightMaterial color="#ffffff" />
    </instancedMesh>
  )
}

// swimmers drift slowly back and forth along the river; two more stand on the far bank
function Ducks() {
  const swimmers = useRef<Group[]>([])

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    SWIMMERS.forEach(({ index, offset, range, speed, phase }, i) => {
      const duck = swimmers.current[i]
      if (!duck) return
      const a = t * speed + phase
      const here = Math.min(Math.max(index + Math.sin(a) * range, 0), SAMPLES)
      along(here, offset + Math.sin(t * 0.3 + phase) * 0.2, duck.position)
      duck.position.y = WATER_Y + Math.sin(t * 2 + i) * 0.008
      // face the way it's swimming along the river (the model faces +x)
      const right = RIVER.rights[Math.round(here)]
      const forward = Math.sign(Math.cos(a)) || 1
      duck.rotation.y = Math.atan2(right.x * forward, right.z * forward)
    })
  })

  return (
    <group>
      {SWIMMERS.map(({ kind }, i) => (
        <group
          key={i}
          ref={(group) => {
            if (group) swimmers.current[i] = group
          }}
        >
          <Duck kind={kind} />
        </group>
      ))}
      {STANDERS.map(({ kind, index }) => {
        // on the rocks at the water's edge (left bank), facing the river
        const spot = along(index, -(halfWidth(index) + 0.05))
        const right = RIVER.rights[index]
        return (
          <group key={index} position={[spot.x, LEVEL.walk + 0.13, spot.z]} rotation={[0, Math.atan2(-right.z, right.x), 0]}>
            <Duck kind={kind} standing phase={index * 0.37} />
          </group>
        )
      })}
    </group>
  )
}

// faces +x: body, tail tipped up at the back, head and beak at the front.
// standing ducks get orange legs, sit higher, and idle: they look around, now and then
// dip down to peck, shuffle a little, breathe and wag their tail. phase keeps two
// ducks from moving in sync
function Duck({ kind, standing = false, phase = 0 }: { kind: DuckKind; standing?: boolean; phase?: number }) {
  const { body, head } = DUCK_COLORS[kind]
  const lift = standing ? 0.1 : 0
  const whole = useRef<Group>(null!)
  const neck = useRef<Group>(null!)
  const chest = useRef<Group>(null!)
  const tail = useRef<Group>(null!)

  useFrame(({ clock }) => {
    if (!standing) return
    const t = clock.elapsedTime + phase
    // looking around, with pauses between turns
    neck.current.rotation.y = 0.55 * Math.sin(Math.sin(t * 0.45) * 1.8)
    // a quick peck every 7 seconds: dip forward, then back up
    const peck = (t % 7) / 7
    const dip = peck > 0.82 && peck < 0.94 ? Math.sin(((peck - 0.82) / 0.12) * Math.PI) : 0
    neck.current.rotation.z = -dip * 0.9
    // shuffling its feet: a slow small turn back and forth
    whole.current.rotation.y = Math.sin(t * 0.22) * 0.25
    // breathing
    chest.current.scale.y = 1 + Math.sin(t * 2.2) * 0.03
    // tail wag every few seconds
    const wag = (t % 5) / 5
    tail.current.rotation.y = wag > 0.9 ? Math.sin((wag - 0.9) * 10 * Math.PI * 3) * 0.4 : 0
  })

  return (
    <group ref={whole} scale={1.3}>
      {standing &&
        [-0.04, 0.04].map((z) => (
          <mesh key={z} position={[0.02, 0.05, z]}>
            <cylinderGeometry args={[0.01, 0.01, 0.1, 4]} />
            <NightMaterial color="#d98a2b" />
          </mesh>
        ))}
      <group ref={chest} position={[0, 0.07 + lift, 0]}>
        <mesh scale={[1.45, 0.72, 0.95]}>
          <icosahedronGeometry args={[0.13, 0]} />
          <NightMaterial color={body} />
        </mesh>
      </group>
      <group ref={tail} position={[-0.15, 0.09 + lift, 0]}>
        <mesh position={[-0.02, 0.02, 0]} rotation={[0, 0, 0.6]}>
          <coneGeometry args={[0.05, 0.1, 4]} />
          <NightMaterial color={body} />
        </mesh>
      </group>
      {/* head and beak pivot together at the neck */}
      <group ref={neck} position={[0.12, 0.14 + lift, 0]}>
        <mesh position={[0.03, 0.06, 0]}>
          <icosahedronGeometry args={[0.065, 0]} />
          <NightMaterial color={head} />
        </mesh>
        <mesh position={[0.11, 0.05, 0]} rotation={[0, 0, -Math.PI / 2]}>
          <coneGeometry args={[0.025, 0.07, 4]} />
          <NightMaterial color="#d98a2b" />
        </mesh>
      </group>
    </group>
  )
}

// wooden slat bench, built facing +z and turned by `facing` (radians around y)
function Bench({ x, z, facing }: { x: number; z: number; facing: number }) {
  return (
    <group position={[x, LEVEL.walk, z]} rotation={[0, facing, 0]}>
      {[-0.14, 0, 0.14].map((sz) => (
        <mesh key={sz} position={[0, 0.45, sz]}>
          <boxGeometry args={[1.6, 0.04, 0.12]} />
          <NightMaterial color={NIGHT.wood} />
        </mesh>
      ))}
      {[0.68, 0.84].map((y) => (
        <mesh key={y} position={[0, y, -0.24]} rotation={[-0.15, 0, 0]}>
          <boxGeometry args={[1.6, 0.1, 0.03]} />
          <NightMaterial color={NIGHT.wood} />
        </mesh>
      ))}
      {[-0.7, 0.7].map((sx) => (
        <group key={sx}>
          <mesh position={[sx, 0.22, 0]}>
            <boxGeometry args={[0.05, 0.44, 0.4]} />
            <NightMaterial color={NIGHT.metal} />
          </mesh>
          <mesh position={[sx, 0.68, -0.24]} rotation={[-0.15, 0, 0]}>
            <boxGeometry args={[0.05, 0.5, 0.04]} />
            <NightMaterial color={NIGHT.metal} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

const BRIDGE_PLANKS = 14

// a little wooden footbridge arching over the river: plank deck on a gentle curve,
// vermilion posts and rails on both sides, stone footings on each bank.
// built along local x (bank to bank), then turned to cross the river
function Bridge() {
  const { index, rise, deck } = BRIDGE
  const center = along(index, 0)
  const right = RIVER.rights[index]
  const span = 2 * halfWidth(index) + 1.6 // a bit past both banks
  // height of the deck at a point along the span (0 at the ends, `rise` in the middle)
  const heightAt = (x: number) => rise * (1 - ((2 * x) / span) ** 2)
  const slopeAt = (x: number) => (-8 * rise * x) / (span * span)
  const step = span / BRIDGE_PLANKS
  const planks = Array.from({ length: BRIDGE_PLANKS }, (_, k) => -span / 2 + step * (k + 0.5))
  const posts = Array.from({ length: BRIDGE_PLANKS / 2 + 1 }, (_, k) => -span / 2 + step * 2 * k)
  return (
    <group position={[center.x, LEVEL.walk, center.z]} rotation={[0, Math.atan2(-right.z, right.x), 0]}>
      {/* stone footings on each bank */}
      {[-1, 1].map((end) => (
        <mesh key={end} position={[(end * span) / 2, 0.06, 0]}>
          <boxGeometry args={[0.6, 0.2, deck + 0.3]} />
          <NightMaterial color={NIGHT.rocks[0]} />
        </mesh>
      ))}
      {/* the deck: short planks, each tilted to follow the curve */}
      {planks.map((x) => (
        <mesh key={x} position={[x, heightAt(x) + 0.1, 0]} rotation={[0, 0, Math.atan(slopeAt(x))]}>
          <boxGeometry args={[step * 1.04, 0.07, deck]} />
          <NightMaterial color={NIGHT.wood} />
        </mesh>
      ))}
      {/* the arch beams under the deck, one each side */}
      {[-1, 1].flatMap((side) =>
        planks.map((x) => (
          <mesh key={`${side}${x}`} position={[x, heightAt(x) + 0.0, (side * deck) / 2 - side * 0.08]} rotation={[0, 0, Math.atan(slopeAt(x))]}>
            <boxGeometry args={[step * 1.04, 0.12, 0.08]} />
            <NightMaterial color={NIGHT.bark} />
          </mesh>
        )),
      )}
      {/* vermilion posts, and a rail that follows the curve */}
      {[-1, 1].flatMap((side) => [
        ...posts.map((x) => (
          <mesh key={`p${side}${x}`} position={[x, heightAt(x) + 0.42, (side * deck) / 2]}>
            <boxGeometry args={[0.08, 0.62, 0.08]} />
            <NightMaterial color={NIGHT.bridgeRail} />
          </mesh>
        )),
        ...planks.map((x) => (
          <mesh key={`r${side}${x}`} position={[x, heightAt(x) + 0.72, (side * deck) / 2]} rotation={[0, 0, Math.atan(slopeAt(x))]}>
            <boxGeometry args={[step * 1.04, 0.06, 0.09]} />
            <NightMaterial color={NIGHT.bridgeRail} />
          </mesh>
        )),
      ])}
    </group>
  )
}

// short warm lantern post just past the trail, with a pool of light on it
function ParkLamp({ index }: { index: number }) {
  const spot = along(index, halfWidth(index) + TRAIL.gap + TRAIL.width + 0.5)
  const glow = useMemo(() => glowTexture(), [])
  return (
    <group position={[spot.x, LEVEL.walk, spot.z]}>
      <mesh position={[0, 1.1, 0]}>
        <cylinderGeometry args={[0.04, 0.06, 2.2, 6]} />
        <NightMaterial color={NIGHT.pole} />
      </mesh>
      <mesh position={[0, 2.3, 0]}>
        <boxGeometry args={[0.2, 0.24, 0.2]} />
        <meshBasicMaterial color={GLOW.bulb} fog={false} />
      </mesh>
      <mesh position={[0, 2.48, 0]}>
        <coneGeometry args={[0.2, 0.14, 4]} />
        <NightMaterial color={NIGHT.pole} />
      </mesh>
      <mesh position={[0, 0.008, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[3.6, 3.6]} />
        <meshBasicMaterial map={glow} color={NIGHT.warmLight} transparent opacity={0.3} blending={AdditiveBlending} depthWrite={false} fog={false} />
      </mesh>
    </group>
  )
}

// a row of dark low-poly bushes at the back of the park, open where the river leaves
function Hedge() {
  const { zFrom } = EAST
  // where the river runs into the hedge, and how wide a gap to leave for it
  const mouth = along(indexAtX(PARK_BACK - 0.5), 0)
  const gap = halfWidth(indexAtX(PARK_BACK - 0.5)) + 0.5
  const bushes = Array.from({ length: Math.floor((PARK_SOUTH - zFrom) / 1.1) }, (_, k) => ({
    z: zFrom + 0.55 + k * 1.1,
    r: 0.6 + seeded(k + 400) * 0.3,
  })).filter(({ z }) => Math.abs(z - mouth.z) > gap)
  return (
    <group>
      {bushes.map(({ z, r }, k) => (
        <mesh key={k} position={[PARK_BACK - 0.5, LEVEL.walk + r * 0.7, z]} rotation={[k, k * 2, 0]}>
          <icosahedronGeometry args={[r, 0]} />
          <NightMaterial color={NIGHT.hedge} />
        </mesh>
      ))}
    </group>
  )
}
