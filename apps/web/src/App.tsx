import { lazy, Suspense, useEffect } from 'react'
import { Analytics } from '@vercel/analytics/react'
import { HeroOverlay } from './overlay/HeroOverlay'
import { Intro } from './overlay/Intro'
import { markSceneReady, useSceneReady } from './loading'
import { scrollToProgress, startOnDesktop, trackScroll, trackShortcuts } from './scroll'
import { Desktop } from './desktop/Desktop'
import { useDevice } from './desktop/screen'
import { PhoneUI } from './phone/PhoneUI'
import { skipToDesktop } from './handoff'
import { HAS_WEBGL } from './quality'

// cafe + three.js in their own chunk so the intro shows up right away
const Experience = lazy(() => import('./scene/Experience').then((module) => ({ default: module.Experience })))

export default function App() {
  const device = useDevice()
  const ready = useSceneReady()

  useEffect(() => {
    if (!HAS_WEBGL) {
      // css hides the back to cafe buttons
      document.documentElement.classList.add('no-webgl')
      skipToDesktop()
      markSceneReady()
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

  // fades in over the laptop/phone screen at the end of the scroll. waits for the cafe so it
  // isn't painting during the intro
  const ui = ready && (device === 'phone' ? <PhoneUI /> : <Desktop />)
  if (!HAS_WEBGL)
    return (
      <>
        {ui}
        <Intro />
        <Analytics />
      </>
    )

  return (
    <>
      <Suspense fallback={null}>
        <Experience />
      </Suspense>
      <HeroOverlay />
      {ui}
      {/* spacer for scroll height */}
      <div className="scroll-track" aria-hidden="true" />
      <Intro />
      {/* vercel web analytics, visitor counts in the dashboard */}
      <Analytics />
    </>
  )
}
