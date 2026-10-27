// opening shot overlay. fades out on scroll (global.css). skip comes with the desktop
export function HeroOverlay() {
  return (
    <>
      <header className="hero">
        <h1>Jahy Luu</h1>
        <p>Software Engineer</p>
      </header>
      <p className="scroll-cue" aria-hidden="true">
        Scroll
      </p>
    </>
  )
}
