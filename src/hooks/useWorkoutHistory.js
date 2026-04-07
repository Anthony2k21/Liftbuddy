import { useState } from 'react'

export function useWorkoutHistory() {
  const [history, setHistory] = useState(() => {
    const saved = localStorage.getItem('workoutHistory')
    return saved ? JSON.parse(saved) : []
  })

  function logSession(entry) {
    const todayDate = new Date().toISOString().slice(0, 10)
    // Read fresh from localStorage to avoid stale closure state
    const current = JSON.parse(localStorage.getItem('workoutHistory') || '[]')
    // Replace any existing entry for this muscle group today (upsert)
    const filtered = current.filter(h => {
      const hDate = h.date ? h.date.slice(0, 10) : null
      return !(hDate === todayDate && h.muscleGroup === entry.muscleGroup)
    })
    const updated = [...filtered, { date: new Date().toISOString(), ...entry }]
    setHistory(updated)
    localStorage.setItem('workoutHistory', JSON.stringify(updated))
    window.dispatchEvent(new Event('workoutHistoryUpdated'))
  }

  return { history, logSession }
}
