/**
 * calculateSessionRating.js
 *
 * Pure, deterministic session rating function. No API calls.
 *
 * @param {Object} sessionData  — { [muscleGroup]: [{exercise, sets, reps, weight}] }
 * @param {Array}  history      — [{ date, muscleGroup, sets: [{exercise, sets, reps, weight}] }]
 * @returns {{ score, label, summary, highlights, lowlights, pr_count }}
 */

function toNum(v) {
  const n = parseFloat(v)
  return isNaN(n) ? 0 : n
}

function parseReps(v) {
  // Handles "8", "8-10", "8–10", 8
  const s = String(v).split(/[-–]/)[0]
  const n = parseInt(s, 10)
  return isNaN(n) ? 1 : n
}

function getLabel(score) {
  if (score >= 10.0) return 'Perfect'
  if (score >= 9.5)  return 'Legendary'
  if (score >= 8.5)  return 'Excellent'
  if (score >= 7.5)  return 'Good'
  if (score >= 6.5)  return 'Decent'
  if (score >= 5.5)  return 'Average'
  if (score >= 4.0)  return 'Poor'
  return 'Disaster'
}

export function calculateSessionRating(sessionData, history) {
  // Flatten sessionData into a single array of exercise entries
  const todayExercises = Object.values(sessionData || {}).flat()

  if (todayExercises.length === 0) {
    return {
      score:      1.0,
      label:      'Disaster',
      summary:    'No exercises logged.',
      highlights: [],
      lowlights:  ['Empty session — nothing was recorded.'],
      pr_count:   0,
    }
  }

  // Build historical lookup from all past sessions (excluding today)
  const today = new Date().toISOString().slice(0, 10)
  const past  = (history || []).filter(h => h.date !== today)

  // bestWeights[exercise] = highest weight ever (before today)
  const bestWeights = {}
  // avgVolumes[exercise] = average session volume historically
  const volumeHistory = {}

  for (const session of past) {
    for (const ex of (session.sets || [])) {
      const w   = toNum(ex.weight)
      const s   = toNum(ex.sets) || 1
      const r   = parseReps(ex.reps)
      const vol = w * s * r

      if (!bestWeights[ex.exercise] || w > bestWeights[ex.exercise]) {
        bestWeights[ex.exercise] = w
      }
      if (!volumeHistory[ex.exercise]) volumeHistory[ex.exercise] = []
      volumeHistory[ex.exercise].push(vol)
    }
  }

  // ── 1. WEIGHT PROGRESSION (40%) ──────────────────────────────────────────
  let weightScore = 7.0
  let exercisesWithHistory = 0
  let exercisesImproved    = 0
  let totalImprovementPct  = 0
  const improvedNames = []
  const regressedNames = []

  for (const ex of todayExercises) {
    const w        = toNum(ex.weight)
    const prevBest = bestWeights[ex.exercise]
    if (!prevBest || prevBest <= 0 || w <= 0) continue

    exercisesWithHistory++
    const delta = w - prevBest
    const pct   = (delta / prevBest) * 100

    if (delta > 0) {
      exercisesImproved++
      totalImprovementPct += pct
      improvedNames.push(ex.exercise)
    } else if (w < prevBest * 0.85) {
      totalImprovementPct -= 10
      regressedNames.push(ex.exercise)
    }
  }

  if (exercisesWithHistory > 0) {
    const rate    = exercisesImproved / exercisesWithHistory
    const avgPct  = totalImprovementPct / exercisesWithHistory
    weightScore   = 5.0 + (rate * 3.5) + Math.min(Math.max(avgPct * 0.12, -1.5), 1.5)
    weightScore   = Math.max(2.0, Math.min(10.0, weightScore))
  }

  // ── 2. VOLUME PROGRESSION (30%) ──────────────────────────────────────────
  let volumeScore   = 7.0
  let todayVolume   = 0
  let prevAvgVolume = 0
  let volComparisons = 0

  for (const ex of todayExercises) {
    const w   = toNum(ex.weight)
    const s   = toNum(ex.sets) || 1
    const r   = parseReps(ex.reps)
    todayVolume += w * s * r

    const hist = volumeHistory[ex.exercise]
    if (hist && hist.length > 0) {
      prevAvgVolume += hist.reduce((a, b) => a + b, 0) / hist.length
      volComparisons++
    }
  }

  if (volComparisons > 0 && prevAvgVolume > 0) {
    const ratio = todayVolume / prevAvgVolume
    if      (ratio >= 1.15) volumeScore = 9.5
    else if (ratio >= 1.05) volumeScore = 8.5
    else if (ratio >= 0.95) volumeScore = 7.5
    else if (ratio >= 0.85) volumeScore = 6.0
    else                    volumeScore = 4.5
  }

  // ── 3. PR COUNT (20%) ────────────────────────────────────────────────────
  let prCount   = 0
  const prNames = []

  for (const ex of todayExercises) {
    const w        = toNum(ex.weight)
    const prevBest = bestWeights[ex.exercise]
    if (w > 0 && (!prevBest || w > prevBest)) {
      prCount++
      prNames.push(ex.exercise)
    }
  }

  const prScore = Math.min(10.0, 5.5 + prCount * 1.5)

  // ── 4. COMPLETION (10%) ──────────────────────────────────────────────────
  const withWeight    = todayExercises.filter(ex => toNum(ex.weight) > 0).length
  const completionPct = withWeight / todayExercises.length
  const completionScore = 5.0 + completionPct * 5.0

  // ── FINAL SCORE ──────────────────────────────────────────────────────────
  const raw   = weightScore * 0.4 + volumeScore * 0.3 + prScore * 0.2 + completionScore * 0.1
  const score = Math.max(1.0, Math.min(10.0, Math.round(raw * 10) / 10))
  const label = getLabel(score)

  // ── HIGHLIGHTS & LOWLIGHTS ───────────────────────────────────────────────
  const highlights = []
  const lowlights  = []

  if (prCount > 0) {
    highlights.push(`${prCount} personal record${prCount > 1 ? 's' : ''} broken — ${prNames.join(', ')}`)
  }
  if (improvedNames.length > 0) {
    highlights.push(`Weight increased on ${improvedNames.length} exercise${improvedNames.length > 1 ? 's' : ''}: ${improvedNames.join(', ')}`)
  }
  if (volComparisons > 0 && todayVolume > prevAvgVolume * 1.05) {
    const pct = Math.round(((todayVolume / prevAvgVolume) - 1) * 100)
    highlights.push(`Total volume up ${pct}% vs. your average`)
  }
  if (exercisesWithHistory === 0 && todayExercises.length > 0) {
    highlights.push(`First time logging these exercises — baseline set`)
  }

  if (regressedNames.length > 0) {
    lowlights.push(`Significant weight drop on: ${regressedNames.join(', ')}`)
  }
  if (withWeight < todayExercises.length) {
    const missing = todayExercises.length - withWeight
    lowlights.push(`${missing} exercise${missing > 1 ? 's' : ''} logged without weight`)
  }
  if (volComparisons > 0 && todayVolume < prevAvgVolume * 0.9) {
    lowlights.push(`Volume down vs. your average — short session?`)
  }
  if (exercisesWithHistory > 1 && exercisesImproved === 0 && regressedNames.length === 0) {
    lowlights.push(`No weight progression — consider adding load next time`)
  }

  // ── SUMMARY ──────────────────────────────────────────────────────────────
  let summary
  if      (score >= 9.5) summary = `Legendary session${prCount > 0 ? ` — ${prCount} PR${prCount > 1 ? 's' : ''} set` : ''}. One of your best ever.`
  else if (score >= 8.5) summary = `Excellent work. ${exercisesImproved > 0 ? `Progressed on ${exercisesImproved} exercise${exercisesImproved > 1 ? 's' : ''}.` : 'Strong consistent effort.'}`
  else if (score >= 7.5) summary = `Good session. ${prCount > 0 ? `${prCount} PR${prCount > 1 ? 's' : ''} in the bag.` : 'Steady progress.'}`
  else if (score >= 6.5) summary = `Decent effort. Keep showing up and the gains follow.`
  else if (score >= 5.5) summary = `Average session. Push a little harder next time.`
  else if (score >= 4.0) summary = `Below your usual standard. Identify what held you back.`
  else                   summary = `Tough day. Rest up, eat well, and come back stronger.`

  return { score, label, summary, highlights, lowlights, pr_count: prCount }
}
