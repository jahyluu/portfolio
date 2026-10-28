import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { CatmullRomCurve3, DoubleSide, Group, LatheGeometry, MathUtils, Mesh, Quaternion, TubeGeometry, Vector2, Vector3 } from 'three'
import { Blob, LIMB, Limb, makeHairShell, placeLimb, reach, type Hairline } from './body'
import { LAPTOP, ME, MY_TABLE, TABLE_HEIGHT, type Vec3 } from './layout'
import { COLOR } from './palette'
import { Chair } from './primitives'
import { CoffeeCup } from './Tabletop'

// me. faces +z (laptop), my right is -x, which is the side the camera passes.
// typing loop + a sip of coffee every 16s.
// careful with LEAN, the camera only clears my head/shoulder by ~7cm

const LEAN = 0.16 // radians
const HEAD_PITCH = 0.35
const ARM = { upper: 0.31, fore: 0.31 }
const [SX, , SZ] = ME.position
const HIP = new Vector3(SX, 0.53, SZ)
// wrist rest position on the keyboard
const KEYS = { x: 0.085, y: TABLE_HEIGHT + 0.045, z: LAPTOP.position[2] - 0.1 }
// coffee to my right
const CUP_REST = new Vector3(MY_TABLE.position[0] - 0.38, TABLE_HEIGHT, MY_TABLE.position[2] - 0.22)
// wrist offset from the cup when holding the handle
const GRIP = new Vector3(-0.075, 0.055, -0.02)
const SIP = { period: 16, start: 10 } // seconds

// torso-local (x, up, forward) -> world, includes the lean
function torso(x: number, up: number, forward: number, out = new Vector3()) {
  const c = Math.cos(LEAN)
  const s = Math.sin(LEAN)
  return out.set(HIP.x + x, HIP.y + up * c - forward * s, HIP.z + up * s + forward * c)
}

const FORWARD = new Vector3(0, 0, 1)
const ease = (t: number) => MathUtils.smoothstep(t, 0, 1)

// sip stages as 0-1 values. `up` = how far into the actual drink
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

// idle head motion, damped while drinking
function headAngles(t: number) {
  const { up } = sipPose(t)
  return {
    pitch: HEAD_PITCH + Math.sin(t * 0.7) * 0.02 * (1 - up) - up * 0.18,
    yaw: Math.sin(t * 0.4) * 0.07 * (1 - up),
    roll: Math.sin(t * 0.3) * 0.02 * (1 - up),
  }
}

// torso-local
const HEAD_PIVOT = new Vector3(0, 0.585, 0.01)
const LIPS = new Vector3(0, 0.072, 0.1)
const CUP_TILT = -0.32
const X_AXIS = new Vector3(1, 0, 0)
// near rim point relative to the cup base, tilted
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
            {/* knee */}
            <mesh position={knee}>
              <icosahedronGeometry args={[0.062, 1]} />
              <meshStandardMaterial color={COLOR.sweats} flatShading />
            </mesh>
            {/* shoe */}
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
      {/* hips */}
      <Blob position={[SX, 0.56, SZ + 0.01]} radii={[0.15, 0.06, 0.095]} color={COLOR.sweats} />
    </group>
  )
}

// hoodie lathe profile, [radius, height above hips]. hem flares slightly
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
  [0.06, 0.55], // neck
  [0, 0.55],
]
const TORSO_DEPTH = 0.6 // z scale
const TORSO_SHAPE = new LatheGeometry(
  TORSO_OUTLINE.map(([r, y]) => new Vector2(r, y)),
  16,
)
// kangaroo pocket
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
// z of the hoodie's front surface at (x, up). used to lay the drawstrings on it
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

// hood (down) as a tube around the neck, thicker at the back
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

// drawstrings follow the hoodie surface
const DRAWSTRINGS = [-1, 1].map((side) => {
  const points: Vector3[] = []
  for (let up = 0.53; up >= 0.31; up -= 0.02) {
    const x = side * (0.03 + (0.53 - up) * 0.05)
    points.push(new Vector3(x, up, hoodieFront(x, up) + 0.006))
  }
  return { geometry: new TubeGeometry(new CatmullRomCurve3(points), 24, 0.0048, 6, false), tip: points[points.length - 1] }
})

// everything that leans with the torso
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

// hood roll
function Hood() {
  return (
    <group>
      <mesh geometry={HOOD_ROLL} castShadow>
        <meshStandardMaterial color={COLOR.hoodie} flatShading />
      </mesh>
    </group>
  )
}

// glasses hooked on the collar, hanging vertically
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
      {/* bridge */}
      <mesh position={[0.012, 0, 0]}>
        <cylinderGeometry args={[0.0025, 0.0025, 0.012, 4]} />
        <meshStandardMaterial color={COLOR.silver} metalness={0.8} roughness={0.3} />
      </mesh>
    </group>
  )
}

// skull center is 0.12 above the pivot
function Head() {
  return (
    <group>
      {/* skull + ears */}
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
      {/* face */}
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
      {/* airpods */}
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

// two-block middle part, see makeHairShell in body.tsx
const SKULL = { center: new Vector3(0, 0.12, 0), radii: new Vector3(0.108 * 0.93, 0.108 * 1.08, 0.108) }

// [angle, height], 0 = front
const HAIRLINE: Hairline = [
  [0, 0.52],
  [0.2, 0.36],
  [0.45, 0.25], // bangs
  [0.8, 0.17],
  [1.0, -0.02],
  [1.2, -0.2], // sideburn
  [1.38, -0.16],
  [1.5, 0.1],
  [1.62, 0.23], // over the ear
  [1.74, 0.1],
  [1.86, -0.45], // behind the ear
  [2.05, -0.74],
  [2.4, -0.86],
  [Math.PI, -0.88], // nape
]

const HAIR = makeHairShell({
  skull: SKULL,
  hairline: HAIRLINE,
  // softer edge at the back so it doesn't stick out at the nape
  edge: (angle, line) => {
    const backness = MathUtils.smoothstep(angle, 1.8, 2.4)
    return [line - 0.02 - 0.03 * backness, line + 0.05 + 0.1 * backness]
  },
  thickness: (d, angle, around, line) => {
    const s = MathUtils.smoothstep
    const backness = s(angle, 1.8, 2.4)
    // more volume on top
    let thickness = 0.07 + 0.24 * s(d.y, 0, 0.9) + 0.05 * s(-d.z, 0, 0.8) * s(d.y, -0.2, 0.5)
    // bangs
    thickness += 0.07 * Math.exp(-(((angle - 0.55) / 0.4) ** 2)) * s(d.y, 0.1, 0.45)
    // short sides
    thickness -= 0.035 * Math.exp(-(((angle - 1.7) / 0.3) ** 2)) * (1 - s(d.y, 0.2, 0.6))
    // part
    thickness -= 0.11 * Math.exp(-((d.x / 0.09) ** 2)) * s(d.z, -0.2, 0.5) * s(d.y, 0.3, 0.7)
    // ridges
    thickness += 0.03 * Math.abs(Math.sin(around * 5)) * s(d.y, 0.85, 0.3)
    // taper at the nape
    thickness *= MathUtils.lerp(0.45, 1, s(d.y, -0.85, -0.1))
    thickness *= MathUtils.lerp(1, MathUtils.lerp(0.4, 1, s(d.y, line, line + 0.3)), backness)
    return thickness
  },
})

function Hair() {
  return (
    <mesh geometry={HAIR} castShadow>
      <meshStandardMaterial color={COLOR.hair} flatShading />
    </mesh>
  )
}

// arms, watch and cup, updated every frame
function Arms() {
  const parts = useRef<Record<string, Mesh | Group>>({})
  const set = (key: string) => (object: Mesh | Group | null) => {
    if (object) parts.current[key] = object
  }
  const shoulders = useMemo(() => [torso(-0.17, 0.47, 0), torso(0.17, 0.47, 0)], [])
  const scratch = useMemo(() => ({ wrist: new Vector3(), elbow: new Vector3(), pole: new Vector3(), cup: new Vector3(), q: new Quaternion() }), [])

  useFrame(({ clock }) => {
    // bail until all refs exist, a throw in useFrame kills the render loop
    const p = parts.current
    if (!p.cup || !p.watch || [0, 1].some((i) => !p[`upper${i}`] || !p[`fore${i}`] || !p[`hand${i}`] || !p[`shoulder${i}`] || !p[`elbow${i}`])) return
    const t = clock.elapsedTime
    const { wrist, elbow, pole, cup } = scratch
    const { toCup, back, holding, reaching, up } = sipPose(t)

    // cup goes from the table to my lips
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
      // typing
      const tap = Math.max(0, Math.sin(t * 13 + i * 2.1)) ** 8 * 0.012
      wrist.set(SX + side * KEYS.x + Math.sin(t * 1.3 + i) * 0.008, KEYS.y + tap, KEYS.z)
      pole.set(side * 0.6, -0.8, -0.2)
      // right hand grabs the cup during the sip
      if (side === -1 && reaching) {
        const grip = cup.clone().add(GRIP.clone().applyAxisAngle(X_AXIS, tilt))
        wrist.lerp(grip, holding ? 1 : toCup * (1 - back))
        pole.set(-0.8, -0.6, 0)
      }
      reach(shoulder, wrist, pole, elbow, ARM.upper, ARM.fore)
      placeLimb(parts.current[`upper${i}`] as Mesh, shoulder, elbow, 0.056)
      placeLimb(parts.current[`fore${i}`] as Mesh, elbow, wrist, 0.047)
      // joint spheres
      parts.current[`shoulder${i}`].position.copy(shoulder)
      parts.current[`elbow${i}`].position.copy(elbow)
      // hand
      const dir = wrist.clone().sub(elbow)
      dir.y *= 0.3
      dir.normalize()
      const hand = parts.current[`hand${i}`] as Mesh
      hand.position.copy(wrist).addScaledVector(dir, 0.05)
      hand.quaternion.setFromUnitVectors(FORWARD, dir)
      // watch on the left wrist
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
      {/* watch */}
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
      {/* coffee */}
      <group ref={set('cup')}>
        <CoffeeCup position={[0, 0, 0]} rotationY={Math.PI} steam />
      </group>
    </group>
  )
}

// on the floor, left of the chair
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
      {/* pocket, handle, straps */}
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
