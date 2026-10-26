import { Experience } from './scene/Experience'
import { HeroOverlay } from './overlay/HeroOverlay'

export default function App() {
  return (
    <>
      <Experience />
      <HeroOverlay />
      {import.meta.env.DEV && (
        <p className="dev-hint">Preview: press 1–5 to jump between camera beats</p>
      )}
    </>
  )
}
