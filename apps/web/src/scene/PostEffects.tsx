import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Bloom, EffectComposer, ToneMapping, Vignette } from '@react-three/postprocessing'
import { ToneMappingMode, type BloomEffect } from 'postprocessing'
import { MathUtils } from 'three'
import { camera } from '../handoff'

// full glow in the wide shots, fading out as the camera gets close to my laptop. up close the
// lit laptop fills the frame and the bloom turns into a haze over everything
const BLOOM = { wide: 0.8, close: 0.12, fadeFrom: 0.4, fadeTo: 0.85 }

// bloom, tone mapping, vignette
export function PostEffects() {
  const bloom = useRef<BloomEffect>(null!)
  useFrame(() => {
    if (!bloom.current) return
    const close = MathUtils.smoothstep(camera.progress, BLOOM.fadeFrom, BLOOM.fadeTo)
    bloom.current.intensity = MathUtils.lerp(BLOOM.wide, BLOOM.close, close)
  })
  return (
    <EffectComposer multisampling={4}>
      {/* threshold 1, so only colors pushed past white glow */}
      <Bloom ref={bloom} mipmapBlur luminanceThreshold={1} luminanceSmoothing={0.2} intensity={BLOOM.wide} />
      {/* AgX so highlights roll off instead of clipping */}
      <ToneMapping mode={ToneMappingMode.AGX} />
      <Vignette offset={0.3} darkness={0.35} />
    </EffectComposer>
  )
}
