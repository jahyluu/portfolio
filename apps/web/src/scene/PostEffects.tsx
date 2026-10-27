import { Bloom, EffectComposer, ToneMapping, Vignette } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'

// glow on the brightest stuff -> film-style tone mapping -> darker edges
export function PostEffects() {
  return (
    <EffectComposer multisampling={4}>
      {/* only things pushed past white bloom: bulbs, downlights, later the lit shelves */}
      <Bloom mipmapBlur luminanceThreshold={1} luminanceSmoothing={0.2} intensity={0.8} />
      {/* AgX rolls bright highlights off softly instead of clipping */}
      <ToneMapping mode={ToneMappingMode.AGX} />
      <Vignette offset={0.3} darkness={0.35} />
    </EffectComposer>
  )
}
