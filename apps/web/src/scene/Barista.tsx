import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { DoubleSide, Group, LatheGeometry, MathUtils, Mesh, Vector2, Vector3 } from 'three'
import { BAR, BOUNDS, type Vec3 } from './layout'
import { COLOR } from './palette'
import { Blob, LIMB, makeHairShell, placeLimb, reach, type Hairline } from './body'
import { Sneaker, sneakerColors } from './Sneakers'
import { CoffeeCup } from './Tabletop'

// barista. runs a ~1.5 min loop with pauses: bus a cup, grind, pull a shot, serve,
// wipe the bar, check the pastry case, use the register, walk back.
// built facing +z (+x is her left). coords are local unless marked world

// --- spots behind the bar (world)
const BACK_WALL = BOUNDS.minZ + 0.02 // wainscot face
const COUNTER_FRONT = BACK_WALL + BAR.backDepth
const BAR_BACK = BAR.frontZ - BAR.depth // barista side of the bar
const AISLE_Z = (COUNTER_FRONT + BAR_BACK) / 2
const GEAR_OFFSET = 0.55 // keep in sync with BackWall.tsx

const SPOT = {
  // drink pickup spot
  pickup: new Vector3(2.03, BAR.height, BAR_BACK + 0.12),
  // right group head
  dripTray: new Vector3(1.75 + GEAR_OFFSET, BAR.backHeight + 0.03, COUNTER_FRONT - 0.07),
  groupHandle: new Vector3(1.75 + GEAR_OFFSET, BAR.backHeight + 0.11, COUNTER_FRONT - 0.03),
  warmCups: new Vector3(1.45 + GEAR_OFFSET, BAR.backHeight + 0.47, COUNTER_FRONT - 0.18),
  grinderSpout: new Vector3(0.85 + GEAR_OFFSET, BAR.backHeight + 0.16, COUNTER_FRONT - 0.12),
  grinderTop: new Vector3(0.85 + GEAR_OFFSET + 0.05, BAR.backHeight + 0.3, COUNTER_FRONT - 0.22),
  tub: new Vector3(0.9, BAR.backHeight + 0.12, COUNTER_FRONT - 0.2),
  registerScreen: new Vector3(-0.45, BAR.height + 0.28, BAR.frontZ - BAR.depth / 2 - 0.08),
  pastryDoor: new Vector3(0.3, BAR.height + 0.22, BAR_BACK + 0.06),
  pastryTop: new Vector3(0.55, BAR.height + 0.46, BAR_BACK + 0.08),
}
// standing x for each task (world)
const AT = { pickup: 2.15, tub: 0.9, grinder: 1.4, espresso: 2.3, wipe: 2.6, pastry: 0.35, register: -0.45 }
const FACE = { bar: 0, back: Math.PI }

// --- body (local, feet at y=0)
const HIP_Y = 0.92
const LEG = { upper: 0.43, lower: 0.42, apart: 0.09 }
const ARM = { upper: 0.29, fore: 0.28 }
const SHOULDER = { x: 0.18, up: 0.47 } // relative to hips, pre-lean
const NECK_UP = 0.53
const HEAD_UP = 0.57 // head pivot above hips

// hand/look target, either world or local space
type Local = { local: Vector3 }
type Target = { world: Vector3 } | Local
const world = (v: Vector3): Target => ({ world: v })
const local = (x: number, y: number, z: number): Local => ({ local: new Vector3(x, y, z) })

// resting hand poses
const REST = { right: local(-0.21, 0.86, 0.04), left: local(0.21, 0.86, 0.04) }
const ON_BAR = { right: local(-0.2, BAR.height + 0.03, 0.4), left: local(0.2, BAR.height + 0.03, 0.4) }
const CARRY = local(-0.16, 1.02, 0.3)

type CupState = 'bar' | 'hand' | 'tray' | 'gone'

type Step = {
  seconds: number
  x: number // world x at the end of the step, walks if it changed
  face: number
  right?: Target | ((p: number, t: number) => Target)
  left?: Target | ((p: number, t: number) => Target)
  look?: Target | ((p: number, t: number) => Target)
  lean?: number
  rag?: boolean
  cup?: { state: CupState; at: number } // cup changes state at this fraction of the step
}

const ahead = local(0, 1.5, 1.5)
const ON_COUNTER = { right: local(-0.2, BAR.backHeight + 0.03, 0.4), left: local(0.2, BAR.backHeight + 0.03, 0.4) }

// idle step, slowly looks around
function idle(seconds: number, x: number, face: number, hands: { right: Local; left: Local } = REST): Step {
  return { seconds, x, face, ...hands, look: (_, t) => local(Math.sin(t * 0.22) * 1.1, 1.45 + Math.sin(t * 0.13) * 0.1, 1.5) }
}

// the loop. starts with last loop's drink still on the bar
const ROUTINE: Step[] = [
  idle(7, AT.pickup, FACE.bar, ON_BAR),
  // bus the cup
  { seconds: 1.8, x: AT.pickup, face: FACE.bar, right: world(SPOT.pickup), left: ON_BAR.left, look: world(SPOT.pickup), lean: 0.22, cup: { state: 'hand', at: 0.75 } },
  { seconds: 3.4, x: AT.tub, face: FACE.back, right: CARRY, left: REST.left, look: world(SPOT.tub) },
  { seconds: 1.8, x: AT.tub, face: FACE.back, right: world(SPOT.tub), left: REST.left, look: world(SPOT.tub), lean: 0.2, cup: { state: 'gone', at: 0.7 } },
  idle(3, AT.tub, FACE.back),
  // grind
  { seconds: 1.6, x: AT.grinder, face: FACE.back, ...REST, look: world(SPOT.grinderSpout) },
  {
    seconds: 4.5,
    x: AT.grinder,
    face: FACE.back,
    right: (_, t) => ({ world: SPOT.grinderSpout.clone().add(new Vector3(Math.sin(t * 6) * 0.005, 0, 0)) }),
    left: world(SPOT.grinderTop),
    look: world(SPOT.grinderSpout),
    lean: 0.2,
  },
  // espresso: lock in, grab a cup off the top, place it, pull
  { seconds: 2.2, x: AT.espresso, face: FACE.back, right: local(-0.12, 1.0, 0.25), left: REST.left, look: world(SPOT.groupHandle) },
  { seconds: 1.8, x: AT.espresso, face: FACE.back, right: world(SPOT.groupHandle), left: (p) => (p > 0.3 ? world(SPOT.groupHandle.clone().add(new Vector3(0.08, 0, 0))) : REST.left), look: world(SPOT.groupHandle), lean: 0.18 },
  { seconds: 1.8, x: AT.espresso, face: FACE.back, right: world(SPOT.warmCups), left: REST.left, look: world(SPOT.warmCups), lean: 0.22, cup: { state: 'hand', at: 0.7 } },
  { seconds: 1.6, x: AT.espresso, face: FACE.back, right: world(SPOT.dripTray.clone().add(new Vector3(0, 0.08, 0.02))), left: REST.left, look: world(SPOT.dripTray), lean: 0.25, cup: { state: 'tray', at: 0.75 } },
  // wait for the shot
  { seconds: 6, x: AT.espresso, face: FACE.back, ...ON_COUNTER, look: world(SPOT.dripTray), lean: 0.12 },
  { seconds: 1.6, x: AT.espresso, face: FACE.back, right: world(SPOT.dripTray.clone().add(new Vector3(0, 0.08, 0.02))), left: REST.left, look: world(SPOT.dripTray), lean: 0.25, cup: { state: 'hand', at: 0.6 } },
  // serve
  { seconds: 2.4, x: AT.pickup, face: FACE.bar, right: CARRY, left: REST.left, look: world(SPOT.pickup) },
  { seconds: 1.8, x: AT.pickup, face: FACE.bar, right: world(SPOT.pickup.clone().add(new Vector3(0, 0.08, 0))), left: ON_BAR.left, look: world(SPOT.pickup), lean: 0.2, cup: { state: 'bar', at: 0.7 } },
  idle(6, AT.pickup, FACE.bar, ON_BAR),
  // wipe
  { seconds: 1.4, x: AT.wipe, face: FACE.bar, ...REST, look: local(0, BAR.height, 0.5) },
  {
    seconds: 6,
    x: AT.wipe,
    face: FACE.bar,
    right: (_, t) => local(-0.12 + Math.cos(t * 2) * 0.09, BAR.height + 0.04, 0.47 + Math.sin(t * 2) * 0.05),
    left: local(0.22, BAR.height + 0.03, 0.38),
    look: (_, t) => local(-0.12 + Math.cos(t * 2) * 0.04, BAR.height, 0.5),
    lean: 0.2,
    rag: true,
  },
  idle(5, AT.wipe, FACE.bar),
  // pastry case
  { seconds: 4.4, x: AT.pastry, face: FACE.bar, ...REST, look: ahead },
  { seconds: 5, x: AT.pastry, face: FACE.bar, right: world(SPOT.pastryDoor), left: world(SPOT.pastryTop), look: world(SPOT.pastryDoor.clone().add(new Vector3(0, -0.05, 0.25))), lean: 0.25 },
  idle(4, AT.pastry, FACE.bar),
  // register
  { seconds: 2, x: AT.register, face: FACE.bar, ...REST, look: world(SPOT.registerScreen) },
  {
    seconds: 4,
    x: AT.register,
    face: FACE.bar,
    // taps
    right: (p) => world(SPOT.registerScreen.clone().add(new Vector3(Math.sin(p * 5) * 0.05, -0.02, -0.07 + Math.max(0, Math.sin(p * 22)) * 0.03))),
    left: ON_BAR.left,
    look: world(SPOT.registerScreen),
    lean: 0.24,
  },
  idle(5, AT.register, FACE.bar, ON_BAR),
  // walk back
  { seconds: 5.2, x: AT.pickup, face: FACE.bar, ...REST, look: ahead },
]
const LOOP = ROUTINE.reduce((sum, step) => sum + step.seconds, 0)
// precomputed start times + previous step
const STARTS = ROUTINE.map((_, i) => ROUTINE.slice(0, i).reduce((sum, step) => sum + step.seconds, 0))
const BEFORE = ROUTINE.map((_, i) => ROUTINE[(i - 1 + ROUTINE.length) % ROUTINE.length])

const ease = (t: number) => MathUtils.smoothstep(t, 0, 1)
const resolve = (target: Step['right'], fallback: Target, p: number, t: number): Target => (typeof target === 'function' ? target(p, t) : (target ?? fallback))

// cup state at loop time u
function cupAt(u: number): CupState {
  let state: CupState = 'bar'
  for (let i = 0; i < ROUTINE.length; i++) {
    const { cup, seconds } = ROUTINE[i]
    if (!cup) continue
    if (u >= STARTS[i] + cup.at * seconds) state = cup.state
  }
  return state
}

// --- shapes
// torso lathe profile, [radius, height]
const SHIRT_OUTLINE: [number, number][] = [
  [0, -0.03],
  [0.15, -0.03],
  [0.16, 0.04],
  [0.15, 0.16],
  [0.155, 0.28],
  [0.17, 0.4],
  [0.165, 0.45],
  [0.13, 0.49],
  [0.08, 0.51],
  [0.05, 0.53],
  [0, 0.53],
]
const TORSO_DEPTH = 0.62
const SHIRT = new LatheGeometry(
  SHIRT_OUTLINE.map(([r, y]) => new Vector2(r, y)),
  14,
)
// apron bib (partial lathe)
const APRON_BIB = new LatheGeometry(
  [
    [0.152, -0.02],
    [0.158, 0.16],
    [0.162, 0.3],
    [0.172, 0.38],
  ].map(([r, y]) => new Vector2(r + 0.006, y)),
  8,
  -0.62,
  1.24,
)
// apron skirt
const APRON_SKIRT = new LatheGeometry(
  [
    [0.17, 0.02],
    [0.18, -0.15],
    [0.2, -0.38],
  ].map(([r, y]) => new Vector2(r, y)),
  10,
  -1.0,
  2.0,
)

const SKULL = { center: new Vector3(0, 0.12, 0), radii: new Vector3(0.1, 0.115, 0.106) }
// pulled back into a low bun
const HAIRLINE: Hairline = [
  [0, 0.5],
  [0.6, 0.42],
  [1.05, 0.25], // temples
  [1.35, 0.2],
  [1.6, 0.3], // over the ears
  [1.85, 0.05],
  [2.3, -0.4],
  [Math.PI, -0.6],
]
const HAIR = makeHairShell({
  skull: SKULL,
  hairline: HAIRLINE,
  thickness: (d) => 0.05 + 0.07 * MathUtils.smoothstep(d.y, 0.1, 0.9) + 0.02 * MathUtils.smoothstep(-d.z, 0.2, 0.9),
  detail: 3,
})

export function Barista() {
  const root = useRef<Group>(null!)
  const torso = useRef<Group>(null!)
  const head = useRef<Group>(null!)
  const cup = useRef<Group>(null!)
  const rag = useRef<Mesh>(null!)
  const parts = useRef<Record<string, Mesh>>({})
  const shoes = useRef<Group[]>([])
  const set = (key: string) => (object: Mesh | null) => {
    if (object) parts.current[key] = object
  }
  // damped values, persist across frames
  const state = useMemo(
    () => ({
      right: REST.right.local.clone(),
      left: REST.left.local.clone(),
      look: new Vector3(0, 1.5, 1),
      lean: 0,
      x: AT.pickup,
      gait: 0,
      stride: 0,
      lastX: AT.pickup,
      lastYaw: 0,
    }),
    [],
  )

  useFrame(({ clock }, delta) => {
    const p = parts.current
    const ready = root.current && torso.current && head.current && cup.current && rag.current
    const limbs = ['thigh', 'shin', 'upper', 'fore', 'hand', 'elbow', 'shoulder'].every((k) => p[`${k}0`] && p[`${k}1`]) && shoes.current.length === 2
    if (!ready || !limbs) return
    const t = clock.elapsedTime
    const dt = Math.min(delta, 0.1)
    const u = t % LOOP

    // current step + progress
    let i = ROUTINE.length - 1
    while (i > 0 && u < STARTS[i]) i--
    const step = ROUTINE[i]
    const progress = MathUtils.clamp((u - STARTS[i]) / step.seconds, 0, 1)
    const before = BEFORE[i]

    // position + facing, eased over the step
    const move = ease(progress)
    const x = MathUtils.lerp(before.x, step.x, move)
    const yaw = MathUtils.lerp(before.face, step.face, move)
    root.current.position.set(x, 0, AISLE_Z)
    root.current.rotation.y = yaw

    // gait while moving or turning
    const speed = Math.abs(x - state.lastX) / Math.max(dt, 1e-3) + Math.abs(yaw - state.lastYaw) / Math.max(dt, 1e-3) * 0.25
    state.lastX = x
    state.lastYaw = yaw
    state.stride = MathUtils.damp(state.stride, MathUtils.clamp(speed / 0.7, 0, 1), 8, dt)
    state.gait += dt * (4 + speed * 6) * (state.stride > 0.02 ? 1 : 0)

    const toLocal = (target: Target) => ('local' in target ? target.local.clone() : root.current.worldToLocal(target.world.clone()))

    // ease hands/look/lean toward this step's targets
    const right = toLocal(resolve(step.right, REST.right, progress, t))
    const left = toLocal(resolve(step.left, REST.left, progress, t))
    const look = toLocal(resolve(step.look, ahead, progress, t))
    state.right.x = MathUtils.damp(state.right.x, right.x, 4.5, dt)
    state.right.y = MathUtils.damp(state.right.y, right.y, 4.5, dt)
    state.right.z = MathUtils.damp(state.right.z, right.z, 4.5, dt)
    state.left.x = MathUtils.damp(state.left.x, left.x, 4.5, dt)
    state.left.y = MathUtils.damp(state.left.y, left.y, 4.5, dt)
    state.left.z = MathUtils.damp(state.left.z, left.z, 4.5, dt)
    state.look.lerp(look, 1 - Math.exp(-3 * dt))
    state.lean = MathUtils.damp(state.lean, step.lean ?? 0.04, 3, dt)
    // walk bob
    const bob = Math.abs(Math.sin(state.gait)) * 0.015 * state.stride

    torso.current.position.set(0, HIP_Y - bob, 0)
    torso.current.rotation.x = state.lean
    const c = Math.cos(state.lean)
    const s = Math.sin(state.lean)
    const onTorso = (tx: number, up: number, forward: number) => new Vector3(tx, HIP_Y - bob + up * c - forward * s, up * s + forward * c)

    // legs
    ;[-1, 1].forEach((side, k) => {
      const swing = Math.sin(state.gait + (side > 0 ? Math.PI : 0)) * 0.22 * state.stride
      const lift = Math.max(0, Math.cos(state.gait + (side > 0 ? Math.PI : 0))) * 0.07 * state.stride
      const hip = new Vector3(side * LEG.apart, HIP_Y - bob, 0)
      const ankle = new Vector3(side * LEG.apart, 0.085 + lift, swing)
      const knee = new Vector3()
      reach(hip, ankle, new Vector3(0, 0, 1), knee, LEG.upper, LEG.lower)
      placeLimb(p[`thigh${k}`], hip, knee, 0.075)
      placeLimb(p[`shin${k}`], knee, ankle, 0.058)
      shoes.current[k].position.set(ankle.x, ankle.y - 0.04, ankle.z + 0.05)
    })

    // arms
    ;[-1, 1].forEach((side, k) => {
      const shoulder = onTorso(side * SHOULDER.x, SHOULDER.up, 0)
      const wrist = (side < 0 ? state.right : state.left).clone()
      const elbow = new Vector3()
      reach(shoulder, wrist, new Vector3(side * 0.6, -0.6, -0.5), elbow, ARM.upper, ARM.fore)
      placeLimb(p[`upper${k}`], shoulder, elbow, 0.05)
      placeLimb(p[`fore${k}`], elbow, wrist, 0.042)
      p[`elbow${k}`].position.copy(elbow)
      p[`shoulder${k}`].position.copy(shoulder)
      const dir = wrist.clone().sub(elbow)
      dir.y *= 0.4
      dir.normalize()
      const hand = p[`hand${k}`]
      hand.position.copy(wrist).addScaledVector(dir, 0.045)
      hand.quaternion.setFromUnitVectors(new Vector3(0, 0, 1), dir)
      if (side < 0) {
        // rag follows the right hand
        rag.current.visible = !!step.rag
        rag.current.position.set(hand.position.x, BAR.height + 0.006, hand.position.z)
      }
    })

    // head look-at
    const pivot = onTorso(0, HEAD_UP, 0.01)
    head.current.position.copy(pivot)
    const to = state.look.clone().sub(pivot)
    const headYaw = MathUtils.clamp(Math.atan2(to.x, to.z), -1.1, 1.1)
    const headPitch = MathUtils.clamp(Math.atan2(-to.y, Math.hypot(to.x, to.z)), -0.3, 0.9)
    head.current.rotation.set(headPitch, headYaw, 0, 'YXZ')

    // cup
    const where = cupAt(u)
    cup.current.visible = where !== 'gone'
    if (where === 'bar') cup.current.position.copy(SPOT.pickup)
    if (where === 'tray') cup.current.position.copy(SPOT.dripTray)
    if (where === 'hand') {
      const hand = p.hand0
      cup.current.position.copy(root.current.localToWorld(hand.position.clone().add(new Vector3(0, -0.075, 0))))
    }
  })

  return (
    <group userData={{ dynamic: true }}>
      <group ref={root}>
        {/* legs */}
        {[0, 1].map((k) => (
          <group key={k}>
            <mesh ref={set(`thigh${k}`)} geometry={LIMB} castShadow>
              <meshStandardMaterial color={COLOR.baristaPants} flatShading />
            </mesh>
            <mesh ref={set(`shin${k}`)} geometry={LIMB} castShadow>
              <meshStandardMaterial color={COLOR.baristaPants} flatShading />
            </mesh>
            {/* group origin is 4cm off the floor */}
            <group ref={(group) => void (group && (shoes.current[k] = group))}>
              <Sneaker position={[0, -0.04, 0]} colors={sneakerColors(COLOR.shoe)} scale={0.95} />
            </group>
          </group>
        ))}
        {/* hips */}
        <Blob position={[0, HIP_Y + 0.02, 0]} radii={[0.15, 0.08, 0.1]} color={COLOR.baristaPants} />

        <group ref={torso}>
          <mesh geometry={SHIRT} scale={[1, 1, TORSO_DEPTH]} castShadow receiveShadow>
            <meshStandardMaterial color={COLOR.baristaShirt} flatShading />
          </mesh>
          {/* apron */}
          <mesh geometry={APRON_BIB} scale={[1, 1, TORSO_DEPTH + 0.04]} castShadow>
            <meshStandardMaterial color={COLOR.apron} flatShading side={DoubleSide} />
          </mesh>
          <mesh geometry={APRON_SKIRT} scale={[1, 1, TORSO_DEPTH + 0.1]} castShadow>
            <meshStandardMaterial color={COLOR.apron} flatShading side={DoubleSide} />
          </mesh>
          <mesh position={[0, 0.02, 0]} scale={[1, 1, TORSO_DEPTH + 0.06]}>
            <cylinderGeometry args={[0.165, 0.165, 0.03, 14, 1, true]} />
            <meshStandardMaterial color={COLOR.apronStrap} flatShading side={DoubleSide} />
          </mesh>
          {[-1, 1].map((side) => (
            <mesh key={side} position={[side * 0.07, 0.44, 0.06]} rotation={[0.35, 0, side * -0.35]}>
              <boxGeometry args={[0.022, 0.14, 0.012]} />
              <meshStandardMaterial color={COLOR.apronStrap} flatShading />
            </mesh>
          ))}
          {/* collar + neck */}
          <mesh position={[0, NECK_UP - 0.005, 0.005]} scale={[1, 1, 0.85]}>
            <cylinderGeometry args={[0.055, 0.07, 0.04, 10, 1, true]} />
            <meshStandardMaterial color={COLOR.baristaShirt} flatShading side={DoubleSide} />
          </mesh>
          <mesh position={[0, NECK_UP + 0.03, 0.01]}>
            <cylinderGeometry args={[0.045, 0.05, 0.1, 10]} />
            <meshStandardMaterial color={COLOR.baristaSkin} flatShading />
          </mesh>
        </group>

        {/* arms: sleeve, rolled cuff, forearm, hand */}
        {[0, 1].map((k) => (
          <group key={k}>
            <mesh ref={set(`upper${k}`)} geometry={LIMB} castShadow>
              <meshStandardMaterial color={COLOR.baristaShirt} flatShading />
            </mesh>
            <mesh ref={set(`shoulder${k}`)}>
              <icosahedronGeometry args={[0.052, 1]} />
              <meshStandardMaterial color={COLOR.baristaShirt} flatShading />
            </mesh>
            <mesh ref={set(`elbow${k}`)}>
              <icosahedronGeometry args={[0.052, 1]} />
              <meshStandardMaterial color={COLOR.baristaCuff} flatShading />
            </mesh>
            <mesh ref={set(`fore${k}`)} geometry={LIMB} castShadow>
              <meshStandardMaterial color={COLOR.baristaSkin} flatShading />
            </mesh>
            <mesh ref={set(`hand${k}`)} castShadow>
              <boxGeometry args={[0.065, 0.026, 0.09]} />
              <meshStandardMaterial color={COLOR.baristaSkin} flatShading />
            </mesh>
          </group>
        ))}
        {/* wiping rag */}
        <mesh ref={rag} visible={false}>
          <boxGeometry args={[0.13, 0.012, 0.1]} />
          <meshStandardMaterial color={COLOR.rag} flatShading />
        </mesh>

        <group ref={head}>
          <BaristaHead />
        </group>
      </group>

      {/* drink + bus tub */}
      <group ref={cup} position={SPOT.pickup}>
        <CoffeeCup position={[0, 0, 0]} rotationY={-Math.PI / 2} />
      </group>
      <BusTub />
    </group>
  )
}

function BaristaHead() {
  return (
    <group>
      <mesh position={[0, 0.12, 0]} scale={[0.93, 1.07, 0.98]} castShadow>
        <icosahedronGeometry args={[0.107, 1]} />
        <meshStandardMaterial color={COLOR.baristaSkin} flatShading />
      </mesh>
      {[-1, 1].map((side) => (
        <group key={side}>
          <mesh position={[side * 0.099, 0.115, -0.005]} scale={[0.5, 1, 0.8]}>
            <icosahedronGeometry args={[0.027, 0]} />
            <meshStandardMaterial color={COLOR.baristaSkin} flatShading />
          </mesh>
          <mesh position={[side * 0.035, 0.125, 0.1]}>
            <boxGeometry args={[0.02, 0.01, 0.006]} />
            <meshBasicMaterial color={COLOR.eyes} />
          </mesh>
          <mesh position={[side * 0.036, 0.147, 0.098]} rotation={[0, 0, side * -0.06]}>
            <boxGeometry args={[0.028, 0.006, 0.006]} />
            <meshBasicMaterial color={COLOR.baristaHair} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 0.1, 0.106]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.012, 0.03, 4]} />
        <meshStandardMaterial color={COLOR.baristaSkinShade} flatShading />
      </mesh>
      <mesh geometry={HAIR} castShadow>
        <meshStandardMaterial color={COLOR.baristaHair} flatShading />
      </mesh>
      {/* bun */}
      <Blob position={[0, 0.075, -0.13]} radii={[0.05, 0.045, 0.04]} color={COLOR.baristaHair} />
      <mesh position={[0, 0.08, -0.105]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.024, 0.007, 4, 10]} />
        <meshStandardMaterial color={COLOR.apronStrap} flatShading />
      </mesh>
    </group>
  )
}

// bus tub on the back counter
function BusTub() {
  const { x, z } = SPOT.tub
  const y = BAR.backHeight
  const size: Vec3 = [0.34, 0.12, 0.26]
  return (
    <group position={[x, y, z]}>
      <mesh position={[0, 0.005, 0]} receiveShadow>
        <boxGeometry args={[size[0], 0.01, size[2]]} />
        <meshStandardMaterial color={COLOR.busTub} flatShading />
      </mesh>
      {[-1, 1].map((side) => (
        <group key={side}>
          <mesh position={[side * (size[0] / 2 - 0.006), size[1] / 2, 0]} castShadow>
            <boxGeometry args={[0.012, size[1], size[2]]} />
            <meshStandardMaterial color={COLOR.busTub} flatShading />
          </mesh>
          <mesh position={[0, size[1] / 2, side * (size[2] / 2 - 0.006)]} castShadow>
            <boxGeometry args={[size[0], size[1], 0.012]} />
            <meshStandardMaterial color={COLOR.busTub} flatShading />
          </mesh>
        </group>
      ))}
    </group>
  )
}
