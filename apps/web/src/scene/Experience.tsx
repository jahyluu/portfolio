import { Stats } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { BackWall } from './BackWall'
import { Bar } from './Bar'
import { CafeBlockout } from './CafeBlockout'
import { CameraRig } from './CameraRig'
import { Occluders, PauseOnDesktop, PhoneScreen } from './DeviceScreens'
import { Phone } from './Phone'
import { Lighting } from './Lighting'
import { Outside } from './Outside'
import { Paintings } from './Paintings'
import { COLOR } from './palette'
import { PostEffects } from './PostEffects'
import { Room } from './Room'
import { ScenePrep } from './ScenePrep'
import { Tabletops } from './Tabletop'
import { LOW_POWER } from '../quality'

// `flat` turns off renderer tone mapping, PostEffects does it
export function Experience() {
  return (
    <div className="scene">
      <Canvas camera={{ fov: 45, near: 0.05, far: 60 }} dpr={LOW_POWER ? [1, 1.5] : [1, 2]} gl={{ powerPreference: 'high-performance' }} shadows flat>
        <color attach="background" args={[COLOR.night]} />
        {/* warm haze */}
        <fog attach="fog" args={[COLOR.haze, 9, 26]} />
        <CameraRig />
        <PauseOnDesktop />
        <Lighting />
        <Room />
        <Outside />
        <Bar />
        <BackWall />
        <CafeBlockout />
        <Tabletops />
        <Phone />
        <PhoneScreen />
        <Occluders />
        <ScenePrep />
        <Paintings />
        <PostEffects />
        {/* fps counter, dev only */}
        {import.meta.env.DEV && <Stats />}
      </Canvas>
    </div>
  )
}
