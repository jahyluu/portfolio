// scroll progress 0-1. plain object instead of state so scrolling doesn't re-render,
// the scene just reads it each frame. also mirrored to --scroll for css
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
