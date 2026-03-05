# Copilot / AI Agent Instructions for body-tracker

Short overview
- This is a small React + Vite SPA that renders a 3D scene using `three` and `@react-three/fiber`.
- Entry points: `index.html` -> `src/main.jsx` -> `src/App.jsx`.

How to run & build
- Start local dev server with: `npm run dev` (uses Vite HMR).
- Build for production: `npm run build`.
- Preview a production build: `npm run preview`.
- Linting: `npm run lint` (ESLint configured via `package.json` devDependencies).

Key architecture notes (what to know quickly)
- 3D rendering: core 3D work is implemented with `three` + `@react-three/fiber` and helpers from `@react-three/drei`.
  - Inspect `src/components/Humanmodel.jsx` (3D model setup) and `src/components/*` for other scene objects.
  - Textures live under `public/textures` and `src/assets` for bundled assets.
- UI structure: components are small, mostly presentational React components under `src/components/`.
  - Examples: `Statsbar.jsx`, `Workoutmodal.jsx`, and `Humanmodel.jsx`.
  - CSS modules are used for some components (files named `*.module.css`). Follow that pattern when adding component-level styles.
- No global state library is present (no Redux/MobX). Follow existing local state and prop-drilling patterns unless a clear need for central state arises.

Project-specific conventions & patterns
- File naming: components use PascalCase for React components (e.g., `Humanmodel.jsx`) and snake/camel for others as present — keep consistent with existing files.
- Styles: use CSS modules where present (see `Statsbar.module.css`, `WorkoutModal.module.css`, `App.module.css`). Prefer adding a `*.module.css` alongside a component if styles are component-scoped.
- 3D assets: prefer using `public/` for large textures so Vite serves them statically; import small assets from `src/assets` as needed.
- Avoid introducing breaking runtime dependencies; add any new dependency to `package.json` and prefer already-present ecosystems (React, three, @react-three/*).

Files to inspect for changes or examples
- App shell / routing / root: `src/App.jsx`, `src/main.jsx`.
- 3D scene components: `src/components/Humanmodel.jsx`, `boxing_bag.jsx`, `pull_up_bar.jsx`, `flat_bench.jsx`.
- Component UI patterns: `src/components/Statsbar.jsx`, `src/components/Workoutmodal.jsx`.
- Build/dev config: `vite.config.js`, `package.json` scripts.

Developer workflows & common commands
- Start development: `npm run dev` and open the port printed by Vite (default :5173).
- Quick lint check: `npm run lint`.
- To add a dependency: update `package.json` and run the package manager (project assumes `npm` scripts; use `npm install <pkg>`).

Do's and Don'ts for automated edits
- Do: Keep changes small and local to one component when possible; follow existing prop/state patterns.
- Do: Use CSS modules for new component styles unless adding global styles intentionally.
- Don't: Replace local state with a global store unless implementing a clearly scoped feature that needs it.
- Don't: Move large texture assets into `src/` without reason; keep them in `public/textures` to avoid increasing bundle size.

Missing or non-discoverable items to ask humans about
- Any preferred code style beyond ESLint (prettier, formatting rules)?
- Are there CI checks or branch protections that affect commits/builds?

If you (human) want more edits
- I can run `npm run lint`, or open/patch specific components with tests or prop typings.

End of file.
