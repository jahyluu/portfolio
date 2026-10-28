import { Bloom, EffectComposer, ToneMapping, Vignette } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'

// bloom, tone mapping, vignette
export function PostEffects() {
  return (
    <EffectComposer multisampling={4}>
      {/* threshold 1, so only colors pushed past white glow */}
      <Bloom mipmapBlur luminanceThreshold={1} luminanceSmoothing={0.2} intensity={0.8} />
      {/* AgX so highlights roll off instead of clipping */}
      <ToneMapping mode={ToneMappingMode.AGX} />
      <Vignette offset={0.3} darkness={0.35} />
    </EffectComposer>
  )
}
