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
  document.documentElement.classList.toggle('scrolled', scroll.progress > 0.05)
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

export function scrollToProgress(progress: number, behavior: ScrollBehavior = 'smooth') {
  window.scrollTo({ top: progress * maxScroll(), behavior })
  if (behavior === 'instant') update()
}

// jump all the way out to the opening shot, or all the way in to the desktop
export const goToCafe = () => scrollToProgress(0)
export const goToDesktop = () => scrollToProgress(1)

// /#desktop opens straight onto the desktop (for the resume and linkedin)
export const startOnDesktop = location.hash === '#desktop'

// 1 = cafe, 2 = desktop. ignored while typing or with modifier keys held
export function trackShortcuts() {
  const onKey = (event: KeyboardEvent) => {
    if (event.metaKey || event.ctrlKey || event.altKey || event.repeat) return
    const target = event.target as HTMLElement | null
    if (target?.closest('input, textarea, select, [contenteditable="true"]')) return
    if (event.key === '1') goToCafe()
    if (event.key === '2') goToDesktop()
  }
  window.addEventListener('keydown', onKey)
  return () => window.removeEventListener('keydown', onKey)
}
