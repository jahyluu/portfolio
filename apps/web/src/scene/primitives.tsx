import type { Vec3 } from './layout'

type BoxProps = { position: Vec3; size: Vec3; color: string; castShadow?: boolean }

// positioned from center. walls/ceiling pass castShadow={false} to save work
export function Box({ position, size, color, castShadow = true }: BoxProps) {
  return (
    <mesh position={position} castShadow={castShadow} receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} flatShading />
    </mesh>
  )
}
