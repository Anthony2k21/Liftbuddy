import { useState, useEffect } from 'react'
import { getWorkoutHistory, upsertWorkoutSession } from '../lib/db'

export function useWorkoutHistory(userId) {
  const [history, setHistory] = useState([])

  useEffect(() => {
    if (!userId) return
    getWorkoutHistory(userId).then(setHistory)
  }, [userId])

  async function logSession(entry, date) {
    if (!userId) return
    await upsertWorkoutSession(userId, { ...entry, date })
    getWorkoutHistory(userId).then(data => {
      setHistory(data)
      window.dispatchEvent(new Event('workoutHistoryUpdated'))
    })
  }

  return { history, logSession }
}
