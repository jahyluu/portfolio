import { goToDesktop } from '../scroll'

// name/title over the opening shot, fades out on scroll (see global.css). the cue doubles as
// a skip button, mainly for phones where there's no 2 key
export function HeroOverlay() {
  return (
    <>
      <header className="hero">
        <h1>Jahy Luu</h1>
        <p>Software Engineer</p>
      </header>
      <button className="scroll-cue" onClick={goToDesktop}>
        Scroll or press 2
      </button>
    </>
  )
}
