import { useEffect } from 'react'
import { Experience } from './scene/Experience'
import { HeroOverlay } from './overlay/HeroOverlay'
import { trackScroll } from './scroll'

export default function App() {
  useEffect(() => trackScroll(), [])

  return (
    <>
      <Experience />
      <HeroOverlay />
      {/* empty, just gives the page its scroll length */}
      <div className="scroll-track" aria-hidden="true" />
      {import.meta.env.DEV && <p className="dev-hint">preview: press 1-5</p>}
    </>
  )
}
