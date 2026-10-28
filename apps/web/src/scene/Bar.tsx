import { Instance, Instances } from '@react-three/drei'
import { DoubleSide } from 'three'
import { BAR, BAR_PENDANTS, BAR_STOOLS, ROOM, SELF_SERVE_X, type Vec3 } from './layout'
import { BRIGHTNESS } from './Lighting'
import { COLOR, GLOW } from './palette'
import { Box, Cylinder, GlassMaterial } from './primitives'

// bar counter, stools, and everything on top of it
const BAR_Z = BAR.frontZ - BAR.depth / 2
const BAR_X = (BAR.xFrom + BAR.xTo) / 2
const BAR_WIDTH = BAR.xTo - BAR.xFrom

export function Bar() {
  return (
    <group>
      <Counter />
      <Stools />
      <SelfServe x={SELF_SERVE_X} />
      {/* ordering end. rest of the bar stays clear for the stools */}
      <Register x={-0.45} />
      <PastryCase x={0.35} />
      <Ceramics x={1.1} />
      <Pendants />
    </group>
  )
}

function Counter() {
  const topThickness = 0.05
  const bodyHeight = BAR.height - topThickness
  const panels = Math.floor(BAR_WIDTH / 0.5)
  return (
    <group>
      <Box position={[BAR_X, bodyHeight / 2, BAR_Z + 0.03]} size={[BAR_WIDTH, bodyHeight, BAR.depth - 0.06]} color={COLOR.barBody} />
      {/* top, slight overhang */}
      <Box position={[BAR_X, BAR.height - topThickness / 2, BAR_Z]} size={[BAR_WIDTH + 0.06, topThickness, BAR.depth + 0.06]} color={COLOR.bamboo} />
      {/* panel seams */}
      {Array.from({ length: panels - 1 }, (_, i) => (
        <Box
          key={i}
          position={[BAR.xFrom + 0.5 * (i + 1), bodyHeight / 2, BAR.frontZ + 0.003]}
          size={[0.012, bodyHeight - 0.1, 0.006]}
          color={COLOR.floorBase}
          castShadow={false}
        />
      ))}
      {/* brass foot rail */}
      <Cylinder position={[BAR_X, 0.22, BAR.frontZ + 0.12]} radius={0.018} height={BAR_WIDTH} rotation={[0, 0, Math.PI / 2]} color={COLOR.brass} />
    </group>
  )
}

// instanced, one mesh per part
function Stools() {
  const { x: xs, z } = BAR_STOOLS
  return (
    <group>
      {/* seat */}
      <Instances limit={xs.length} castShadow receiveShadow>
        <cylinderGeometry args={[0.19, 0.17, 0.05, 10]} />
        <meshStandardMaterial color={COLOR.bamboo} flatShading />
        {xs.map((x) => <Instance key={x} position={[x, 0.74, z]} />)}
      </Instances>
      {/* pole */}
      <Instances limit={xs.length} castShadow>
        <cylinderGeometry args={[0.025, 0.025, 0.7, 6]} />
        <meshStandardMaterial color={COLOR.black} flatShading />
        {xs.map((x) => <Instance key={x} position={[x, 0.37, z]} />)}
      </Instances>
      {/* base */}
      <Instances limit={xs.length} receiveShadow>
        <cylinderGeometry args={[0.2, 0.2, 0.02, 10]} />
        <meshStandardMaterial color={COLOR.black} flatShading />
        {xs.map((x) => <Instance key={x} position={[x, 0.01, z]} />)}
      </Instances>
      {/* foot ring */}
      <Instances limit={xs.length} castShadow>
        <torusGeometry args={[0.15, 0.01, 4, 12]} />
        <meshStandardMaterial color={COLOR.brass} flatShading />
        {xs.map((x) => <Instance key={x} position={[x, 0.3, z]} rotation={[Math.PI / 2, 0, 0]} />)}
      </Instances>
    </group>
  )
}

function Register({ x }: { x: number }) {
  return (
    <group position={[x, BAR.height, BAR_Z]}>
      <Box position={[0, 0.04, 0]} size={[0.32, 0.08, 0.32]} color={COLOR.black} />
      <Box position={[0, 0.17, -0.04]} size={[0.04, 0.18, 0.04]} color={COLOR.black} />
      {/* screen faces the barista */}
      <group position={[0, 0.28, -0.05]} rotation={[0.35, 0, 0]}>
        <Box position={[0, 0, 0]} size={[0.28, 0.19, 0.02]} color={COLOR.black} />
        <mesh position={[0, 0, -0.011]} rotation={[0, Math.PI, 0]}>
          <planeGeometry args={[0.25, 0.16]} />
          <meshBasicMaterial color={COLOR.registerScreen} />
        </mesh>
      </group>
    </group>
  )
}

// teapots + cups on a tray
function Ceramics({ x }: { x: number }) {
  const cups: [number, number][] = [
    [-0.15, 0.09],
    [-0.05, 0.1],
    [0.05, -0.08],
    [0.18, -0.09],
  ]
  return (
    <group position={[x, BAR.height, BAR_Z]}>
      <Box position={[0, 0.008, 0]} size={[0.5, 0.016, 0.3]} color={COLOR.tableTop} />
      <Teapot position={[-0.12, 0.016, -0.03]} color={COLOR.ceramics[1]} />
      <Teapot position={[0.13, 0.016, 0.04]} color={COLOR.ceramics[2]} />
      {cups.map(([cx, cz], i) => (
        <Cylinder
          key={i}
          position={[cx, 0.044, cz]}
          radius={[0.03, 0.024]}
          height={0.055}
          color={COLOR.ceramics[(i + 3) % COLOR.ceramics.length]}
        />
      ))}
    </group>
  )
}

function Teapot({ position, color }: { position: Vec3; color: string }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.055, 0]} scale={[1, 0.8, 1]} castShadow receiveShadow>
        <sphereGeometry args={[0.07, 10, 8]} />
        <meshStandardMaterial color={color} flatShading roughness={0.35} />
      </mesh>
      {/* lid */}
      <Cylinder position={[0, 0.112, 0]} radius={[0.03, 0.04]} height={0.02} color={color} />
      {/* spout */}
      <Cylinder position={[0.085, 0.07, 0]} radius={[0.008, 0.014]} height={0.07} rotation={[0, 0, -0.8]} color={color} />
      {/* handle: ring that wraps past halfway so the ends tuck into the body */}
      <mesh position={[-0.07, 0.06, 0]} rotation={[0, 0, Math.PI / 2 - 0.76]} castShadow>
        <torusGeometry args={[0.032, 0.008, 5, 12, Math.PI + 1.52]} />
        <meshStandardMaterial color={color} flatShading />
      </mesh>
    </group>
  )
}

function PastryCase({ x }: { x: number }) {
  const width = 0.8
  const height = 0.4
  const depth = 0.45
  const base = 0.06
  const shelfY = base + height / 2
  return (
    <group position={[x, BAR.height, BAR_Z]}>
      <Box position={[0, base / 2, 0]} size={[width + 0.04, base, depth + 0.04]} color={COLOR.barBody} />
      {/* glass + shelf */}
      <mesh position={[0, base + height / 2, 0]}>
        <boxGeometry args={[width, height, depth]} />
        <GlassMaterial />
      </mesh>
      <mesh position={[0, shelfY, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[width - 0.02, depth - 0.02]} />
        <GlassMaterial />
      </mesh>

      {/* bottom: croissants, muffins */}
      {[-0.32, -0.2, -0.08].flatMap((px) => [
        <Croissant key={`cf${px}`} position={[px, base, 0.08]} />,
        <Croissant key={`cb${px}`} position={[px, base, -0.07]} />,
      ])}
      <Muffin position={[0.07, base, 0.08]} />
      <Muffin position={[0.18, base, 0.08]} />
      <Muffin position={[0.29, base, 0.08]} />
      <Muffin position={[0.12, base, -0.07]} />
      <Muffin position={[0.25, base, -0.07]} />

      {/* top: croissants, cookies, cinnamon rolls */}
      <Croissant position={[-0.3, shelfY, 0.07]} />
      <Croissant position={[-0.18, shelfY, 0.07]} />
      <Croissant position={[-0.06, shelfY, 0.07]} />
      {[-0.3, -0.19, -0.08].map((px) => (
        <Cylinder key={px} position={[px, shelfY + 0.006, -0.08]} radius={0.035} height={0.012} color={COLOR.cookie} />
      ))}
      <CinnamonRoll position={[0.1, shelfY, 0.07]} />
      <CinnamonRoll position={[0.24, shelfY, 0.07]} />
      <CinnamonRoll position={[0.17, shelfY, -0.07]} />
      <Cylinder position={[0.31, shelfY + 0.006, -0.07]} radius={0.035} height={0.012} color={COLOR.cookie} />

      {/* case light */}
      <pointLight position={[0, base + height - 0.04, 0]} color={COLOR.warmLight} intensity={0.5 * BRIGHTNESS} distance={1} decay={2} />
    </group>
  )
}

export function Croissant({ position: [x, y, z] }: { position: Vec3 }) {
  return (
    <mesh position={[x, y + 0.02, z]} rotation={[0, 0.4, Math.PI / 2]} scale={[0.7, 1, 1]} castShadow>
      <capsuleGeometry args={[0.026, 0.06, 3, 6]} />
      <meshStandardMaterial color={COLOR.pastry} flatShading />
    </mesh>
  )
}

function Muffin({ position: [x, y, z] }: { position: Vec3 }) {
  return (
    <group position={[x, y, z]}>
      <Cylinder position={[0, 0.018, 0]} radius={[0.035, 0.03]} height={0.035} color={COLOR.paperCup} />
      <mesh position={[0, 0.036, 0]} scale={[1, 0.55, 1]} castShadow>
        <sphereGeometry args={[0.042, 8, 6]} />
        <meshStandardMaterial color={COLOR.pastryDark} flatShading />
      </mesh>
    </group>
  )
}

function CinnamonRoll({ position: [x, y, z] }: { position: Vec3 }) {
  return (
    <mesh position={[x, y + 0.014, z]} rotation={[Math.PI / 2, 0, 0]} castShadow>
      <torusGeometry args={[0.025, 0.014, 5, 8]} />
      <meshStandardMaterial color={COLOR.pastry} flatShading />
    </mesh>
  )
}

// dome pendants over the bar
function Pendants() {
  const { y, x: xs } = BAR_PENDANTS
  const cord = ROOM.height - y
  return (
    <group>
      {xs.map((x) => (
        <group key={x} position={[x, y, BAR_Z]}>
          <Cylinder position={[0, cord / 2, 0]} radius={0.005} height={cord} segments={4} color={COLOR.black} castShadow={false} />
          <mesh>
            <cylinderGeometry args={[0.05, 0.13, 0.13, 8, 1, true]} />
            <meshStandardMaterial color={COLOR.shade} side={DoubleSide} flatShading />
          </mesh>
          <mesh position={[0, -0.04, 0]}>
            <sphereGeometry args={[0.035, 8, 6]} />
            <meshBasicMaterial color={GLOW.bulb} />
          </mesh>
          {/* hung high, so a bit stronger to reach the bar top */}
          <pointLight position={[0, -0.06, 0]} color={COLOR.warmLight} intensity={2.5 * BRIGHTNESS} distance={3.5} decay={2} />
        </group>
      ))}
    </group>
  )
}

// self-serve tray (napkins, straws, sugar, etc). x = center
function SelfServe({ x }: { x: number }) {
  const front = 0.07 // customer side
  const back = -0.07
  const packets = ['#f2efe8', '#b07a4a', '#e8a0b4', '#7fa7d9', '#e8cf5a', '#f2efe8', '#b07a4a', '#7fa7d9']
  const straws = [
    '#1e1e20', '#efe9dd', '#b5262a', '#1e1e20', '#efe9dd', '#3f6b35', '#efe9dd',
    '#1e1e20', '#b5262a', '#efe9dd', '#3f6b35', '#1e1e20', '#efe9dd', '#b5262a',
  ]
  // inner ring first, then outer
  const innerRing = 5
  return (
    <group position={[x, BAR.height, BAR_Z]}>
      <Box position={[0, 0.01, 0]} size={[0.8, 0.02, 0.32]} color={COLOR.bamboo} />

      {/* napkin dispenser */}
      <Box position={[-0.3, 0.07, front]} size={[0.14, 0.1, 0.1]} color={COLOR.steel} roughness={0.35} />
      <Box position={[-0.3, 0.123, front]} size={[0.11, 0.006, 0.08]} color={COLOR.label} castShadow={false} />

      {/* straws */}
      <mesh position={[-0.13, 0.12, front]}>
        <cylinderGeometry args={[0.045, 0.045, 0.2, 8]} />
        <GlassMaterial />
      </mesh>
      {straws.map((color, i) => {
        const inner = i < innerRing
        const ringCount = inner ? innerRing : straws.length - innerRing
        const angle = ((inner ? i : i - innerRing) / ringCount) * Math.PI * 2 + (inner ? 0.3 : 0)
        const r = inner ? 0.014 : 0.031
        return (
          <Cylinder
            key={i}
            position={[-0.13 + Math.cos(angle) * r, 0.15, front + Math.sin(angle) * r]}
            radius={0.004}
            height={0.26}
            segments={4}
            rotation={[Math.sin(angle) * 0.08, 0, -Math.cos(angle) * 0.08]}
            color={color}
          />
        )
      })}

      {/* sugar packets */}
      <Box position={[0.07, 0.045, front]} size={[0.13, 0.05, 0.08]} color={COLOR.barBody} />
      {packets.map((color, i) => (
        <Box key={i} position={[0.02 + i * 0.014, 0.085, front]} size={[0.004, 0.05, 0.035]} color={color} castShadow={false} />
      ))}

      {/* stir sticks */}
      <Cylinder position={[0.25, 0.06, front]} radius={0.025} height={0.08} color={COLOR.steel} roughness={0.35} />
      {[-0.008, 0, 0.008].map((dx) => (
        <Box key={dx} position={[0.25 + dx, 0.12, front]} size={[0.004, 0.14, 0.006]} color={COLOR.bamboo} castShadow={false} />
      ))}

      {/* back row: cream, shakers, lids */}
      <Cylinder position={[-0.3, 0.08, back]} radius={0.04} height={0.12} color={COLOR.steel} roughness={0.35} />
      <Cylinder position={[-0.3, 0.15, back]} radius={0.03} height={0.02} color={COLOR.black} />
      <Cylinder position={[-0.19, 0.08, back]} radius={0.04} height={0.12} color={COLOR.steel} roughness={0.35} />
      <Cylinder position={[-0.19, 0.15, back]} radius={0.03} height={0.02} color={COLOR.black} />
      <Cylinder position={[-0.05, 0.06, back]} radius={0.02} height={0.08} color={COLOR.pastryDark} />
      <Cylinder position={[-0.05, 0.105, back]} radius={0.021} height={0.015} color={COLOR.steel} />
      <Cylinder position={[0.01, 0.06, back]} radius={0.02} height={0.08} color={COLOR.label} />
      <Cylinder position={[0.01, 0.105, back]} radius={0.021} height={0.015} color={COLOR.steel} />
      {Array.from({ length: 8 }, (_, i) => (
        <Cylinder key={i} position={[0.22, 0.025 + i * 0.008, back]} radius={0.05} height={0.006} segments={10} color={COLOR.label} />
      ))}
    </group>
  )
}
