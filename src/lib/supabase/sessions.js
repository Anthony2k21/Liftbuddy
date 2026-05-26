import { supabase } from '../supabase'

export async function createSession(userId, planId, dayLabel) {
  const { data, error } = await supabase
    .from('sessions')
    .insert({ user_id: userId, plan_id: planId || null, day_label: dayLabel })
    .select()
    .single()
  if (error) { console.error('createSession', error); return null }
  return data
}

export async function endSession(sessionId, { durationSeconds, rating, notes } = {}) {
  const { error } = await supabase
    .from('sessions')
    .update({
      ended_at: new Date().toISOString(),
      duration_seconds: durationSeconds,
      rating: rating ?? null,
      notes: notes ?? null,
    })
    .eq('id', sessionId)
  if (error) console.error('endSession', error)
}

export async function logSet(sessionId, exerciseName, setData) {
  const { data, error } = await supabase
    .from('sets')
    .insert({
      session_id: sessionId,
      exercise_name: exerciseName,
      set_number: setData.setNumber,
      weight: setData.weight ?? null,
      weight_modifier: setData.weightModifier ?? null,
      reps: setData.reps,
      rest_after_seconds: setData.restAfterSeconds ?? null,
      is_warmup: setData.isWarmup ?? false,
      rpe: setData.rpe ?? null,
    })
    .select()
    .single()
  if (error) { console.error('logSet', error); return null }
  return data
}

export async function updateSetRecord(setId, { weight, reps }) {
  const { error } = await supabase
    .from('sets')
    .update({ weight: weight ?? null, reps })
    .eq('id', setId)
  if (error) console.error('updateSetRecord', error)
}

export async function deleteSet(setId) {
  const { error } = await supabase.from('sets').delete().eq('id', setId)
  if (error) console.error('deleteSet', error)
}

export async function getTodaySession(userId, dayLabel) {
  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('user_id', userId)
    .eq('day_label', dayLabel)
    .gte('started_at', startOfToday.toISOString())
    .is('ended_at', null)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) { console.error('getTodaySession', error); return null }
  return data
}

export async function fetchWeeklySets(userId) {
  if (!userId) return []
  const today = new Date()
  const dow = today.getDay()
  const daysFromMon = dow === 0 ? 6 : dow - 1
  const monday = new Date(today)
  monday.setDate(today.getDate() - daysFromMon)
  monday.setHours(0, 0, 0, 0)

  const { data: sessions, error: sessErr } = await supabase
    .from('sessions')
    .select('id')
    .eq('user_id', userId)
    .gte('started_at', monday.toISOString())

  if (sessErr || !sessions?.length) return []

  const sessionIds = sessions.map(s => s.id)

  const { data, error } = await supabase
    .from('sets')
    .select('exercise_name, weight, reps')
    .in('session_id', sessionIds)
    .neq('is_warmup', true)

  if (error) { console.error('fetchWeeklySets', error); return [] }
  return data || []
}

export async function getSessionSets(sessionId) {
  const { data, error } = await supabase
    .from('sets')
    .select('id, exercise_name, set_number, weight, reps, logged_at')
    .eq('session_id', sessionId)
    .order('logged_at', { ascending: true })
  if (error) { console.error('getSessionSets', error); return [] }
  return data || []
}

export async function getExerciseHistory(userId, exerciseName, limit = 5) {
  const { data: userSessions, error: sessErr } = await supabase
    .from('sessions')
    .select('id')
    .eq('user_id', userId)
  if (sessErr || !userSessions?.length) return []

  const sessionIds = userSessions.map(s => s.id)

  const { data, error } = await supabase
    .from('sets')
    .select('session_id, set_number, weight, weight_modifier, reps, rest_after_seconds, logged_at')
    .in('session_id', sessionIds)
    .eq('exercise_name', exerciseName)
    .order('logged_at', { ascending: false })
    .limit(limit * 8)

  if (error) { console.error('getExerciseHistory', error); return [] }

  const sessionMap = new Map()
  for (const row of data) {
    if (!sessionMap.has(row.session_id)) {
      sessionMap.set(row.session_id, { sessionId: row.session_id, date: row.logged_at, sets: [] })
    }
    sessionMap.get(row.session_id).sets.push({
      setNumber: row.set_number,
      weight: row.weight,
      weightModifier: row.weight_modifier,
      reps: row.reps,
      restAfterSeconds: row.rest_after_seconds,
    })
  }

  // Reverse to oldest-first so callers can use slice(-n) for "most recent n" naturally
  return Array.from(sessionMap.values()).slice(0, limit).reverse()
}
