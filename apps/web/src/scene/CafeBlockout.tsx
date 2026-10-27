import { DoubleSide } from 'three'
import {
  BARISTA,
  COUNTER,
  GROUP_SEATS,
  GROUP_TABLE,
  LAPTOP,
  ME,
  MY_TABLE,
  PENDANT,
  ROOM,
  SCREEN_SIZE,
  SHELVES,
  SOLO_SEAT,
  SOLO_TABLE,
  TABLE_HEIGHT,
  faceToward,
  type Vec3,
} from './layout'
import { COLOR, GLOW } from './palette'
import { Box } from './primitives'

// greybox stand-in. swap for real models later, keep the same positions.
// the room shell (floor, walls, ceiling, window, door) lives in Room.tsx

export function CafeBlockout() {
  return (
    <group>
      {/* hero table */}
      <SquareTable position={MY_TABLE.position} size={MY_TABLE.size} />
      <SeatedPerson position={ME.position} rotationY={ME.rotationY} color={COLOR.hoodie} />
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
        color={COLOR.bamboo}
      />
      <StandingPerson position={BARISTA} />

      {/* east wall shelves */}
      <Box
        position={[SHELVES.position[0], SHELVES.size[1] / 2, SHELVES.position[2]]}
        size={SHELVES.size}
        color={COLOR.wood}
      />
    </group>
  )
}

type TableProps = { position: Vec3 }

function SquareTable({ position, size }: TableProps & { size: [number, number] }) {
  const [x, , z] = position
  const legHeight = TABLE_HEIGHT - 0.04
  return (
    <group>
      <Box position={[x, TABLE_HEIGHT - 0.02, z]} size={[size[0], 0.04, size[1]]} color={COLOR.tableTop} />
      <mesh position={[x, legHeight / 2, z]} castShadow receiveShadow>
        <cylinderGeometry args={[0.04, 0.04, legHeight, 8]} />
        <meshStandardMaterial color={COLOR.chair} flatShading />
      </mesh>
    </group>
  )
}

function RoundTable({ position, radius }: TableProps & { radius: number }) {
  const [x, , z] = position
  const legHeight = TABLE_HEIGHT - 0.04
  return (
    <group>
      <mesh position={[x, TABLE_HEIGHT - 0.02, z]} castShadow receiveShadow>
        <cylinderGeometry args={[radius, radius, 0.04, 12]} />
        <meshStandardMaterial color={COLOR.tableTop} flatShading />
      </mesh>
      <mesh position={[x, legHeight / 2, z]} castShadow receiveShadow>
        <cylinderGeometry args={[0.04, 0.04, legHeight, 8]} />
        <meshStandardMaterial color={COLOR.chair} flatShading />
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
      <Box position={[0, 0.45, 0]} size={[0.45, 0.05, 0.45]} color={COLOR.chair} />
      <Box position={[0, 0.72, -0.21]} size={[0.45, 0.5, 0.05]} color={COLOR.chair} />
      {/* thighs */}
      <Box position={[0, 0.55, 0.18]} size={[0.32, 0.14, 0.36]} color={color} />
      {/* torso */}
      <mesh position={[0, 0.82, 0]} castShadow receiveShadow>
        <capsuleGeometry args={[0.17, 0.3, 4, 8]} />
        <meshStandardMaterial color={color} flatShading />
      </mesh>
      {/* head */}
      <mesh position={[0, 1.25, 0.02]} castShadow receiveShadow>
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
      <mesh position={[0, 1.2, 0]} castShadow receiveShadow>
        <capsuleGeometry args={[0.18, 0.4, 4, 8]} />
        <meshStandardMaterial color={color} flatShading />
      </mesh>
      <mesh position={[0, 1.68, 0.02]} castShadow receiveShadow>
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
      <group position={[0, 0.015, 0.11]} rotation={[LAPTOP.tilt, 0, 0]}>
        <Box position={[0, 0.105, 0]} size={[0.32, 0.21, 0.008]} color={COLOR.laptop} />
        {/* display, user-facing side. kept under bloom threshold so the full-screen frame stays crisp */}
        <mesh position={[0, 0.105, -0.0045]} rotation={[0, Math.PI, 0]}>
          <planeGeometry args={[SCREEN_SIZE.width, SCREEN_SIZE.height]} />
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
        <meshStandardMaterial color={COLOR.shade} side={DoubleSide} flatShading />
      </mesh>
      <mesh position={[x, y - 0.08, z]}>
        <sphereGeometry args={[0.05, 8, 6]} />
        <meshBasicMaterial color={GLOW.bulb} />
      </mesh>
    </group>
  )
}
