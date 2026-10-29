import { useEffect } from 'react'
import { Experience } from './scene/Experience'
import { HeroOverlay } from './overlay/HeroOverlay'
import { scrollToProgress, startOnDesktop, trackScroll, trackShortcuts } from './scroll'
import { Desktop } from './desktop/Desktop'
import { useDevice } from './desktop/screen'
import { PhoneUI } from './phone/PhoneUI'
import { skipToDesktop } from './handoff'
import { HAS_WEBGL } from './quality'

export default function App() {
  const device = useDevice()

  useEffect(() => {
    if (!HAS_WEBGL) {
      // css hides the back to cafe buttons
      document.documentElement.classList.add('no-webgl')
      skipToDesktop()
      return
    }
    const stopScroll = trackScroll()
    const stopShortcuts = trackShortcuts()
    if (startOnDesktop) scrollToProgress(1, 'instant')
    return () => {
      stopScroll()
      stopShortcuts()
    }
  }, [])

  // fades in over the laptop (or phone) screen at the end of the scroll
  const ui = device === 'phone' ? <PhoneUI /> : <Desktop />
  if (!HAS_WEBGL) return ui

  return (
    <>
      <Experience />
      <HeroOverlay />
      {ui}
      {/* spacer for scroll height */}
      <div className="scroll-track" aria-hidden="true" />
    </>
  )
}
