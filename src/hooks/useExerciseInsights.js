import { useState, useEffect } from 'react'
import { getExerciseHistory } from '../lib/supabase/sessions'
import {
  generateInsights,
  sessionVolume,
  bestSet1RM,
  detectPB,
  trendSlope,
  percentChange,
} from '../lib/insights'

export function useExerciseInsights(userId, exerciseName, currentSets = []) {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!userId || !exerciseName) return
    setLoading(true)
    getExerciseHistory(userId, exerciseName, 5).then(data => {
      setHistory(data)
      setLoading(false)
    })
  }, [userId, exerciseName])

  // history is oldest-first; history[history.length - 1] = most recent previous session
  const lastSessionHistory = history.length ? history[history.length - 1] : null

  const doneSets = currentSets.filter(s => s.done && s.weight !== '' && s.reps !== '')

  const volumes = history.map(s => sessionVolume(s.sets))
  const slope = trendSlope(volumes)
  const volChange = percentChange(volumes)
  const isPB = detectPB(doneSets, history)
  const insights = generateInsights(exerciseName, doneSets, history)

  // sparkData oldest → newest so chart reads left-to-right as progression
  const sparkData = history.map((s, i) => ({
    session: i + 1,
    volume: Math.round(sessionVolume(s.sets)),
  }))

  // Current session metrics
  const currentEst1RM = doneSets.length ? bestSet1RM(doneSets) : null
  const currentTopReps = doneSets.length
    ? Math.max(...doneSets.map(s => parseInt(s.reps) || 0))
    : null

  // Last session metrics (for comparison baseline and fallback display)
  const lastEst1RM = lastSessionHistory ? bestSet1RM(lastSessionHistory.sets) : null
  const lastTopReps = lastSessionHistory
    ? Math.max(...lastSessionHistory.sets.map(s => s.reps ?? 0))
    : null

  // Display: current if sets done, otherwise last session so the sheet isn't blank
  const est1RM = currentEst1RM ?? lastEst1RM
  const displayTopReps = currentTopReps ?? lastTopReps

  // Deltas only meaningful when current sets have been done
  const oneRMDelta = currentEst1RM !== null && lastEst1RM !== null
    ? Math.round(currentEst1RM - lastEst1RM)
    : null
  const repsDelta = currentTopReps !== null && lastTopReps !== null
    ? currentTopReps - lastTopReps
    : null

  const showingCurrent = doneSets.length > 0

  return {
    loading,
    history,
    insights,
    sparkData,
    isPB,
    slope,
    volChange,
    est1RM,
    last1RM: lastEst1RM,
    oneRMDelta,
    lastTopReps,
    currentTopReps: displayTopReps,
    repsDelta,
    showingCurrent,
    volumes,
  }
}
