// page scroll as 0 (top) -> 1 (bottom). plain object, not react state,
// so scrolling never re-renders. scene reads it every frame.
// also written to the --scroll css var so overlay stuff can fade in css
export const scroll = { progress: 0 }

function maxScroll() {
  return document.documentElement.scrollHeight - window.innerHeight
}

function update() {
  const max = maxScroll()
  scroll.progress = max > 0 ? Math.min(Math.max(window.scrollY / max, 0), 1) : 0
  document.documentElement.style.setProperty('--scroll', scroll.progress.toFixed(4))
}

// returns cleanup
export function trackScroll() {
  update()
  window.addEventListener('scroll', update, { passive: true })
  window.addEventListener('resize', update)
  return () => {
    window.removeEventListener('scroll', update)
    window.removeEventListener('resize', update)
  }
}

export function scrollToProgress(progress: number) {
  window.scrollTo({ top: progress * maxScroll(), behavior: 'smooth' })
}
