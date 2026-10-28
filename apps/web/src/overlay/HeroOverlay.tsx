// name/title over the opening shot, fades out on scroll (see global.css)
// TODO: skip button once the desktop exists
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
