import { supabase } from './supabase'

// ── WORKOUT HISTORY ───────────────────────────────────────────────────────────

export async function getWorkoutHistory(userId) {
  const { data, error } = await supabase
    .from('workout_history')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: true })
  if (error) { console.error('getWorkoutHistory', error); return [] }
  // Normalise to the shape components expect: { date, muscleGroup, sets }
  return data.map(r => ({ date: r.date, muscleGroup: r.muscle_group, sets: r.sets }))
}

export async function upsertWorkoutSession(userId, { muscleGroup, sets, date }) {
  const entryDate = (date || new Date().toISOString()).slice(0, 10)
  const { error } = await supabase
    .from('workout_history')
    .upsert(
      { user_id: userId, date: entryDate, muscle_group: muscleGroup, sets },
      { onConflict: 'user_id,date,muscle_group' }
    )
  if (error) console.error('upsertWorkoutSession', error)
}

// ── MUSCLE CALENDAR ───────────────────────────────────────────────────────────

export async function getMuscleCalendar(userId) {
  const { data, error } = await supabase
    .from('muscle_calendar')
    .select('date, data')
    .eq('user_id', userId)
  if (error) { console.error('getMuscleCalendar', error); return {} }
  // Convert rows → { "YYYY-MM-DD": { chest, shoulders, … } }
  return Object.fromEntries(data.map(r => [r.date, r.data]))
}

export async function saveMuscleDay(userId, date, muscleData) {
  const { error } = await supabase
    .from('muscle_calendar')
    .upsert(
      { user_id: userId, date, data: muscleData },
      { onConflict: 'user_id,date' }
    )
  if (error) console.error('saveMuscleDay', error)
}

// ── DAILY TRACKER ─────────────────────────────────────────────────────────────

export async function getDailyTrackerDate(userId, date) {
  const { data, error } = await supabase
    .from('daily_tracker')
    .select('data')
    .eq('user_id', userId)
    .eq('date', date)
    .single()
  if (error || !data) return {}
  return data.data
}

export async function saveDailyTrackerDate(userId, date, trackerData) {
  const { error } = await supabase
    .from('daily_tracker')
    .upsert(
      { user_id: userId, date, data: trackerData },
      { onConflict: 'user_id,date' }
    )
  if (error) console.error('saveDailyTrackerDate', error)
}

// ── WORKOUT PLANS ─────────────────────────────────────────────────────────────

export async function getWorkoutPlans(userId) {
  const { data, error } = await supabase
    .from('workout_plans')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
  if (error) { console.error('getWorkoutPlans', error); return [] }
  return data.map(r => ({
    id: r.id,
    name: r.name,
    type: r.type,
    duration: r.duration,
    daysPerWeek: r.days_per_week,
    color: r.color,
    description: r.description,
    schedule: r.schedule,
  }))
}

export async function createWorkoutPlan(userId, plan) {
  const { data, error } = await supabase
    .from('workout_plans')
    .insert({
      user_id: userId,
      name: plan.name,
      type: plan.type || 'Custom',
      duration: plan.duration || '4 weeks',
      days_per_week: plan.daysPerWeek || 3,
      color: plan.color,
      description: plan.description || '',
      schedule: plan.schedule || [],
    })
    .select()
    .single()
  if (error) { console.error('createWorkoutPlan', error); return null }
  return { ...plan, id: data.id }
}

export async function deleteWorkoutPlan(userId, planId) {
  const { error } = await supabase
    .from('workout_plans')
    .delete()
    .eq('user_id', userId)
    .eq('id', planId)
  if (error) console.error('deleteWorkoutPlan', error)
}

export async function getSelectedPlanId(userId) {
  // Simple preference — store in localStorage scoped by userId
  const val = localStorage.getItem(`selectedPlanId_${userId}`)
  return val ? JSON.parse(val) : null
}

export function saveSelectedPlanId(userId, planId) {
  localStorage.setItem(`selectedPlanId_${userId}`, JSON.stringify(planId))
}
