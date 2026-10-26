# Portfolio

A low-poly, night-time cafe. Scrolling spirals the camera down into my laptop,
which becomes a Mac-inspired desktop holding my projects.

Master plan: https://claude.ai/artifact/L7wc5DDFfBRoxsWekoaqUa

## Status

Build order step 2 of 7: front-end setup with a grey-box room held at camera beat 1.

## Structure

```
portfolio/
├── apps/
│   └── web/                 # front end (Vite + React + TypeScript + React Three Fiber)
│       └── src/
│           ├── scene/       # 3D: layout, blockout, lighting, camera
│           ├── overlay/     # HTML laid over the 3D scene (name, title)
│           └── styles/
├── assets-src/              # raw models and downloads (not shipped); CREDITS.md logs licenses
└── docs/decisions/          # one short note per structural decision
```

`apps/api/` (backend) and `content/` (project descriptions) are added in later steps.

## Run locally

```
cd apps/web
npm install
npm run dev
```
