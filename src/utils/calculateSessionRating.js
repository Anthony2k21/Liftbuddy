/**
 * calculateSessionRating.js
 *
 * Score = 50% user star rating (if given) + 50% weight performance
 * If no star rating: score = 100% weight performance
 *
 * @param {Object} sessionData  — { [muscleGroup]: [{exercise, sets, reps, weight}] }
 * @param {Array}  history      — [{ date, muscleGroup, sets: [{exercise, sets, reps, weight}] }]
 * @param {number|null} starRating — user's 1-5 star rating from end-session modal, or null
 */

function toNum(v) {
  const n = parseFloat(v)
  return isNaN(n) ? 0 : n
}

function parseReps(v) {
  const s = String(v).split(/[-–]/)[0]
  const n = parseInt(s, 10)
  return isNaN(n) ? 1 : n
}

function getWeekKey(dateStr) {
  const d   = new Date(dateStr + 'T00:00:00')
  const dow = d.getDay()
  const mon = new Date(d)
  mon.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1))
  return mon.toISOString().slice(0, 10)
}

function calcStreak(history, today) {
  const dates = new Set(history.map(s => s.date))
  dates.add(today)
  let streak = 0
  const d = new Date(today + 'T00:00:00')
  while (dates.has(d.toISOString().slice(0, 10))) {
    streak++
    d.setDate(d.getDate() - 1)
  }
  return streak
}

function streakBonus(streak) {
  if (streak >= 30) return 1.0
  if (streak >= 14) return 0.7
  if (streak >= 7)  return 0.5
  if (streak >= 4)  return 0.3
  if (streak >= 2)  return 0.15
  return 0
}

function getLabel(score) {
  if (score >= 10.0) return 'Perfect'
  if (score >= 9.5)  return 'Legendary'
  if (score >= 8.5)  return 'Excellent'
  if (score >= 7.5)  return 'Good'
  if (score >= 6.5)  return 'Decent'
  if (score >= 5.5)  return 'Poor'
  if (score >= 4.0)  return 'Disaster'
  return 'Abysmal'
}

export function calculateSessionRating(sessionData, history, starRating = null) {
  const todayExercises = Object.values(sessionData || {}).flat()

  if (todayExercises.length === 0) {
    return {
      score: 1.0, label: 'Abysmal',
      summary: 'No exercises logged.',
      highlights: [], lowlights: ['Empty session — nothing was recorded.'], pr_count: 0,
    }
  }

  const today = new Date().toISOString().slice(0, 10)
  const past  = (history || []).filter(h => h.date !== today)

  const weeksOfHistory = new Set(past.map(s => getWeekKey(s.date))).size
  const isGracePeriod  = weeksOfHistory < 3

  // Build historical best weights and per-exercise volume history
  const bestWeights   = {}
  const volumeHistory = {}

  for (const session of past) {
    for (const ex of (session.sets || [])) {
      const w   = toNum(ex.weight)
      const vol = w * (toNum(ex.sets) || 1) * parseReps(ex.reps)
      if (!bestWeights[ex.exercise] || w > bestWeights[ex.exercise]) bestWeights[ex.exercise] = w
      if (!volumeHistory[ex.exercise]) volumeHistory[ex.exercise] = []
      volumeHistory[ex.exercise].push(vol)
    }
  }

  // ── WEIGHT PERFORMANCE SCORE ──────────────────────────────────────────────
  // Based on session volume vs personal average, plus PR bonus
  let todayVolume   = 0
  let prevAvgVolume = 0
  let volComparisons = 0
  let prCount = 0
  const prNames = []
  const improvedNames = []

  for (const ex of todayExercises) {
    const w   = toNum(ex.weight)
    const s   = toNum(ex.sets) || 1
    const r   = parseReps(ex.reps)
    todayVolume += w * s * r

    const prevBest = bestWeights[ex.exercise]

    // PR detection
    if (w > 0 && (!prevBest || w > prevBest)) {
      prCount++
      prNames.push(ex.exercise)
    } else if (prevBest && w > prevBest * 0.95) {
      improvedNames.push(ex.exercise)
    }

    const hist = volumeHistory[ex.exercise]
    if (hist?.length > 0) {
      prevAvgVolume += hist.reduce((a, b) => a + b, 0) / hist.length
      volComparisons++
    }
  }

  let weightScore = 7.0

  if (volComparisons > 0 && prevAvgVolume > 0) {
    const ratio = todayVolume / prevAvgVolume
    if      (ratio >= 1.20) weightScore = 9.5
    else if (ratio >= 1.10) weightScore = 8.5
    else if (ratio >= 1.00) weightScore = 7.5
    else if (ratio >= 0.90) weightScore = 6.5
    else if (ratio >= 0.80) weightScore = 5.5
    else                    weightScore = isGracePeriod ? 5.5 : 4.0
  }

  // PR bonus — each PR adds 0.5, capped at +2.0
  weightScore = Math.min(10.0, weightScore + Math.min(prCount * 0.5, 2.0))

  // ── BLEND WITH STAR RATING ────────────────────────────────────────────────
  // Stars (1-5) → 2-10 scale; blended 50/50 with weight performance
  let blendedScore
  if (starRating != null) {
    const starScore = starRating * 2   // 1→2, 2→4, 3→6, 4→8, 5→10
    blendedScore = starScore * 0.5 + weightScore * 0.5
  } else {
    blendedScore = weightScore
  }

  // Streak bonus (small top-up regardless of blend)
  const streak = calcStreak(history || [], today)
  const bonus  = streakBonus(streak)

  const score = Math.max(1.0, Math.min(10.0, Math.round((blendedScore + bonus) * 10) / 10))
  const label = getLabel(score)

  // ── HIGHLIGHTS & LOWLIGHTS ───────────────────────────────────────────────
  const highlights = []
  const lowlights  = []

  if (starRating != null) {
    const starLabel = ['', '★', '★★', '★★★', '★★★★', '★★★★★'][starRating] || ''
    highlights.push(`You rated this session ${starLabel}`)
  }
  if (prCount > 0) {
    highlights.push(`${prCount} personal record${prCount > 1 ? 's' : ''} broken — ${prNames.join(', ')}`)
  }
  if (streak >= 2) {
    highlights.push(`${streak}-day streak — keep it up`)
  }
  if (volComparisons > 0 && todayVolume > prevAvgVolume * 1.05) {
    const pct = Math.round(((todayVolume / prevAvgVolume) - 1) * 100)
    highlights.push(`Total volume up ${pct}% vs. your average`)
  }
  if (volComparisons === 0 && todayExercises.length > 0) {
    highlights.push('First time logging these exercises — baseline set')
  }

  if (volComparisons > 0 && todayVolume < prevAvgVolume * 0.9) {
    lowlights.push('Volume below your average — short session?')
  }

  let summary
  if      (score >= 9.5) summary = `Legendary session${prCount > 0 ? ` — ${prCount} PR${prCount > 1 ? 's' : ''} set` : ''}. One of your best.`
  else if (score >= 8.5) summary = `Excellent work. Strong performance and solid weight.`
  else if (score >= 7.5) summary = `Good session. ${prCount > 0 ? `${prCount} PR${prCount > 1 ? 's' : ''} in the bag.` : 'Steady progress.'}`
  else if (score >= 6.5) summary = `Decent effort. Keep showing up and the gains follow.`
  else if (score >= 5.5) summary = `Below your best. Push harder next time.`
  else if (score >= 4.0) summary = `Tough session. Identify what held you back.`
  else                   summary = `Rest up, eat well, and come back stronger.`

  return { score, label, summary, highlights, lowlights, pr_count: prCount }
}
