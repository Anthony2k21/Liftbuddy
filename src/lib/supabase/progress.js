import { supabase } from '../supabase'

// Maps exercise name to the canonical muscle group key used across the app
function inferMuscleGroup(name) {
  if (!name) return 'other'
  if (/bench|chest fly|pec deck|push.?up/i.test(name)) return 'chest'
  if (/shoulder|lateral raise|front raise|overhead press|military press|arnold/i.test(name)) return 'shoulders'
  if (/back|barbell row|seated row|lat pull|pull.?up|deadlift|rack pull|chin.?up/i.test(name)) return 'back'
  if (/squat|leg press|lunge|hack squat|leg extension|hamstring|rdl|romanian|leg curl|glute|hip thrust|calf/i.test(name)) return 'legs'
  if (/bicep|curl|tricep|pushdown|skull crusher|dip/i.test(name)) return 'arms'
  if (/ab|crunch|plank|sit.?up|core|cable crunch/i.test(name)) return 'abs'
  return 'other'
}

/**
 * Fetch all completed sessions + their sets, then reshape into the same
 * structure the legacy workout_history table returned:
 *
 *   [{ sessionId, date, muscleGroup, sets: [{ exercise, sets, reps, weight }], rating }]
 *
 * One row per (session × muscle group) so all existing progressUtils functions
 * and chart components work without modification.
 */
export async function fetchProgressHistory(userId) {
  if (!userId) return []

  const { data: sessions, error: sessErr } = await supabase
    .from('sessions')
    .select('id, started_at, ended_at, rating')
    .eq('user_id', userId)
    .not('ended_at', 'is', null)
    .order('started_at', { ascending: true })

  if (sessErr || !sessions?.length) return []

  const sessionIds = sessions.map(s => s.id)
  const sessionById = {}
  for (const s of sessions) {
    sessionById[s.id] = {
      date: s.started_at.split('T')[0],
      // Convert 1-5 star rating to 1-10 scale; null stays null (will be backfilled)
      rating: s.rating != null ? s.rating * 2 : null,
    }
  }

  const { data: sets, error: setsErr } = await supabase
    .from('sets')
    .select('session_id, exercise_name, weight, reps')
    .in('session_id', sessionIds)
    .neq('is_warmup', true)

  if (setsErr) { console.error('fetchProgressHistory sets', setsErr); return [] }

  // Group individual set rows by (sessionId, exerciseName)
  const sessionExMap = {}
  for (const row of sets || []) {
    if (!sessionExMap[row.session_id]) sessionExMap[row.session_id] = {}
    if (!sessionExMap[row.session_id][row.exercise_name]) sessionExMap[row.session_id][row.exercise_name] = []
    sessionExMap[row.session_id][row.exercise_name].push({ weight: row.weight, reps: row.reps })
  }

  const history = []

  for (const [sessionId, exercises] of Object.entries(sessionExMap)) {
    const sess = sessionById[sessionId]
    if (!sess) continue

    // Bucket exercises by inferred muscle group
    const byMuscle = {}
    for (const [exerciseName, exSets] of Object.entries(exercises)) {
      const mg = inferMuscleGroup(exerciseName)
      if (!byMuscle[mg]) byMuscle[mg] = []

      const maxWeight = Math.max(...exSets.map(s => parseFloat(s.weight) || 0))
      const maxReps = Math.max(...exSets.map(s => parseInt(s.reps) || 0))

      byMuscle[mg].push({
        exercise: exerciseName,
        sets:     exSets.length,       // count — matches old shape's s.sets field
        reps:     maxReps,
        weight:   maxWeight > 0 ? maxWeight : '',
      })
    }

    for (const [muscleGroup, muscleSets] of Object.entries(byMuscle)) {
      history.push({
        sessionId,
        date:        sess.date,
        muscleGroup,
        sets:        muscleSets,
        rating:      sess.rating,
      })
    }
  }

  return history.sort((a, b) => a.date.localeCompare(b.date))
}

export async function saveProgressRating(sessionId, ratingOutOf10) {
  // Store as 1-10 float in sessions.rating column (legacy star scale * 2)
  const { error } = await supabase
    .from('sessions')
    .update({ rating: ratingOutOf10 / 2 })  // back to star-compatible float
    .eq('id', sessionId)
  if (error) console.error('saveProgressRating', error)
}

export async function fetchTotalWorkouts(userId) {
  const { count } = await supabase
    .from('sessions')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .not('ended_at', 'is', null)
  return count || 0
}
