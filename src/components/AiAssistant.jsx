import { useState, useRef, useEffect } from 'react'
import styles from './AiAssistant.module.css'

const API_URL = '/api/chat'

const SYSTEM_PROMPT = `You are a personal fitness assistant built into a body tracker app called No1Assist.
You help users with workout advice, muscle recovery, exercise form, programming, and nutrition.
Keep responses concise and practical. You have access to the user's current session muscle data if provided.

When the user asks to log or add a single workout, include a JSON block at the END of your response:
<WORKOUT>{"muscleGroup":"chest","sets":[{"exercise":"Bench Press","sets":"3","reps":"8–10","weight":"80"}]}</WORKOUT>

When the user asks for a full routine (e.g. push pull legs, PPL, upper lower, full body split) WITHOUT a specific duration/timeframe, include a ROUTINE block at the END of your response:
<ROUTINE>[
  {"name":"Push","part":"chest","emoji":"💪","color":"#4f6cff","exercises":[
    {"name":"Bench Press","sets":4,"reps":8,"weight":80,"notes":""},
    {"name":"Overhead Press","sets":3,"reps":10,"weight":50,"notes":""},
    {"name":"Tricep Pushdown","sets":3,"reps":12,"weight":25,"notes":""}
  ]},
  {"name":"Pull","part":"back","emoji":"🏋️","color":"#ff6bae","exercises":[
    {"name":"Pull-ups","sets":4,"reps":8,"weight":0,"notes":"bodyweight"},
    {"name":"Barbell Row","sets":4,"reps":8,"weight":70,"notes":""},
    {"name":"Hammer Curl","sets":3,"reps":12,"weight":18,"notes":""}
  ]},
  {"name":"Legs","part":"quads","emoji":"🦵","color":"#ffd166","exercises":[
    {"name":"Squat","sets":5,"reps":5,"weight":100,"notes":""},
    {"name":"Leg Press","sets":4,"reps":12,"weight":160,"notes":""},
    {"name":"Romanian Deadlift","sets":3,"reps":10,"weight":70,"notes":""}
  ]}
]</ROUTINE>

When the user asks for a structured program lasting multiple weeks (e.g. Stronglifts 5x5, PHUL, a 12-week strength block, a beginner program, any named program with a timeframe), include a PLAN block at the END of your response. This creates a full workout plan linked to the calendar:
<PLAN>{
  "name": "Stronglifts 5×5",
  "type": "Strength",
  "duration": "12 weeks",
  "daysPerWeek": 3,
  "color": "#ffd166",
  "description": "Linear progression with compound lifts. Add 2.5 kg each session.",
  "schedule": [
    {
      "day": "Workout A",
      "exercises": [
        { "name": "Squat",          "sets": 5, "reps": "5", "weight": 60 },
        { "name": "Bench Press",    "sets": 5, "reps": "5", "weight": 50 },
        { "name": "Barbell Row",    "sets": 5, "reps": "5", "weight": 40 }
      ]
    },
    {
      "day": "Workout B",
      "exercises": [
        { "name": "Squat",          "sets": 5, "reps": "5", "weight": 60 },
        { "name": "Overhead Press", "sets": 5, "reps": "5", "weight": 35 },
        { "name": "Deadlift",       "sets": 1, "reps": "5", "weight": 80 }
      ]
    }
  ]
}</PLAN>

Rules:
- part (for ROUTINE) must be one of: chest, back, shoulders, biceps, triceps, abs, quads, hamstrings, calves, glutes, full
- color should be a hex color that suits the program
- schedule days cycle through the week based on daysPerWeek — name them clearly (e.g. Push/Pull/Legs, Workout A/B, Upper/Lower, Day 1/2/3)
- Only include ONE block per response — never combine WORKOUT, ROUTINE, and PLAN
- Use PLAN for anything with a duration/timeframe. Use ROUTINE for simple split boards. Use WORKOUT for single session logging.
- Only include blocks when the user is explicitly asking to create/set a program, routine, or log a workout`

export function AiAssistant({ muscleData, history, onLogWorkout, onUpdateBoards, onCreatePlan }) {
  const [messages, setMessages] = useState(() => {
    const saved = localStorage.getItem('aiChatHistory')
    if (saved) {
      try { return JSON.parse(saved) } catch {}
    }
    return [{ role: 'assistant', text: "What's the plan today?" }]
  })
  const [input, setInput]     = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef             = useRef()

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    localStorage.setItem('aiChatHistory', JSON.stringify(messages))
  }, [messages])
   async function send() {
    const text = input.trim()
    if (!text || loading) return

    const userMsg = { role: 'user', text }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    const contextNote = muscleData
      ? `\n\nUser's current muscle activity: ${JSON.stringify(muscleData)}`
      : ''

    const contents = [
      { role: 'user', parts: [{ text: SYSTEM_PROMPT + contextNote }] },
      { role: 'model', parts: [{ text: "Got it, I'm ready to help." }] },
      ...messages.slice(1).map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.text }]
      })),
      { role: 'user', parts: [{ text }] }
    ]

    try {
      const res  = await fetch(API_URL, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ contents })
      })
      const data = await res.json()
      console.log('Gemini:', res.status, JSON.stringify(data))
      const raw = data.candidates?.[0]?.content?.parts?.[0]?.text ?? `Error ${res.status}: ${data.error?.message ?? 'No response.'}`

      const workoutMatch = raw.match(/<WORKOUT>([\s\S]*?)<\/WORKOUT>/)
      if (workoutMatch && onLogWorkout) {
        try { onLogWorkout(JSON.parse(workoutMatch[1])) } catch {}
      }

      const routineMatch = raw.match(/<ROUTINE>([\s\S]*?)<\/ROUTINE>/)
      if (routineMatch && onUpdateBoards) {
        try {
          const boards = JSON.parse(routineMatch[1])
          onUpdateBoards(boards)
        } catch {}
      }

      const planMatch = raw.match(/<PLAN>([\s\S]*?)<\/PLAN>/)
      if (planMatch && onCreatePlan) {
        try { onCreatePlan(JSON.parse(planMatch[1])) } catch {}
      }

      const reply = raw
        .replace(/<WORKOUT>[\s\S]*?<\/WORKOUT>/g, '')
        .replace(/<ROUTINE>[\s\S]*?<\/ROUTINE>/g, '')
        .replace(/<PLAN>[\s\S]*?<\/PLAN>/g, '')
        .trim()
      setMessages(prev => [...prev, { role: 'assistant', text: reply }])
    } catch (err) {
      console.error('Gemini error:', err)
      setMessages(prev => [...prev, { role: 'assistant', text: 'Error reaching AI. Check your API key.' }])
    } finally {
      setLoading(false)
    }
  }

  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.messages}>
        {messages.map((m, i) => (
          <div key={i} className={`${styles.bubble} ${m.role === 'user' ? styles.user : styles.assistant}`}>
            {m.text}
          </div>
        ))}
        {loading && (
          <div className={`${styles.bubble} ${styles.assistant} ${styles.typing}`}>
            <span /><span /><span />
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className={styles.inputRow}>
        <textarea
          className={styles.input}
          rows={1}
          placeholder="Ask anything..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
        />
        <button className={styles.sendBtn} onClick={send} disabled={loading}>
          ↑
        </button>
      </div>
    </div>
  )
}
