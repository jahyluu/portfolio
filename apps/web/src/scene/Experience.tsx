import { Canvas } from '@react-three/fiber'
import { CafeBlockout } from './CafeBlockout'
import { CameraRig } from './CameraRig'
import { Lighting } from './Lighting'
import { COLOR } from './palette'
import { PostEffects } from './PostEffects'
import { Room } from './Room'

// r3f canvas, sits behind the overlay.
// flat = no tone mapping on the renderer, PostEffects does it instead
export function Experience() {
  return (
    <div className="scene">
      <Canvas camera={{ fov: 45, near: 0.05, far: 60 }} dpr={[1, 2]} shadows flat>
        <color attach="background" args={[COLOR.night]} />
        {/* faint warm haze that thickens with distance */}
        <fog attach="fog" args={[COLOR.haze, 9, 26]} />
        <CameraRig />
        <Lighting />
        <Room />
        <CafeBlockout />
        <PostEffects />
      </Canvas>
    </div>
  )
}
