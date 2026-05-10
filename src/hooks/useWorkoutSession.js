import { useState, useEffect, useRef, useCallback } from 'react'
import { createSession, endSession, logSet, deleteSet, updateSetRecord } from '../lib/supabase/sessions'

function makeLocalId() {
  return Math.random().toString(36).slice(2)
}

function isCompoundLift(name) {
  return /squat|deadlift|bench|press|barbell row|pull.?up|chin.?up/i.test(name)
}

function parseDefaultReps(repsStr) {
  if (!repsStr) return ''
  const match = String(repsStr).match(/\d+/)
  return match ? match[0] : ''
}

function buildInitialSets(exercises) {
  const initial = {}
  for (const ex of exercises) {
    const name = ex.exercise
    const count = parseInt(ex.sets) || 3
    initial[name] = Array.from({ length: count }, (_, i) => ({
      id: null,
      localId: makeLocalId(),
      setNumber: i + 1,
      weight: ex.weight ? String(ex.weight) : '',
      reps: parseDefaultReps(ex.reps),
      done: false,
      saving: false,
    }))
  }
  return initial
}

export function useWorkoutSession(userId, planId, exercises, dayLabel) {
  const [sessionId, setSessionId] = useState(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loggedSets, setLoggedSets] = useState(() => buildInitialSets(exercises))
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [isEnded, setIsEnded] = useState(false)
  const startTime = useRef(Date.now())

  useEffect(() => {
    if (!userId) return
    createSession(userId, planId, dayLabel).then(session => {
      if (session) setSessionId(session.id)
    })
  }, []) // intentionally run once on mount

  useEffect(() => {
    const id = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startTime.current) / 1000))
    }, 1000)
    return () => clearInterval(id)
  }, [])

  // Re-init sets if exercises change (shouldn't happen mid-session but guard it)
  const exercisesRef = useRef(exercises)
  useEffect(() => {
    if (exercisesRef.current === exercises) return
    exercisesRef.current = exercises
    setLoggedSets(buildInitialSets(exercises))
  }, [exercises])

  const markSetDone = useCallback(async (exerciseName, localId, weight, reps) => {
    const compound = isCompoundLift(exerciseName)
    const restSeconds = compound ? 180 : 60

    // Optimistic update
    setLoggedSets(prev => ({
      ...prev,
      [exerciseName]: prev[exerciseName].map(s =>
        s.localId === localId
          ? { ...s, weight, reps, done: true, saving: true }
          : s
      ),
    }))

    if (!sessionId) {
      setLoggedSets(prev => ({
        ...prev,
        [exerciseName]: prev[exerciseName].map(s =>
          s.localId === localId ? { ...s, saving: false } : s
        ),
      }))
      return restSeconds
    }

    const setNumber = loggedSets[exerciseName]?.find(s => s.localId === localId)?.setNumber ?? 1
    const saved = await logSet(sessionId, exerciseName, {
      setNumber,
      weight: parseFloat(weight) || null,
      reps: parseInt(reps) || 0,
      restAfterSeconds: restSeconds,
    })

    setLoggedSets(prev => ({
      ...prev,
      [exerciseName]: prev[exerciseName].map(s =>
        s.localId === localId
          ? { ...s, id: saved?.id ?? null, saving: false }
          : s
      ),
    }))

    return restSeconds
  }, [sessionId, loggedSets])

  const undoSet = useCallback(async (exerciseName, localId) => {
    const set = loggedSets[exerciseName]?.find(s => s.localId === localId)
    if (set?.id) await deleteSet(set.id)
    setLoggedSets(prev => ({
      ...prev,
      [exerciseName]: prev[exerciseName].map(s =>
        s.localId === localId ? { ...s, id: null, done: false, saving: false } : s
      ),
    }))
  }, [loggedSets])

  const addSet = useCallback((exerciseName) => {
    setLoggedSets(prev => {
      const current = prev[exerciseName] || []
      const last = current[current.length - 1]
      return {
        ...prev,
        [exerciseName]: [
          ...current,
          {
            id: null,
            localId: makeLocalId(),
            setNumber: current.length + 1,
            weight: last?.weight || '',
            reps: last?.reps || '',
            done: false,
            saving: false,
          },
        ],
      }
    })
  }, [])

  const removeSet = useCallback(async (exerciseName, localId) => {
    const set = loggedSets[exerciseName]?.find(s => s.localId === localId)
    if (set?.id) await deleteSet(set.id)
    setLoggedSets(prev => ({
      ...prev,
      [exerciseName]: prev[exerciseName]
        .filter(s => s.localId !== localId)
        .map((s, i) => ({ ...s, setNumber: i + 1 })),
    }))
  }, [loggedSets])

  const updateSetField = useCallback((exerciseName, localId, field, value) => {
    setLoggedSets(prev => ({
      ...prev,
      [exerciseName]: prev[exerciseName].map(s =>
        s.localId === localId ? { ...s, [field]: value } : s
      ),
    }))
  }, [])

  const saveSetEdit = useCallback(async (exerciseName, localId, weight, reps) => {
    const set = loggedSets[exerciseName]?.find(s => s.localId === localId)
    if (!set?.id) return
    setLoggedSets(prev => ({
      ...prev,
      [exerciseName]: prev[exerciseName].map(s =>
        s.localId === localId ? { ...s, weight, reps } : s
      ),
    }))
    await updateSetRecord(set.id, { weight: parseFloat(weight) || null, reps: parseInt(reps) || 0 })
  }, [loggedSets])

  const finishSession = useCallback(async (rating, notes) => {
    if (!sessionId) return
    const duration = Math.floor((Date.now() - startTime.current) / 1000)
    await endSession(sessionId, { durationSeconds: duration, rating, notes })
    setIsEnded(true)
  }, [sessionId])

  const totalSets = Object.values(loggedSets).reduce((sum, sets) => sum + sets.length, 0)
  const completedSets = Object.values(loggedSets).reduce((sum, sets) => sum + sets.filter(s => s.done).length, 0)
  const hasUnsaved = completedSets > 0

  const mm = String(Math.floor(elapsedSeconds / 60)).padStart(2, '0')
  const ss = String(elapsedSeconds % 60).padStart(2, '0')
  const elapsedMmss = `${mm}:${ss}`

  return {
    sessionId,
    currentIndex,
    setCurrentIndex,
    loggedSets,
    elapsedSeconds,
    elapsedMmss,
    totalSets,
    completedSets,
    hasUnsaved,
    isEnded,
    markSetDone,
    undoSet,
    addSet,
    removeSet,
    updateSetField,
    saveSetEdit,
    finishSession,
  }
}
