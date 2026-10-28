import type { Vec3 } from './layout'
import { COLOR } from './palette'

type BoxProps = { position: Vec3; size: Vec3; color: string; castShadow?: boolean; roughness?: number }

// centered on position. pass castShadow={false} for big static stuff like walls
export function Box({ position, size, color, castShadow = true, roughness = 1 }: BoxProps) {
  return (
    <mesh position={position} castShadow={castShadow} receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} flatShading roughness={roughness} />
    </mesh>
  )
}

type CylinderProps = {
  position: Vec3
  // [top, bottom] for a taper
  radius: number | [top: number, bottom: number]
  height: number
  color: string
  segments?: number
  rotation?: Vec3
  castShadow?: boolean
  roughness?: number // ~0.25 for glass / glazed ceramic
}

export function Cylinder({
  position,
  radius,
  height,
  color,
  segments = 8,
  rotation,
  castShadow = true,
  roughness = 1,
}: CylinderProps) {
  const [top, bottom] = typeof radius === 'number' ? [radius, radius] : radius
  return (
    <mesh position={position} rotation={rotation} castShadow={castShadow} receiveShadow>
      <cylinderGeometry args={[top, bottom, height, segments]} />
      <meshStandardMaterial color={color} flatShading roughness={roughness} />
    </mesh>
  )
}

// pastry case, blender jar
export function GlassMaterial() {
  return <meshStandardMaterial color={COLOR.glass} transparent opacity={0.2} roughness={0.05} depthWrite={false} />
}

// deterministic pseudo-random 0-1, so the layout is the same every load
export function seeded(n: number) {
  const x = Math.sin(n * 12.9898) * 43758.5453
  return x - Math.floor(x)
}

// seat faces +z
// cafe chair, back toward -z. seat top at 0.475
const CHAIR = { width: 0.45, seat: 0.475, back: 0.95, leg: 0.034 }
export function Chair() {
  const { width, seat, back, leg } = CHAIR
  const half = width / 2
  const lx = half - leg / 2 - 0.012
  const lz = half - leg / 2 - 0.012
  return (
    <>
      <Box position={[0, seat - 0.02, 0]} size={[width, 0.04, width]} color={COLOR.chair} />
      {/* front legs */}
      {[-1, 1].map((side) => (
        <Box key={side} position={[side * lx, (seat - 0.04) / 2, lz]} size={[leg, seat - 0.04, leg]} color={COLOR.chair} />
      ))}
      {/* back legs double as the backrest posts */}
      {[-1, 1].map((side) => (
        <Box key={side} position={[side * lx, back / 2, -lz]} size={[leg, back, leg]} color={COLOR.chair} />
      ))}
      {/* backrest + rail */}
      <Box position={[0, back - 0.08, -lz]} size={[width - 0.024, 0.13, 0.026]} color={COLOR.chair} />
      <Box position={[0, seat + 0.15, -lz]} size={[width - 0.024, 0.03, 0.022]} color={COLOR.chair} />
      {/* stretchers */}
      {[-1, 1].map((side) => (
        <Box key={side} position={[side * lx, 0.16, 0]} size={[0.02, 0.02, 2 * lz]} color={COLOR.chair} castShadow={false} />
      ))}
    </>
  )
}
