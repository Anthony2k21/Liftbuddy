# No1Assist — Body Tracker App

## Goal
A mobile-first fitness tracker that combines a 3D interactive body model with workout logging and an AI assistant. The app helps users track which muscle groups they've trained, log exercises, and get AI-powered workout advice.

## Core Features
- **3D View** — Interactive 3D human model that highlights muscle groups based on training intensity (rest/low/med/high). Tap the model to open an arc UI for logging. Includes 3D gym equipment (flat bench, boxing bag, pull-up bar).
- **Session InfoBoard** — 3D board in the scene showing today's logged session (exercises, sets, reps, weight). Toggled via the SESSION LOG button.
- **Workout Log tab** — Collapsible boards per muscle group (e.g. Chest & Triceps, Leg Day). Each board has exercises with sets/reps/weight, quick-add, and a checkmark to mark the workout as complete — which updates the 3D model colours.
- **AI Assistant tab** — Chat with Gemini AI for workout advice. Can log workouts directly from chat using a structured JSON block (`<WORKOUT>...</WORKOUT>`), which registers on the 3D model.
- **Persistence** — All data (muscle colours, workout boards, session log, AI chat history, completed boards) saved to localStorage.

## Tech Stack
- React + Vite
- @react-three/fiber + @react-three/drei for 3D scene
- Gemini 2.5 Flash via a Vercel serverless proxy (`/api/chat`) — key stored in `AI_API_KEY` env var on Vercel
- Deployed on Vercel at https://body-tracker-three.vercel.app
- GitHub: https://github.com/Anthony2k21/No1Assist-v1

## Project Structure
- `src/App.jsx` — Root component, tab routing, muscle data state, drag-to-rotate logic
- `src/components/Humanmodel.jsx` — 3D model with muscle colour mapping
- `src/components/WorkoutModal.jsx` — Modal for logging sets/reps/weight per muscle group
- `src/components/WorkoutLog.jsx` — Workout Log tab with boards and completion tracking
- `src/components/WorkoutLogBoard.jsx` — 3D board showing workout log boards in the scene
- `src/components/InfoBoard.jsx` — 3D board showing today's session log in the scene
- `src/components/AiAssistant.jsx` — AI chat tab, calls `/api/chat`
- `src/components/TabBar.jsx` — Bottom tab bar (3D View / AI Assistant / Workout Log)
- `src/hooks/useWorkoutHistory.js` — Persists session history to localStorage
- `api/chat.js` — Vercel serverless function proxying requests to Gemini API

## Planned Features

### AI → Workout Log Integration
The AI assistant should be able to update the Workout Log boards directly from chat. For example:
- User: "Give me a push pull legs routine"
- AI creates/replaces boards in the Workout Log with the correct muscle groups and exercises
- This means the AI response needs a new structured block (e.g. `<ROUTINE>...</ROUTINE>`) containing an array of boards with name, part, emoji, color, and exercises
- The `AiAssistant` component should parse this block and call a new `onUpdateBoards` prop that updates the `workoutBoards` localStorage key and re-renders the Workout Log
- The 3D model colours should update accordingly when boards are marked complete

## Key Conventions
- CSS Modules for all component styles
- localStorage keys: `muscleData`, `workoutBoards`, `completedBoards`, `workoutHistory`, `aiChatHistory`
- Muscle groups: chest, shoulders, abs, arms, back, legs
- Intensity levels: rest, low, med, high
- Do not commit `.env` — API key lives in Vercel env vars only
