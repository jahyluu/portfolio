import { RoundedBox } from '@react-three/drei'
import { PHONE, PHONE_SCREEN } from './layout'

// my phone on the table. the screen itself is drawn by PhoneScreen (DeviceScreens.tsx)
export function Phone() {
  const { width, length, thickness } = PHONE.body
  return (
    <group position={PHONE.position} rotation={[0, PHONE.yaw, 0]}>
      <RoundedBox args={[width, thickness, length]} radius={0.0035} smoothness={2} position={[0, thickness / 2, 0]} castShadow receiveShadow>
        <meshStandardMaterial color="#1b1b1f" roughness={0.4} metalness={0.3} />
      </RoundedBox>
      {/* black glass, shows when the screen is off */}
      <mesh position={[0, thickness + 0.0002, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[PHONE_SCREEN.width + 0.002, PHONE_SCREEN.height + 0.002]} />
        <meshStandardMaterial color="#050507" roughness={0.15} metalness={0.2} />
      </mesh>
    </group>
  )
}
