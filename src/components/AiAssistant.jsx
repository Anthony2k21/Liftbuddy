import { useState, useRef, useEffect } from 'react'
import styles from './AiAssistant.module.css'

const API_KEY = import.meta.env.VITE_AI_API_KEY
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`

const SYSTEM_PROMPT = `You are a personal fitness assistant built into a body tracker app called No1Assist.
You help users with workout advice, muscle recovery, exercise form, programming, and nutrition.
Keep responses concise and practical. You have access to the user's current session muscle data if provided.

When the user asks to log or add a workout, include a JSON block at the END of your response in this exact format:
<WORKOUT>{"muscleGroup":"chest","sets":[{"exercise":"Bench Press","sets":"3","reps":"1–3","weight":"80"}]}</WORKOUT>

Rules for the JSON:
- muscleGroup must be one of: chest, shoulders, abs, arms, back, legs
- sets is a string number from "1" to "12"
- reps must be one of: "1–3","4–6","6–8","8–10","10–12","12–15","15–20" — pick the closest match
- weight is a string number in kg, empty string if not provided
- Only include the <WORKOUT> block when actually logging — not for general questions`

export function AiAssistant({ muscleData, history, onLogWorkout }) {
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
      const raw   = data.candidates?.[0]?.content?.parts?.[0]?.text ?? `Error ${res.status}: ${data.error?.message ?? 'No response.'}`
      const match = raw.match(/<WORKOUT>([\s\S]*?)<\/WORKOUT>/)
      if (match && onLogWorkout) {
        try { onLogWorkout(JSON.parse(match[1])) } catch {}
      }
      const reply = raw.replace(/<WORKOUT>[\s\S]*?<\/WORKOUT>/g, '').trim()
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
