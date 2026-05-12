/**
 * progressUtils.js — Pure stat computation functions for the Progress dashboard.
 *
 * All functions take `history` shaped as:
 *   [{ date: "YYYY-MM-DD", muscleGroup: string, sets: [{ exercise, sets, reps, weight }] }]
 *
 * No side effects. No imports. Safe to call with empty arrays.
 */

export const MUSCLE_COLORS = {
  chest:     '#4f6cff',
  shoulders: '#00e5ff',
  back:      '#a56bff',
  arms:      '#f5a623',
  abs:       '#ff3d71',
  legs:      '#39ff14',
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function toNum(v) {
  const n = parseFloat(v)
  return isNaN(n) ? 0 : n
}

function toInt(v) {
  const n = parseInt(v, 10)
  return isNaN(n) ? 0 : n
}

function capitalize(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s
}

// ── Personal Bests ─────────────────────────────────────────────────────────────

/**
 * Compute the personal best (max weight) per exercise.
 * @param {Array} history
 * @returns {{ [exercise: string]: { weight: number, date: string } }}
 */
export function computePBs(history) {
  const pbs = {}
  for (const session of history) {
    for (const s of session.sets || []) {
      const w = toNum(s.weight)
      if (!s.exercise || w <= 0) continue
      if (!pbs[s.exercise] || w > pbs[s.exercise].weight) {
        pbs[s.exercise] = { weight: w, date: session.date }
      }
    }
  }
  return pbs
}

/**
 * Compute the first-ever logged weight per exercise (for improvement delta).
 * @param {Array} history
 * @returns {{ [exercise: string]: { weight: number, date: string } }}
 */
export function computeFirstLogs(history) {
  const first = {}
  const sorted = [...history].sort((a, b) => a.date.localeCompare(b.date))
  for (const session of sorted) {
    for (const s of session.sets || []) {
      const w = toNum(s.weight)
      if (!s.exercise || w <= 0) continue
      if (!first[s.exercise]) {
        first[s.exercise] = { weight: w, date: session.date }
      }
    }
  }
  return first
}

/**
 * Build sorted PB table rows for PBTracker.
 * @param {Array} history
 * @returns {Array<{ exercise, pbWeight, pbDate, firstWeight, improvement, recentPB }>}
 */
export function computePBRows(history) {
  const pbs   = computePBs(history)
  const first = computeFirstLogs(history)
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  const cutoff = sevenDaysAgo.toISOString().slice(0, 10)

  return Object.entries(pbs)
    .map(([exercise, { weight, date }]) => {
      const firstWeight = first[exercise]?.weight ?? weight
      const improvement = Math.round((weight - firstWeight) * 10) / 10
      return {
        exercise,
        pbWeight:    weight,
        pbDate:      date,
        firstWeight,
        improvement,
        recentPB:    date >= cutoff,
      }
    })
    .sort((a, b) => b.pbDate.localeCompare(a.pbDate))
}

// ── Body Part Volume ───────────────────────────────────────────────────────────

/**
 * Compute total sets per body part for the pie chart.
 * @param {Array} history
 * @returns {Array<{ name, key, sessions, totalSets, pct, color }>}
 */
export function computeBodyPartVolume(history) {
  const sessions  = {}
  const totalSets = {}

  for (const session of history) {
    const part = session.muscleGroup
    if (!part) continue
    sessions[part] = (sessions[part] || 0) + 1
    const sets = (session.sets || []).reduce((acc, s) => acc + toInt(s.sets), 0)
    totalSets[part] = (totalSets[part] || 0) + sets
  }

  const total = Object.values(totalSets).reduce((a, b) => a + b, 0)

  return Object.entries(totalSets)
    .map(([key, sets]) => ({
      name:      capitalize(key),
      key,
      sessions:  sessions[key] || 0,
      totalSets: sets,
      pct:       total > 0 ? Math.round((sets / total) * 100) : 0,
      color:     MUSCLE_COLORS[key] || '#888888',
    }))
    .sort((a, b) => b.totalSets - a.totalSets)
}

// ── Streak ─────────────────────────────────────────────────────────────────────

/**
 * Compute the current workout streak in consecutive days (up to today).
 * @param {Array} history
 * @returns {number}
 */
export function computeStreak(history) {
  if (!history.length) return 0
  const dates = new Set(history.map(s => s.date))
  let streak = 0
  const today = new Date()
  for (let i = 0; i < 365; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const key = d.toISOString().slice(0, 10)
    if (dates.has(key)) {
      streak++
    } else if (i > 0) {
      break
    }
  }
  return streak
}

// ── Weekly Volume ──────────────────────────────────────────────────────────────

/**
 * Compute total sets per ISO week, broken down by body part.
 * @param {Array} history
 * @returns {Array<{ week, label, total, chest?, back?, ... }>}
 */
export function computeWeeklyVolume(history) {
  const weeks = {}

  for (const session of history) {
    const date = new Date(session.date + 'T00:00:00')
    const dow  = date.getDay() || 7                    // 1=Mon … 7=Sun
    const mon  = new Date(date)
    mon.setDate(date.getDate() - dow + 1)
    const weekKey = mon.toISOString().slice(0, 10)

    if (!weeks[weekKey]) weeks[weekKey] = { week: weekKey, total: 0 }

    const sets = (session.sets || []).reduce((acc, s) => acc + toInt(s.sets), 0)
    weeks[weekKey].total += sets

    const part = session.muscleGroup || 'other'
    weeks[weekKey][part] = (weeks[weekKey][part] || 0) + sets
  }

  return Object.values(weeks)
    .sort((a, b) => a.week.localeCompare(b.week))
    .map(w => {
      const d = new Date(w.week + 'T00:00:00')
      return {
        ...w,
        label: d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
      }
    })
}

// ── Exercise Progress ──────────────────────────────────────────────────────────

/**
 * Build per-exercise weight-over-time series for line charts.
 * @param {Array} history
 * @returns {{ [exercise: string]: Array<{ date, weight }> }}
 */
export function computeExerciseProgress(history) {
  const map = {}
  for (const session of history) {
    for (const s of session.sets || []) {
      const w = toNum(s.weight)
      if (!s.exercise || w <= 0) continue
      if (!map[s.exercise]) map[s.exercise] = {}
      map[s.exercise][session.date] = Math.max(map[s.exercise][session.date] || 0, w)
    }
  }
  const result = {}
  for (const [name, byDate] of Object.entries(map)) {
    result[name] = Object.entries(byDate)
      .map(([date, weight]) => ({ date, weight }))
      .sort((a, b) => a.date.localeCompare(b.date))
  }
  return result
}

// ── Summary Stats ──────────────────────────────────────────────────────────────

/**
 * Compute the five KPI stats for the summary strip.
 * @param {Array} history
 * @returns {{ totalWorkouts, streak, totalPBs, avgSessionsPerWeek, mostTrainedPart }}
 */
export function computeSummaryStats(history) {
  if (!history.length) {
    return { totalWorkouts: 0, streak: 0, totalPBs: 0, avgSessionsPerWeek: 0, mostTrainedPart: '—' }
  }

  // Unique workout sessions — use sessionId when available (new data), fall back to date_muscleGroup
  const totalWorkouts = new Set(history.map(s => s.sessionId || `${s.date}_${s.muscleGroup}`)).size

  const streak    = computeStreak(history)
  const totalPBs  = Object.keys(computePBs(history)).length

  // Avg sessions per week over last 4 weeks
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - 28)
  const cutoffStr = cutoff.toISOString().slice(0, 10)
  const recentDays = new Set(
    history.filter(s => s.date >= cutoffStr).map(s => s.date)
  )
  const avgSessionsPerWeek = Math.round((recentDays.size / 4) * 10) / 10

  // Most trained body part
  const partCounts = {}
  for (const s of history) {
    if (s.muscleGroup) partCounts[s.muscleGroup] = (partCounts[s.muscleGroup] || 0) + 1
  }
  const mostTrainedPart = Object.entries(partCounts)
    .sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—'

  return { totalWorkouts, streak, totalPBs, avgSessionsPerWeek, mostTrainedPart }
}
