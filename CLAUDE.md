# CLAUDE.md — No1Assist-v1

## Project Overview

No1Assist is a fitness tracking web app with an immersive 3D UI. Users interact with a 3D human body model to log muscle activity, plan workouts, track progress on a calendar, and chat with an AI coaching assistant.

**Deployment:** Vercel (web) + Capacitor (Android/iOS)  
**Live API:** Vercel serverless function proxies requests to Google Gemini 2.5 Flash

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 18.3.1 + JSX |
| Build tool | Vite 7.3.1 |
| 3D engine | Three.js 0.167.0 + @react-three/fiber 8 + @react-three/drei 9 |
| AI | @google/generative-ai 0.24.1 (Gemini) |
| Styling | CSS Modules |
| Mobile | Capacitor 8.1.0 (Android target) |
| Linting | ESLint 9 (flat config) |
| Deployment | Vercel (web), Capacitor (mobile) |

No TypeScript. No global state library (Redux, Zustand, etc.). No test framework configured.

---

## Development Commands

```bash
npm run dev        # Start dev server at http://localhost:5173
npm run build      # Production build → dist/
npm run preview    # Preview production build locally
npm run lint       # Run ESLint
```

For mobile (Android):
```bash
npm run build && npx cap sync android && npx cap open android
```

---

## Repository Structure

```
No1Assist-v1/
├── src/
│   ├── App.jsx                   # Root component — main state, 3D canvas setup
│   ├── main.jsx                  # React entry point
│   ├── index.css                 # Global styles
│   ├── components/
│   │   ├── Humanmodel.jsx        # 3D human body mesh with muscle highlighting
│   │   ├── WorkoutModal.jsx      # Exercise logging modal (triggered by clicking muscle)
│   │   ├── WorkoutLog.jsx        # Plans & custom boards management UI
│   │   ├── DailyTracker.jsx      # Calendar + daily exercise completion tracker
│   │   ├── AiAssistant.jsx       # Gemini AI chat with auto-log parsing
│   │   ├── InfoBoard.jsx         # 3D floating board showing session exercises
│   │   ├── WorkoutLogBoard.jsx   # 3D floating board showing active plan day
│   │   ├── TabBar.jsx            # Bottom navigation tabs
│   │   ├── boxing_bag.jsx        # 3D boxing bag equipment model
│   │   ├── flat_bench.jsx        # 3D bench equipment model
│   │   ├── pull_up_bar.jsx       # 3D pull-up bar equipment model
│   │   └── *.module.css          # Scoped CSS per component
│   └── hooks/
│       └── useWorkoutHistory.js  # Custom hook: workout session history + localStorage
├── api/
│   └── chat.js                   # Vercel serverless function — Gemini API proxy
├── public/
│   ├── model.glb                 # Primary human body 3D model
│   ├── model4.glb, model-done.glb # Alternative poses
│   ├── boxing_bag.glb, flat_bench.glb, pull_up_bar.glb  # Equipment
│   ├── textures/                 # Wall textures, FBX assets
│   └── fonts/bebas-neue.woff     # Font used in 3D text rendering
├── android/                      # Capacitor Android project (auto-generated)
├── .github/
│   └── copilot-instructions.md   # AI agent instructions (predates this file)
├── vite.config.js
├── eslint.config.js
├── capacitor.config.json
└── vercel.json
```

---

## Architecture

### State Management

All state lives in `App.jsx` (lifted state) and flows down via props. No global store.

Key state atoms in `App.jsx`:

```js
muscleData     // { chest, shoulders, abs, arms, back, legs } → 'rest'|'low'|'med'|'high'
sessionData    // Current session: { muscleName: [{ exercise, sets, reps, weight }] }
activeTab      // 'workout' | 'assistant' | 'log' | 'tracker'
autoRotate     // boolean — 3D model rotation
```

### localStorage Keys

| Key | Contents |
|---|---|
| `muscleCalendar` | `{ "YYYY-MM-DD": { chest: 'low', ... } }` — per-date muscle activity |
| `workoutHistory` | `[{ timestamp, exercises }]` — session history |
| `workoutBoards` | `[{ id, name, part, emoji, color, exercises }]` — custom boards |
| `workoutPlans` | `[{ id, name, type, daysPerWeek, schedule }]` — plans |
| `selectedPlanId` | Active plan ID string |
| `completedBoards` | Serialized Set of completed board IDs |
| `dailyTracker` | `{ "YYYY-MM-DD": { exerciseKey: { completed, weight } } }` |
| `aiChatHistory` | `[{ role: 'user'|'model', parts: [{ text }] }]` |

### Data Shapes

```js
// Muscle group intensities
muscleData = { chest: 'rest', shoulders: 'low', back: 'med', arms: 'high', abs: 'rest', legs: 'rest' }

// Exercise set (used in modals, boards, tracker)
{ exercise: 'Bench Press', sets: '3', reps: '8-10', weight: '80' }

// Custom workout board
{ id: 'uuid', name: 'Push A', part: 'chest', emoji: '💪', color: '#4f6cff', open: false, exercises: [...] }

// Plan schedule entry
{ day: 'Monday', exercises: [{ exercise, sets, reps, weight }] }
```

---

## Component Details

### `App.jsx`
- Renders a full-screen `<Canvas>` (Three.js scene) as the persistent background
- Overlays React UI tabs on top via absolute positioning
- Handles mouse/touch drag events for 3D model rotation
- Passes muscle click handlers down to `Humanmodel`

### `Humanmodel.jsx`
- Loads GLB via `useGLTF`, animations via `useAnimations`
- Maps mesh names to muscle groups; updates `MeshStandardMaterial` emissive/color based on intensity level
- Supports animation switching via external prop

### `AiAssistant.jsx`
- Sends chat history + user message to `/api/chat`
- Parses two special XML-like blocks in AI responses:
  - `<WORKOUT>{ exercise, sets, reps, weight, muscle }</WORKOUT>` → auto-logs to session
  - `<ROUTINE>[{ day, exercises }]</ROUTINE>` → creates a new workout board
- Chat history persisted to localStorage between sessions

### `api/chat.js`
- POST only, requires `AI_API_KEY` environment variable (Gemini API key)
- Forwards `{ history, message }` to `gemini-2.5-flash` model
- Returns `{ response: string }`

### `WorkoutLog.jsx`
- Two tabs: "Plans" (pre-built routines) and "My Boards" (custom boards)
- Plans include PPL and Stronglifts 5x5 with weekly schedules
- Volume displayed as `sets × reps × weight`

### `DailyTracker.jsx`
- Calendar month view with day selection
- Reads active plan schedule for selected date's weekday
- Completion triggers `storage` event so `App.jsx` can update `muscleData`

### 3D Boards (`InfoBoard.jsx`, `WorkoutLogBoard.jsx`)
- Rendered as `<mesh>` inside the Three.js `<Canvas>`
- Use `THREE.Shape` + `ShapeGeometry` for rounded rectangle borders
- Text via `@react-three/drei <Text>` component using Bebas Neue font

---

## Conventions & Patterns

### File Naming
- Components: **PascalCase** (`WorkoutModal.jsx`, `TabBar.jsx`)
- Hooks: **camelCase** with `use` prefix (`useWorkoutHistory.js`)
- Styles: Match component name + `.module.css` (`WorkoutModal.module.css`)

### CSS Modules
```jsx
import styles from './MyComponent.module.css'
<div className={`${styles.container} ${isActive ? styles.active : ''}`} />
```

### Muscle Colors (canonical, used across components)
```js
chest:     '#4f6cff'   // blue
shoulders: '#00e5ff'   // cyan
back:      '#a56bff'   // purple
arms:      '#f5a623'   // orange
abs:       '#ff3d71'   // pink/red
legs:      '#39ff14'   // lime green
```

### Intensity → Visual Mapping
```
rest → gray  (#888 or dimmed emissive)
low  → pink  (#ff69b4 or low emissive)
med  → cyan  (#00e5ff or mid emissive)
high → lime  (#39ff14 or full emissive)
```

### 3D Asset Convention
- All GLB/texture/font files go in `public/` — never import into the bundle
- Reference as absolute paths: `/model.glb`, `/boxing_bag.glb`, etc.
- Equipment components (`boxing_bag.jsx`, etc.) load their own GLB internally

### Component Boundaries
- Pure UI components (modals, tabs) live in `src/components/`
- 3D scene objects (body, boards, equipment) also live in `src/components/` — rendered inside `<Canvas>` in `App.jsx`
- API logic is server-only in `api/`

### ESLint Rules
- React hooks rules enforced (`react-hooks/rules-of-hooks`, `react-hooks/exhaustive-deps`)
- Unused vars allowed if starting with `_` or uppercase
- No TypeScript; JSX only

---

## Environment Variables

| Variable | Where | Purpose |
|---|---|---|
| `AI_API_KEY` | Vercel (server-side only) | Google Gemini API key |

Never expose `AI_API_KEY` client-side — it only exists in `api/chat.js`.

---

## Deployment

**Vercel (web):**
- `vercel.json` configures build command and output directory
- All routes rewrite to `index.html` (SPA)
- `api/chat.js` becomes a serverless function at `/api/chat`

**Android (Capacitor):**
- Config in `capacitor.config.json` (App ID: `com.no1assist.bodytracker`)
- Requires `npm run build` then `npx cap sync android`
- Uses HTTPS scheme on Android for local file access

---

## Known Gaps / Things to Be Aware Of

- **No tests** — no testing framework is configured. When adding features, test manually via `npm run dev`.
- **No TypeScript** — prop types are not enforced; be careful with data shape consistency.
- **No global state library** — all state is lifted to `App.jsx` or stored in localStorage. Avoid introducing external state managers unless scope grows significantly.
- **localStorage coupling** — multiple components read/write localStorage directly. Use the canonical key names listed above and dispatch `storage` events when writing if other components need to react.
- **3D performance** — avoid adding expensive `useFrame` loops or dynamically creating geometries inside render. Clone materials rather than sharing when updating colors per-mesh.
- **Gemini model** — the API currently targets `gemini-2.5-flash`. Update `api/chat.js` if the model changes.

---

## Git Workflow

- Feature branch: `claude/add-claude-documentation-mAc7J` (current)
- Main branch: `main`
- Commits should be concise and descriptive
- Push with: `git push -u origin <branch-name>`
