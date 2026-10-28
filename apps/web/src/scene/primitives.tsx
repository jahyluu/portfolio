import type { Vec3 } from './layout'
import { COLOR } from './palette'

type BoxProps = { position: Vec3; size: Vec3; color: string; castShadow?: boolean; roughness?: number }

// positioned from center. walls/ceiling pass castShadow={false} to save work
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
  // one number, or [top, bottom] for a tapered one
  radius: number | [top: number, bottom: number]
  height: number
  color: string
  segments?: number
  rotation?: Vec3
  castShadow?: boolean
  roughness?: number // lower = shinier. glass and glazed ceramic ~0.25
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

// see-through glass for the pastry case, blender jar
export function GlassMaterial() {
  return <meshStandardMaterial color={COLOR.glass} transparent opacity={0.2} roughness={0.05} depthWrite={false} />
}

// pseudo-random 0-1 from a number. same result every load, so the scene never reshuffles
export function seeded(n: number) {
  const x = Math.sin(n * 12.9898) * 43758.5453
  return x - Math.floor(x)
}

// a wooden cafe chair, seat facing +z, back at -z
export function Chair() {
  return (
    <>
      <Box position={[0, 0.45, 0]} size={[0.45, 0.05, 0.45]} color={COLOR.chair} />
      <Box position={[0, 0.72, -0.21]} size={[0.45, 0.5, 0.05]} color={COLOR.chair} />
    </>
  )
}
