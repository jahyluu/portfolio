import { Canvas } from '@react-three/fiber'
import { CafeBlockout } from './CafeBlockout'
import { CameraRig } from './CameraRig'
import { Lighting } from './Lighting'

// r3f canvas, sits behind the overlay
export function Experience() {
  return (
    <div className="scene">
      <Canvas camera={{ fov: 45, near: 0.05, far: 60 }} dpr={[1, 2]}>
        <color attach="background" args={['#0d1220']} />
        <CameraRig />
        <Lighting />
        <CafeBlockout />
      </Canvas>
    </div>
  )
}
