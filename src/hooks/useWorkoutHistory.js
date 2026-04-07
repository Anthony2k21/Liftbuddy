import { useState } from 'react'

export function useWorkoutHistory() {
  const [history, setHistory] = useState(() => {
    const saved = localStorage.getItem('workoutHistory')
    return saved ? JSON.parse(saved) : []
  })

  function logSession(entry, date) {
    const entryDate = (date || new Date().toISOString()).slice(0, 10)
    // Read fresh from localStorage to avoid stale closure state
    const current = JSON.parse(localStorage.getItem('workoutHistory') || '[]')
    // Upsert — replace any entry for this muscle group on the same date
    const filtered = current.filter(h => {
      const hDate = h.date ? h.date.slice(0, 10) : null
      return !(hDate === entryDate && h.muscleGroup === entry.muscleGroup)
    })
    const updated = [...filtered, { date: entryDate, ...entry }]
    setHistory(updated)
    localStorage.setItem('workoutHistory', JSON.stringify(updated))
    window.dispatchEvent(new Event('workoutHistoryUpdated'))
  }

  return { history, logSession }
}
