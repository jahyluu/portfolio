import { DoubleSide } from 'three'
import {
  BARISTA,
  BOUNDS,
  COUNTER,
  DOOR,
  GROUP_SEATS,
  GROUP_TABLE,
  LAPTOP,
  ME,
  MY_TABLE,
  PENDANT,
  ROOM,
  SHELVES,
  SOLO_SEAT,
  SOLO_TABLE,
  TABLE_HEIGHT,
  WINDOW,
  faceToward,
  type Vec3,
} from './layout'

// greybox stand-in. swap for real models later, keep the same positions

// everything grey except the hero (warm) and lights
const COLOR = {
  floor: '#3a3631',
  wall: '#4a4744',
  furniture: '#6b6b70',
  person: '#8a8d96',
  hero: '#d9a066',
  laptop: '#b8bcc4',
  screen: '#9cc0ff',
  window: '#22406e',
  door: '#2f2c29',
  lamp: '#ffd9a8',
}

export function CafeBlockout() {
  return (
    <group>
      <Room />
      <Window />
      <Door />

      {/* hero table */}
      <SquareTable position={MY_TABLE.position} size={MY_TABLE.size} color={COLOR.hero} />
      <SeatedPerson position={ME.position} rotationY={ME.rotationY} color={COLOR.hero} />
      <Laptop position={LAPTOP.position} />
      <Pendant position={PENDANT.position} />

      {/* group table */}
      <RoundTable position={GROUP_TABLE.position} radius={GROUP_TABLE.radius} />
      {GROUP_SEATS.map((seat, i) => (
        <SeatedPerson key={i} position={seat} rotationY={faceToward(seat, GROUP_TABLE.position)} />
      ))}

      {/* solo worker, facing north */}
      <SquareTable position={SOLO_TABLE.position} size={SOLO_TABLE.size} />
      <SeatedPerson position={SOLO_SEAT} rotationY={faceToward(SOLO_SEAT, SOLO_TABLE.position)} />
      <Laptop
        position={[SOLO_TABLE.position[0], TABLE_HEIGHT, SOLO_TABLE.position[2] + 0.1]}
        rotationY={Math.PI}
      />

      {/* counter + barista */}
      <Box
        position={[COUNTER.position[0], COUNTER.size[1] / 2, COUNTER.position[2]]}
        size={COUNTER.size}
        color={COLOR.furniture}
      />
      <StandingPerson position={BARISTA} />

      {/* east wall shelves */}
      <Box
        position={[SHELVES.position[0], SHELVES.size[1] / 2, SHELVES.position[2]]}
        size={SHELVES.size}
        color={COLOR.furniture}
      />
    </group>
  )
}

// primitives

type BoxProps = { position: Vec3; size: Vec3; color: string }

// positioned from center
function Box({ position, size, color }: BoxProps) {
  return (
    <mesh position={position}>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} flatShading />
    </mesh>
  )
}

function Room() {
  const { minX, maxX, minZ, maxZ } = BOUNDS
  const { width, depth, height, centerZ } = ROOM
  const t = 0.1 // wall thickness
  return (
    <group>
      <Box position={[0, -t / 2, centerZ]} size={[width, t, depth]} color={COLOR.floor} />
      <Box position={[0, height + t / 2, centerZ]} size={[width, t, depth]} color={COLOR.wall} />
      <Box position={[0, height / 2, minZ - t / 2]} size={[width, height, t]} color={COLOR.wall} />
      <Box position={[0, height / 2, maxZ + t / 2]} size={[width, height, t]} color={COLOR.wall} />
      <Box position={[minX - t / 2, height / 2, centerZ]} size={[t, height, depth]} color={COLOR.wall} />
      <Box position={[maxX + t / 2, height / 2, centerZ]} size={[t, height, depth]} color={COLOR.wall} />
    </group>
  )
}

// unlit so it reads as a glow
function Window() {
  const width = WINDOW.zTo - WINDOW.zFrom
  const height = WINDOW.yTo - WINDOW.yFrom
  return (
    <mesh
      position={[BOUNDS.minX + 0.01, WINDOW.yFrom + height / 2, WINDOW.zFrom + width / 2]}
      rotation={[0, Math.PI / 2, 0]}
    >
      <planeGeometry args={[width, height]} />
      <meshBasicMaterial color={COLOR.window} />
    </mesh>
  )
}

function Door() {
  const width = DOOR.xTo - DOOR.xFrom
  return (
    <Box
      position={[DOOR.xFrom + width / 2, DOOR.height / 2, BOUNDS.maxZ - 0.03]}
      size={[width, DOOR.height, 0.06]}
      color={COLOR.door}
    />
  )
}

type TableProps = { position: Vec3; color?: string }

function SquareTable({ position, size, color = COLOR.furniture }: TableProps & { size: [number, number] }) {
  const [x, , z] = position
  const legHeight = TABLE_HEIGHT - 0.04
  return (
    <group>
      <Box position={[x, TABLE_HEIGHT - 0.02, z]} size={[size[0], 0.04, size[1]]} color={color} />
      <mesh position={[x, legHeight / 2, z]}>
        <cylinderGeometry args={[0.04, 0.04, legHeight, 8]} />
        <meshStandardMaterial color={COLOR.furniture} flatShading />
      </mesh>
    </group>
  )
}

function RoundTable({ position, radius, color = COLOR.furniture }: TableProps & { radius: number }) {
  const [x, , z] = position
  const legHeight = TABLE_HEIGHT - 0.04
  return (
    <group>
      <mesh position={[x, TABLE_HEIGHT - 0.02, z]}>
        <cylinderGeometry args={[radius, radius, 0.04, 12]} />
        <meshStandardMaterial color={color} flatShading />
      </mesh>
      <mesh position={[x, legHeight / 2, z]}>
        <cylinderGeometry args={[0.04, 0.04, legHeight, 8]} />
        <meshStandardMaterial color={COLOR.furniture} flatShading />
      </mesh>
    </group>
  )
}

type PersonProps = { position: Vec3; rotationY?: number; color?: string }

// faces +z, chair back at -z
function SeatedPerson({ position, rotationY = 0, color = COLOR.person }: PersonProps) {
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {/* chair */}
      <Box position={[0, 0.45, 0]} size={[0.45, 0.05, 0.45]} color={COLOR.furniture} />
      <Box position={[0, 0.72, -0.21]} size={[0.45, 0.5, 0.05]} color={COLOR.furniture} />
      {/* thighs */}
      <Box position={[0, 0.55, 0.18]} size={[0.32, 0.14, 0.36]} color={color} />
      {/* torso */}
      <mesh position={[0, 0.82, 0]}>
        <capsuleGeometry args={[0.17, 0.3, 4, 8]} />
        <meshStandardMaterial color={color} flatShading />
      </mesh>
      {/* head */}
      <mesh position={[0, 1.25, 0.02]}>
        <sphereGeometry args={[0.12, 12, 10]} />
        <meshStandardMaterial color={color} flatShading />
      </mesh>
    </group>
  )
}

// faces +z
function StandingPerson({ position, rotationY = 0, color = COLOR.person }: PersonProps) {
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <Box position={[0, 0.42, 0]} size={[0.3, 0.84, 0.2]} color={color} />
      <mesh position={[0, 1.2, 0]}>
        <capsuleGeometry args={[0.18, 0.4, 4, 8]} />
        <meshStandardMaterial color={color} flatShading />
      </mesh>
      <mesh position={[0, 1.68, 0.02]}>
        <sphereGeometry args={[0.12, 12, 10]} />
        <meshStandardMaterial color={color} flatShading />
      </mesh>
    </group>
  )
}

// screen faces -z, hinged at the far edge and tilted ~15deg
function Laptop({ position, rotationY = 0 }: { position: Vec3; rotationY?: number }) {
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <Box position={[0, 0.0075, 0]} size={[0.32, 0.015, 0.22]} color={COLOR.laptop} />
      <group position={[0, 0.015, 0.11]} rotation={[0.26, 0, 0]}>
        <Box position={[0, 0.105, 0]} size={[0.32, 0.21, 0.008]} color={COLOR.laptop} />
        {/* display, user-facing side */}
        <mesh position={[0, 0.105, -0.0045]} rotation={[0, Math.PI, 0]}>
          <planeGeometry args={[0.3, 0.19]} />
          <meshBasicMaterial color={COLOR.screen} />
        </mesh>
      </group>
    </group>
  )
}

// cord + shade + bulb
function Pendant({ position }: { position: Vec3 }) {
  const [x, y, z] = position
  const cord = ROOM.height - y
  return (
    <group>
      <mesh position={[x, y + cord / 2, z]}>
        <cylinderGeometry args={[0.006, 0.006, cord, 4]} />
        <meshStandardMaterial color="#222" />
      </mesh>
      <mesh position={[x, y, z]}>
        <coneGeometry args={[0.22, 0.25, 8, 1, true]} />
        <meshStandardMaterial color="#1c1c1c" side={DoubleSide} flatShading />
      </mesh>
      <mesh position={[x, y - 0.08, z]}>
        <sphereGeometry args={[0.05, 8, 6]} />
        <meshBasicMaterial color={COLOR.lamp} />
      </mesh>
    </group>
  )
}
