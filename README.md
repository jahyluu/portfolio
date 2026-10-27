# Portfolio

My personal portfolio site. It opens on a low-poly cafe at night: I'm sitting at a table in the
middle of the room, working on a laptop. Scrolling moves the camera down and around the room,
over my shoulder and into the laptop screen, which turns into a Mac-style desktop with folders
for my projects, tech stack, about and contact info.

## The scroll

| Beat | Camera | What's on screen |
| --- | --- | --- |
| 1 | High in a ceiling corner, looking at my table | Name, title, skip button, scroll cue |
| 2 | Spirals down along the window side | Name fades out |
| 3 | Settles behind my right shoulder | Laptop screen becomes readable, room blurs |
| 4 | Pushes into the screen | Screen fills the frame |
| 5 | Hands off to the page | Live desktop with Finder open on Projects |

## Tech stack

- **Front end:** React, TypeScript, Vite
- **3D:** Three.js with React Three Fiber and drei
- **Scroll animation:** GSAP ScrollTrigger
- **Backend (planned):** REST API with PostgreSQL

## Project structure

```
portfolio/
├── apps/
│   └── web/                 # front end
│       └── src/
│           ├── scene/       # 3D scene: room layout, blockout models, lighting, camera
│           ├── overlay/     # HTML on top of the scene (name, title)
│           └── styles/
├── assets-src/              # source models and downloads; CREDITS.md tracks licenses
└── docs/decisions/          # notes on major design decisions
```

`apps/api/` (backend) and `content/` (project descriptions) will be added later.

## Running locally

Requires Node 20.19 or newer.

```
cd apps/web
npm install
npm run dev
```

Then open the local URL Vite prints. While the scroll path is still being built, the number
keys 1–5 jump the camera between the five beats.

Other scripts:

- `npm run typecheck` checks types
- `npm run build` creates a production build in `dist/`
- `npm run preview` serves the production build

## Roadmap

The 3D scroll is the hardest part, so it's being built first with simple placeholder shapes.
Real models, content and the backend come after the motion feels right.

- [x] Plan the concept, room layout and camera storyboard
- [x] Set up the front end (Vite, React, TypeScript, React Three Fiber)
- [x] Grey-box cafe scene with all five camera beats
- [ ] Opening shot: framing, lighting, skip button, scroll cue
- [ ] Scroll-driven camera path through all five beats
- [ ] Transition from the 3D screen into the desktop page
- [ ] Mobile framing and a reduced-motion version
- [ ] Style pass: color palette, lighting, low-poly models, idle animations, rain and steam
- [ ] Desktop UI: menu bar, dock, Finder, project Properties panels, back-to-cafe button
- [ ] Project descriptions, resume and contact links
- [ ] Backend: projects API, terminal, live metrics, guestbook, contact form
- [ ] Performance and accessibility pass
- [ ] Deploy with a custom domain

## Credits

Third-party models, textures and animations are listed in
[assets-src/CREDITS.md](assets-src/CREDITS.md) with their sources and licenses.
