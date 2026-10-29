import { useEffect } from 'react'
import { Experience } from './scene/Experience'
import { HeroOverlay } from './overlay/HeroOverlay'
import { scrollToProgress, startOnDesktop, trackScroll, trackShortcuts } from './scroll'
import { Desktop } from './desktop/Desktop'

export default function App() {
  useEffect(() => {
    const stopScroll = trackScroll()
    const stopShortcuts = trackShortcuts()
    if (startOnDesktop) scrollToProgress(1, 'instant')
    return () => {
      stopScroll()
      stopShortcuts()
    }
  }, [])

  return (
    <>
      <Experience />
      <HeroOverlay />
      {/* fades in over the laptop screen at the end of the scroll */}
      <Desktop />
      {/* spacer for scroll height */}
      <div className="scroll-track" aria-hidden="true" />
    </>
  )
}
