import { useState } from 'react'

export function useWorkoutHistory() {
  const [history, setHistory] = useState(() => {
    const saved = localStorage.getItem('workoutHistory')
    return saved ? JSON.parse(saved) : []
  })

  function logSession(entry) {
    const updated = [...history, { date: new Date().toISOString(), ...entry }]
    setHistory(updated)
    localStorage.setItem('workoutHistory', JSON.stringify(updated))
  }

  return { history, logSession }
}
