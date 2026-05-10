export function epley1RM(weight, reps) {
  if (!weight || !reps) return 0
  if (reps === 1) return weight
  return Math.round(weight * (1 + reps / 30))
}

export function bestSet1RM(sets) {
  if (!sets.length) return 0
  return Math.max(...sets.map(s => epley1RM(s.weight ?? 0, s.reps ?? 0)))
}

export function sessionVolume(sets) {
  return sets.reduce((sum, s) => sum + (s.weight ?? 0) * (s.reps ?? 0), 0)
}

export function percentChange(vals) {
  if (vals.length < 2) return 0
  const first = vals[0]
  const last = vals[vals.length - 1]
  if (first === 0) return 0
  return Math.round(((last - first) / first) * 100)
}

export function trendSlope(vals) {
  const n = vals.length
  if (n < 2) return 0
  const xMean = (n - 1) / 2
  const yMean = vals.reduce((a, b) => a + b, 0) / n
  const num = vals.reduce((sum, y, x) => sum + (x - xMean) * (y - yMean), 0)
  const den = vals.reduce((sum, _, x) => sum + (x - xMean) ** 2, 0)
  return den === 0 ? 0 : num / den
}

export function nextWeight(weight, isCompound = false) {
  const inc = isCompound ? 5 : 2.5
  return ((parseFloat(weight) || 0) + inc).toFixed(1).replace(/\.0$/, '')
}

export function detectPB(currentSets, historySessions) {
  if (!historySessions.length || !currentSets.length) return false
  const currentBest = Math.max(...currentSets.map(s => epley1RM(s.weight ?? 0, s.reps ?? 0)))
  const historyBest = Math.max(...historySessions.flatMap(s => s.sets).map(s => epley1RM(s.weight ?? 0, s.reps ?? 0)))
  return currentBest > historyBest
}

function lastNHitTarget(history, n, targetReps) {
  const recent = history.slice(-n)
  if (recent.length < n) return false
  return recent.every(session => session.sets.some(s => (s.reps ?? 0) >= targetReps))
}

function stuckForNSessions(history, n) {
  const recent = history.slice(-n)
  if (recent.length < n) return false
  const weights = recent.map(s => Math.max(...s.sets.map(set => set.weight ?? 0)))
  return weights.every(w => w === weights[0])
}

export function generateInsights(exerciseName, currentSets, history) {
  const insights = []
  if (!history.length) return insights

  const volumes = history.map(s => sessionVolume(s.sets))
  const topWeights = history.map(s => Math.max(...s.sets.map(set => set.weight ?? 0)))
  const currentTopWeight = currentSets.length ? Math.max(...currentSets.map(s => s.weight ?? 0)) : 0
  const currentTopReps = currentSets.length ? Math.max(...currentSets.map(s => s.reps ?? 0)) : 0

  if (stuckForNSessions(history, 4)) {
    insights.push({
      icon: '⚠',
      title: 'Plateau detected',
      sub: `4 SESSIONS AT ${topWeights[topWeights.length - 1]}KG · TRY DELOAD OR INCREASE`,
      priority: 0,
    })
  }

  if (insights.length < 3 && lastNHitTarget(history, 3, currentTopReps)) {
    const isCompound = /squat|deadlift|bench|press|row|pull.?up/i.test(exerciseName)
    const bump = nextWeight(currentTopWeight, isCompound)
    insights.push({
      icon: '↑',
      title: 'Time to add weight',
      sub: `3 SESSIONS HITTING TARGET REPS · BUMP TO ${bump}KG`,
      priority: 1,
    })
  }

  if (insights.length < 3 && volumes.length >= 3) {
    const volChange = percentChange(volumes)
    if (Math.abs(volChange) >= 10) {
      const oldVol = Math.round(volumes[0])
      const newVol = Math.round(volumes[volumes.length - 1])
      insights.push({
        icon: volChange > 0 ? '📈' : '📉',
        title: `${volChange > 0 ? '+' : ''}${volChange}% volume in ${volumes.length} sessions`,
        sub: `${oldVol}KG → ${newVol}KG TOTAL VOLUME PER SESSION`,
        priority: 2,
      })
    }
  }

  if (insights.length < 3 && topWeights.length >= 2) {
    const prevBest = topWeights[topWeights.length - 1]
    if (currentTopWeight > prevBest) {
      insights.push({
        icon: '💪',
        title: 'New top set',
        sub: `BEAT PREVIOUS BEST BY ${(currentTopWeight - prevBest).toFixed(1)}KG`,
        priority: 3,
      })
    }
  }

  if (insights.length < 3 && trendSlope(volumes) > 0 && volumes.length >= 3) {
    insights.push({
      icon: '📊',
      title: 'Volume trending up',
      sub: `CONSISTENT PROGRESS OVER LAST ${volumes.length} SESSIONS`,
      priority: 4,
    })
  }

  return insights.sort((a, b) => a.priority - b.priority).slice(0, 3)
}
