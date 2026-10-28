import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { CatmullRomCurve3, CylinderGeometry, DoubleSide, Group, IcosahedronGeometry, LatheGeometry, MathUtils, Mesh, Quaternion, SphereGeometry, TubeGeometry, Vector2, Vector3 } from 'three'
import { LAPTOP, ME, MY_TABLE, TABLE_HEIGHT, type Vec3 } from './layout'
import { COLOR } from './palette'
import { Chair } from './primitives'
import { CoffeeCup } from './Tabletop'

// me, at my table: early 20s, 5'8", slim. black hoodie (hood down) with drawstrings
// and silver glasses hooked into the neckline, gray sweatpants, black sneakers,
// AirPods Pro, silver watch on my left wrist, black hair in a two-block middle part. backpack on the floor.
// facing +z (my laptop). my right is -x, the side the camera passes on.
// idle: typing, small head movements, and every 16s I pick up my coffee for a sip.
// the lean is kept small so the camera clears my head and shoulder by 7cm+ as it passes

const LEAN = 0.16 // torso tilt forward from the hips, radians
const HEAD_PITCH = 0.35 // looking down at the screen
const ARM = { upper: 0.31, fore: 0.31 }
const [SX, , SZ] = ME.position
const HIP = new Vector3(SX, 0.53, SZ)
// where my wrists rest at the front of the keyboard (my right is -x)
const KEYS = { x: 0.085, y: TABLE_HEIGHT + 0.045, z: LAPTOP.position[2] - 0.1 }
// my coffee: to my right, handle pointing out (away from the laptop)
const CUP_REST = new Vector3(MY_TABLE.position[0] - 0.38, TABLE_HEIGHT, MY_TABLE.position[2] - 0.22)
// my wrist when holding it by the handle, relative to the cup
const GRIP = new Vector3(-0.075, 0.055, -0.02)
const SIP = { period: 16, start: 10 } // seconds

// a point on my torso (x, up, forward from the hips) in the world, leaning forward
function torso(x: number, up: number, forward: number, out = new Vector3()) {
  const c = Math.cos(LEAN)
  const s = Math.sin(LEAN)
  return out.set(HIP.x + x, HIP.y + up * c - forward * s, HIP.z + up * s + forward * c)
}

// where the elbow goes for a shoulder and wrist: two-bone reach, bending toward `pole`.
// pulls the wrist in if it's out of reach. returns the (possibly moved) wrist too
function reach(shoulder: Vector3, wrist: Vector3, pole: Vector3, elbow: Vector3) {
  const { upper, fore } = ARM
  const dir = wrist.clone().sub(shoulder)
  const d = Math.min(dir.length(), upper + fore - 0.001)
  dir.normalize()
  wrist.copy(shoulder).addScaledVector(dir, d)
  const along = (upper * upper - fore * fore + d * d) / (2 * d)
  const off = Math.sqrt(Math.max(upper * upper - along * along, 0))
  const bend = pole.clone().addScaledVector(dir, -pole.dot(dir)).normalize()
  elbow.copy(shoulder).addScaledVector(dir, along).addScaledVector(bend, off)
}

const UP = new Vector3(0, 1, 0)
const FORWARD = new Vector3(0, 0, 1)
// a unit cylinder stretched between two points for limbs: full width where it starts,
// narrower where it ends, so each segment tapers into the next joint
const LIMB = new CylinderGeometry(0.82, 1, 1, 7)

function placeLimb(mesh: Mesh, from: Vector3, to: Vector3, radius: number) {
  const dir = to.clone().sub(from)
  const length = dir.length()
  mesh.position.copy(from).addScaledVector(dir, 0.5)
  mesh.quaternion.setFromUnitVectors(UP, dir.normalize())
  mesh.scale.set(radius, length, radius)
}

// a fixed limb between two points, in its parent's space (legs, drawstrings)
function Limb({ from, to, radius, color }: { from: Vec3; to: Vec3; radius: number; color: string }) {
  const ref = useRef<Mesh>(null!)
  const placed = useRef(false)
  useFrame(() => {
    if (placed.current || !ref.current) return
    placeLimb(ref.current, new Vector3(...from), new Vector3(...to), radius)
    placed.current = true
  })
  return (
    <mesh ref={ref} geometry={LIMB} castShadow receiveShadow>
      <meshStandardMaterial color={color} flatShading />
    </mesh>
  )
}

const ease = (t: number) => MathUtils.smoothstep(t, 0, 1)

// where I am in the sip, every stage as 0-1. `tip` is how far the cup (and my head)
// tilt for the drink itself
function sipPose(t: number) {
  const u = t % SIP.period
  const stage = (from: number, length: number) => ease(MathUtils.clamp((u - from) / length, 0, 1))
  const toCup = stage(SIP.start, 0.8)
  const lift = stage(SIP.start + 0.8, 0.8)
  const lower = stage(SIP.start + 2.8, 0.8)
  const back = stage(SIP.start + 3.6, 0.8)
  const holding = u > SIP.start + 0.8 && u < SIP.start + 3.6
  const up = holding ? lift * (1 - lower) : 0
  const reaching = u > SIP.start && u < SIP.start + 4.4
  return { toCup, back, holding, reaching, up }
}

// head angles for time t: looking down at the screen with small idle movements,
// lifting a little to drink
function headAngles(t: number) {
  const { up } = sipPose(t)
  return {
    pitch: HEAD_PITCH + Math.sin(t * 0.7) * 0.02 * (1 - up) - up * 0.18,
    yaw: Math.sin(t * 0.4) * 0.07 * (1 - up),
    roll: Math.sin(t * 0.3) * 0.02 * (1 - up),
  }
}

// head pivot and lips, in the torso's own space (x, up, forward)
const HEAD_PIVOT = new Vector3(0, 0.585, 0.01)
const LIPS = new Vector3(0, 0.072, 0.1)
const CUP_TILT = -0.32 // a light sip, not a pour
const X_AXIS = new Vector3(1, 0, 0)
// the near edge of the rim, from the cup's base, when tilted for the sip
const RIM = new Vector3(0, 0.1, -0.042).applyAxisAngle(X_AXIS, CUP_TILT)

export function Me() {
  return (
    <group>
      <group position={ME.position}>
        <Chair />
      </group>
      <Legs />
      <Torso />
      <Arms />
      <Backpack />
    </group>
  )
}

function Legs() {
  const hipY = HIP.y
  return (
    <group>
      {[-1, 1].map((side) => {
        const x = SX + side * 0.095
        const knee: Vec3 = [x + side * 0.01, 0.56, SZ + 0.42]
        const ankle: Vec3 = [x + side * 0.01, 0.1, SZ + 0.47]
        return (
          <group key={side}>
            <Limb from={[x, hipY, SZ]} to={knee} radius={0.075} color={COLOR.sweats} />
            <Limb from={knee} to={ankle} radius={0.062} color={COLOR.sweats} />
            {/* knee joint, so thigh and shin read as one leg */}
            <mesh position={knee}>
              <icosahedronGeometry args={[0.062, 1]} />
              <meshStandardMaterial color={COLOR.sweats} flatShading />
            </mesh>
            {/* sneaker and its sole */}
            <mesh position={[ankle[0], 0.055, ankle[2] + 0.06]} castShadow>
              <boxGeometry args={[0.1, 0.085, 0.26]} />
              <meshStandardMaterial color={COLOR.shoe} flatShading />
            </mesh>
            <mesh position={[ankle[0], 0.012, ankle[2] + 0.06]}>
              <boxGeometry args={[0.104, 0.024, 0.27]} />
              <meshStandardMaterial color={COLOR.sole} flatShading />
            </mesh>
          </group>
        )
      })}
      {/* hips, under the hoodie's hem */}
      <Blob position={[SX, 0.56, SZ + 0.01]} radii={[0.15, 0.06, 0.095]} color={COLOR.sweats} />
    </group>
  )
}

// the hoodie's body: a smooth lathe (spun outline) instead of stacked boxes,
// squashed front to back. [radius, height above the hips]. the hem flares out a bit
// so it drapes over the waistband
const TORSO_OUTLINE: [number, number][] = [
  [0, -0.05],
  [0.13, -0.05],
  [0.172, -0.035],
  [0.168, 0],
  [0.163, 0.08],
  [0.165, 0.2],
  [0.176, 0.32],
  [0.18, 0.41],
  [0.172, 0.46],
  [0.148, 0.495],
  [0.11, 0.517],
  [0.075, 0.532],
  [0.06, 0.55], // up around the base of the neck
  [0, 0.55],
]
const TORSO_DEPTH = 0.6 // front-to-back, as a fraction of the width
const TORSO_SHAPE = new LatheGeometry(
  TORSO_OUTLINE.map(([r, y]) => new Vector2(r, y)),
  16,
)
// kangaroo pocket: a curved patch just proud of the front of the hoodie
const POCKET_SHAPE = new LatheGeometry(
  [
    [0.17, 0.05],
    [0.171, 0.11],
    [0.172, 0.17],
  ].map(([r, y]) => new Vector2(r, y)),
  8,
  -0.75,
  1.5,
)
// one smooth blob, scaled into ellipsoids for hair, the hood and the hips
const BLOB = new SphereGeometry(1, 12, 8)

function Blob({ position, radii, rotation = [0, 0, 0], color }: { position: Vec3; radii: Vec3; rotation?: Vec3; color: string }) {
  return (
    <mesh position={position} rotation={rotation} scale={radii} geometry={BLOB} castShadow>
      <meshStandardMaterial color={color} flatShading />
    </mesh>
  )
}

// how far forward the hoodie's front surface is at height `up`, `x` from the middle
function hoodieFront(x: number, up: number) {
  let radius = 0
  for (let i = 1; i < TORSO_OUTLINE.length; i++) {
    const [r1, y1] = TORSO_OUTLINE[i]
    const [r0, y0] = TORSO_OUTLINE[i - 1]
    if (up <= y1 && y1 > y0) {
      radius = MathUtils.lerp(r0, r1, (up - y0) / (y1 - y0))
      break
    }
  }
  return TORSO_DEPTH * Math.sqrt(Math.max(radius * radius - x * x, 0))
}

// the hood, down: just a soft roll around the back and sides of my neck, fat at the back
// and thinning to the front where its two ends meet the neckline
function makeHoodRoll() {
  const points: Vector3[] = []
  const steps = 24
  for (let i = 0; i <= steps; i++) {
    const along = i / steps
    const angle = -0.75 + along * (Math.PI + 1.5)
    const back = Math.sin(Math.PI * along)
    points.push(new Vector3(0.088 * Math.cos(angle), 0.535 + 0.035 * back, -0.012 - 0.082 * Math.sin(angle) * (0.85 + 0.1 * back)))
  }
  const curve = new CatmullRomCurve3(points)
  const segments = 40
  const radial = 8
  const geometry = new TubeGeometry(curve, segments, 1, radial, false)
  const position = geometry.attributes.position
  const offset = new Vector3()
  for (let i = 0; i <= segments; i++) {
    const along = i / segments
    const radius = 0.012 + 0.026 * Math.sin(Math.PI * along) ** 0.8
    const center = curve.getPointAt(along)
    for (let j = 0; j <= radial; j++) {
      const k = i * (radial + 1) + j
      offset.fromBufferAttribute(position, k).sub(center).multiplyScalar(radius)
      offset.y *= 1.1
      position.setXYZ(k, center.x + offset.x, center.y + offset.y, center.z + offset.z)
    }
  }
  geometry.computeVertexNormals()
  return geometry
}
const HOOD_ROLL = makeHoodRoll()

// drawstrings: each comes out of the neckline where the hood's ends meet and lies down
// the chest on the hoodie's surface, with a metal tip
const DRAWSTRINGS = [-1, 1].map((side) => {
  const points: Vector3[] = []
  for (let up = 0.53; up >= 0.31; up -= 0.02) {
    const x = side * (0.03 + (0.53 - up) * 0.05)
    points.push(new Vector3(x, up, hoodieFront(x, up) + 0.006))
  }
  return { geometry: new TubeGeometry(new CatmullRomCurve3(points), 24, 0.0048, 6, false), tip: points[points.length - 1] }
})

// torso, hood, neck, glasses, drawstrings and head, all leaning together from the hips
function Torso() {
  const head = useRef<Group>(null!)

  useFrame(({ clock }) => {
    if (!head.current) return
    const { pitch, yaw, roll } = headAngles(clock.elapsedTime)
    head.current.rotation.set(pitch, yaw, roll)
  })

  return (
    <group position={HIP} rotation={[LEAN, 0, 0]}>
      <mesh geometry={TORSO_SHAPE} scale={[1, 1, TORSO_DEPTH]} castShadow receiveShadow>
        <meshStandardMaterial color={COLOR.hoodie} flatShading />
      </mesh>
      <mesh geometry={POCKET_SHAPE} scale={[1, 1, TORSO_DEPTH + 0.03]}>
        <meshStandardMaterial color={COLOR.hoodieTrim} flatShading side={DoubleSide} />
      </mesh>
      <Hood />
      {DRAWSTRINGS.map(({ geometry, tip }, i) => (
        <group key={i}>
          <mesh geometry={geometry}>
            <meshStandardMaterial color={COLOR.drawstring} flatShading />
          </mesh>
          <mesh position={[tip.x, tip.y - 0.006, tip.z]} rotation={[0.12, 0, 0]}>
            <cylinderGeometry args={[0.0065, 0.0065, 0.018, 6]} />
            <meshStandardMaterial color={COLOR.silver} metalness={0.8} roughness={0.3} />
          </mesh>
        </group>
      ))}
      <Glasses />
      {/* neck */}
      <mesh position={[0, 0.55, 0.01]}>
        <cylinderGeometry args={[0.05, 0.055, 0.1, 12]} />
        <meshStandardMaterial color={COLOR.skin} flatShading />
      </mesh>
      <group ref={head} position={HEAD_PIVOT}>
        <Head />
      </group>
    </group>
  )
}

// hood down: a thick rolled rim around the back and sides of the neck (open at the
// front, where the drawstrings come out), and the hood itself lying flat on my upper
// back, coming to a soft point
function Hood() {
  return (
    <group>
      <mesh geometry={HOOD_ROLL} castShadow>
        <meshStandardMaterial color={COLOR.hoodie} flatShading />
      </mesh>
    </group>
  )
}

// silver glasses hung from the middle of the neckline by one arm (tucked inside the
// collar, out of sight): the frame hangs vertically, one lens above the other
function Glasses() {
  return (
    <group position={[0, 0.45, hoodieFront(0, 0.45) + 0.008]} rotation={[-0.12, 0, 0.06]}>
      {[-1, 1].map((side) => (
        <group key={side} position={[0, side * 0.027, 0]}>
          <mesh>
            <torusGeometry args={[0.022, 0.0035, 6, 14]} />
            <meshStandardMaterial color={COLOR.silver} metalness={0.8} roughness={0.3} />
          </mesh>
          <mesh>
            <circleGeometry args={[0.021, 14]} />
            <meshStandardMaterial color="#dfe8ee" transparent opacity={0.25} roughness={0.05} side={DoubleSide} depthWrite={false} />
          </mesh>
        </group>
      ))}
      {/* bridge, on the side since the frame hangs sideways */}
      <mesh position={[0.012, 0, 0]}>
        <cylinderGeometry args={[0.0025, 0.0025, 0.012, 4]} />
        <meshStandardMaterial color={COLOR.silver} metalness={0.8} roughness={0.3} />
      </mesh>
    </group>
  )
}

// head, built facing +z around its center 0.12 above the neck
function Head() {
  return (
    <group>
      {/* skull and ears */}
      <mesh position={[0, 0.12, 0]} scale={[0.93, 1.08, 1]} castShadow>
        <icosahedronGeometry args={[0.108, 1]} />
        <meshStandardMaterial color={COLOR.skin} flatShading />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * 0.1, 0.115, -0.005]} scale={[0.5, 1, 0.8]}>
          <icosahedronGeometry args={[0.028, 0]} />
          <meshStandardMaterial color={COLOR.skin} flatShading />
        </mesh>
      ))}
      {/* eyes, brows, a hint of a nose */}
      {[-1, 1].map((side) => (
        <group key={side}>
          <mesh position={[side * 0.036, 0.125, 0.102]}>
            <boxGeometry args={[0.022, 0.011, 0.006]} />
            <meshBasicMaterial color={COLOR.eyes} />
          </mesh>
          <mesh position={[side * 0.037, 0.148, 0.099]} rotation={[0, 0, side * -0.08]}>
            <boxGeometry args={[0.03, 0.007, 0.006]} />
            <meshBasicMaterial color={COLOR.hair} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 0.1, 0.108]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.012, 0.03, 4]} />
        <meshStandardMaterial color={COLOR.skinShade} flatShading />
      </mesh>
      <Hair />
      {/* AirPods Pro: bud in the ear, stem pointing down */}
      {[-1, 1].map((side) => (
        <group key={side} position={[side * 0.11, 0.11, -0.004]}>
          <mesh>
            <icosahedronGeometry args={[0.011, 0]} />
            <meshStandardMaterial color={COLOR.airpods} roughness={0.3} />
          </mesh>
          <mesh position={[0, -0.018, 0.003]} rotation={[-0.15, 0, 0]}>
            <boxGeometry args={[0.007, 0.028, 0.007]} />
            <meshStandardMaterial color={COLOR.airpods} roughness={0.3} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

// hair: one low-poly shell around the skull. each point of an icosphere is pushed out
// past the skull (hair) or pulled inside it (face, ears, neck), so the hairline is one
// clean edge. the hairline is highest at the middle part and sweeps down into curtain
// bangs over the brows, comes down in sideburns, arcs over the ears (short two-block sides), and comes down
// to the nape at the back. fuller on top, with a groove for the part
const SKULL = { center: new Vector3(0, 0.12, 0), radii: new Vector3(0.108 * 0.93, 0.108 * 1.08, 0.108) }

// [angle around the head, radians: 0 = the part, PI = the back; hairline height as the
// y of a unit direction from the skull's center]
const HAIRLINE: [number, number][] = [
  [0, 0.52],
  [0.2, 0.36],
  [0.45, 0.25], // curtain bangs, down to the brows
  [0.8, 0.17],
  [1.0, -0.02],
  [1.2, -0.2], // sideburns, down flush with the front of the ear
  [1.38, -0.16],
  [1.5, 0.1],
  [1.62, 0.23], // a gentle arc just over the top of the ear
  [1.74, 0.1],
  [1.86, -0.45], // then down behind it, filling in toward the back
  [2.05, -0.74],
  [2.4, -0.86],
  [Math.PI, -0.88], // nape
]

function hairlineAt(angle: number) {
  for (let i = 1; i < HAIRLINE.length; i++) {
    const [a1, h1] = HAIRLINE[i]
    if (angle <= a1) {
      const [a0, h0] = HAIRLINE[i - 1]
      return MathUtils.lerp(h0, h1, MathUtils.smoothstep(angle, a0, a1))
    }
  }
  return HAIRLINE[HAIRLINE.length - 1][1]
}

function makeHair() {
  const s = MathUtils.smoothstep
  const geometry = new IcosahedronGeometry(1, 4)
  const position = geometry.attributes.position
  const d = new Vector3()
  for (let i = 0; i < position.count; i++) {
    d.fromBufferAttribute(position, i).normalize()
    const around = Math.atan2(d.x, d.z)
    const angle = Math.abs(around)
    const line = hairlineAt(angle)
    // across the back the edge fades in over a wider band, so it lies flat on the nape
    const backness = s(angle, 1.8, 2.4)
    const covered = s(d.y, line - 0.02 - 0.03 * backness, line + 0.05 + 0.1 * backness)
    // volume: fuller on top and at the crown
    let thickness = 0.07 + 0.24 * s(d.y, 0, 0.9) + 0.05 * s(-d.z, 0, 0.8) * s(d.y, -0.2, 0.5)
    // curtain bangs bulge out a little as they sweep to the sides
    thickness += 0.07 * Math.exp(-(((angle - 0.55) / 0.4) ** 2)) * s(d.y, 0.1, 0.45)
    // short sides
    thickness -= 0.035 * Math.exp(-(((angle - 1.7) / 0.3) ** 2)) * (1 - s(d.y, 0.2, 0.6))
    // the part
    thickness -= 0.11 * Math.exp(-((d.x / 0.09) ** 2)) * s(d.z, -0.2, 0.5) * s(d.y, 0.3, 0.7)
    // soft ridges, like locks running down
    thickness += 0.03 * Math.abs(Math.sin(around * 5)) * s(d.y, 0.85, 0.3)
    // tapers in toward the nape
    thickness *= MathUtils.lerp(0.45, 1, s(d.y, -0.85, -0.1))
    thickness *= MathUtils.lerp(1, MathUtils.lerp(0.4, 1, s(d.y, line, line + 0.3)), backness)
    const scale = MathUtils.lerp(0.8, 1 + thickness, covered)
    position.setXYZ(
      i,
      SKULL.center.x + d.x * SKULL.radii.x * scale,
      SKULL.center.y + d.y * SKULL.radii.y * scale,
      SKULL.center.z + d.z * SKULL.radii.z * scale,
    )
  }
  geometry.computeVertexNormals()
  return geometry
}
const HAIR = makeHair()

function Hair() {
  return (
    <mesh geometry={HAIR} castShadow>
      <meshStandardMaterial color={COLOR.hair} flatShading />
    </mesh>
  )
}

// both arms, the watch and my coffee, all moved every frame:
// typing, and now and then reaching over for a sip
function Arms() {
  const parts = useRef<Record<string, Mesh | Group>>({})
  const set = (key: string) => (object: Mesh | Group | null) => {
    if (object) parts.current[key] = object
  }
  const shoulders = useMemo(() => [torso(-0.17, 0.47, 0), torso(0.17, 0.47, 0)], [])
  const scratch = useMemo(() => ({ wrist: new Vector3(), elbow: new Vector3(), pole: new Vector3(), cup: new Vector3(), q: new Quaternion() }), [])

  useFrame(({ clock }) => {
    // every piece has to be mounted first. a missing one would throw here, and a throw
    // inside useFrame stops the whole scene from drawing
    const p = parts.current
    if (!p.cup || !p.watch || [0, 1].some((i) => !p[`upper${i}`] || !p[`fore${i}`] || !p[`hand${i}`] || !p[`shoulder${i}`] || !p[`elbow${i}`])) return
    const t = clock.elapsedTime
    const { wrist, elbow, pole, cup } = scratch
    const { toCup, back, holding, reaching, up } = sipPose(t)

    // where the cup is: resting, or carried up so its rim meets my lips, tipped a little
    const { pitch } = headAngles(t)
    const lips = LIPS.clone().applyAxisAngle(X_AXIS, pitch).add(HEAD_PIVOT)
    const atLips = torso(lips.x, lips.y, lips.z).sub(RIM)
    cup.copy(CUP_REST).lerp(atLips, up)
    const tilt = CUP_TILT * up * up
    const cupGroup = parts.current.cup as Group
    cupGroup.position.copy(cup)
    cupGroup.rotation.x = tilt

    ;[-1, 1].forEach((side, i) => {
      const shoulder = shoulders[i]
      // typing: quick small taps, a little drift side to side
      const tap = Math.max(0, Math.sin(t * 13 + i * 2.1)) ** 8 * 0.012
      wrist.set(SX + side * KEYS.x + Math.sin(t * 1.3 + i) * 0.008, KEYS.y + tap, KEYS.z)
      pole.set(side * 0.6, -0.8, -0.2)
      // my right hand (-x) goes for the coffee during the sip
      if (side === -1 && reaching) {
        const grip = cup.clone().add(GRIP.clone().applyAxisAngle(X_AXIS, tilt))
        wrist.lerp(grip, holding ? 1 : toCup * (1 - back))
        pole.set(-0.8, -0.6, 0)
      }
      reach(shoulder, wrist, pole, elbow)
      placeLimb(parts.current[`upper${i}`] as Mesh, shoulder, elbow, 0.056)
      placeLimb(parts.current[`fore${i}`] as Mesh, elbow, wrist, 0.047)
      // rounded joints where the pieces meet, so the arm reads as one sleeve
      parts.current[`shoulder${i}`].position.copy(shoulder)
      parts.current[`elbow${i}`].position.copy(elbow)
      // hand: flat-ish, pointing on along the forearm
      const dir = wrist.clone().sub(elbow)
      dir.y *= 0.3
      dir.normalize()
      const hand = parts.current[`hand${i}`] as Mesh
      hand.position.copy(wrist).addScaledVector(dir, 0.05)
      hand.quaternion.setFromUnitVectors(FORWARD, dir)
      // the watch sits on my left wrist (+x)
      if (side === 1) {
        const watch = parts.current.watch as Group
        const along = wrist.clone().sub(elbow).normalize()
        watch.position.copy(wrist).addScaledVector(along, -0.035)
        watch.quaternion.setFromUnitVectors(FORWARD, along)
      }
    })
  })

  return (
    <group>
      {[0, 1].map((i) => (
        <group key={i}>
          <mesh ref={set(`upper${i}`)} geometry={LIMB} castShadow>
            <meshStandardMaterial color={COLOR.hoodie} flatShading />
          </mesh>
          <mesh ref={set(`fore${i}`)} geometry={LIMB} castShadow>
            <meshStandardMaterial color={COLOR.hoodie} flatShading />
          </mesh>
          <mesh ref={set(`shoulder${i}`)}>
            <icosahedronGeometry args={[0.058, 1]} />
            <meshStandardMaterial color={COLOR.hoodie} flatShading />
          </mesh>
          <mesh ref={set(`elbow${i}`)}>
            <icosahedronGeometry args={[0.047, 1]} />
            <meshStandardMaterial color={COLOR.hoodie} flatShading />
          </mesh>
          <mesh ref={set(`hand${i}`)} castShadow>
            <boxGeometry args={[0.07, 0.028, 0.1]} />
            <meshStandardMaterial color={COLOR.skin} flatShading />
          </mesh>
        </group>
      ))}
      {/* silver watch: band around the wrist, face on top */}
      <group ref={set('watch')}>
        <mesh>
          <torusGeometry args={[0.043, 0.008, 4, 10]} />
          <meshStandardMaterial color={COLOR.silver} metalness={0.8} roughness={0.3} />
        </mesh>
        <mesh position={[0, 0.045, 0]}>
          <boxGeometry args={[0.03, 0.008, 0.034]} />
          <meshStandardMaterial color={COLOR.silver} metalness={0.8} roughness={0.25} />
        </mesh>
      </group>
      {/* my coffee, handle pointing away from the laptop */}
      <group ref={set('cup')}>
        <CoffeeCup position={[0, 0, 0]} rotationY={Math.PI} steam />
      </group>
    </group>
  )
}

// on the floor to my left, leaning against the chair leg
function Backpack() {
  return (
    <group position={[SX + 0.42, 0, SZ + 0.05]} rotation={[-0.08, 0.4, 0]}>
      <mesh position={[0, 0.2, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.3, 0.4, 0.17]} />
        <meshStandardMaterial color={COLOR.backpack} flatShading />
      </mesh>
      <mesh position={[0, 0.41, 0]} scale={[1, 0.4, 0.6]} castShadow>
        <icosahedronGeometry args={[0.15, 0]} />
        <meshStandardMaterial color={COLOR.backpack} flatShading />
      </mesh>
      {/* front pocket, carry handle, shoulder straps on the back */}
      <mesh position={[0, 0.14, 0.1]} castShadow>
        <boxGeometry args={[0.22, 0.16, 0.05]} />
        <meshStandardMaterial color={COLOR.backpackTrim} flatShading />
      </mesh>
      <mesh position={[0, 0.46, 0]}>
        <torusGeometry args={[0.035, 0.008, 4, 8, Math.PI]} />
        <meshStandardMaterial color={COLOR.backpackTrim} flatShading />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * 0.07, 0.22, -0.095]}>
          <boxGeometry args={[0.04, 0.34, 0.015]} />
          <meshStandardMaterial color={COLOR.backpackTrim} flatShading />
        </mesh>
      ))}
    </group>
  )
}
