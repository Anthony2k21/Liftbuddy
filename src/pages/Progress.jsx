import { useState, useEffect, useCallback } from 'react'
import { getWorkoutHistory, saveSessionRating } from '../lib/db'
import { calculateSessionRating } from '../utils/calculateSessionRating'
import { StatsSummaryStrip }  from '../components/progress/StatsSummaryStrip'
import { BodyPartPieChart }   from '../components/progress/BodyPartPieChart'
import { PBTracker }          from '../components/progress/PBTracker'
import { VolumeBarChart }       from '../components/progress/VolumeBarChart'
import { SessionRatingChart }   from '../components/progress/SessionRatingChart'
import { WeightProgressChart }  from '../components/WeightProgressChart'
import styles from './Progress.module.css'

// Backfill ratings for any session that doesn't have one yet.
// Processes dates in order so each session is rated against only prior history.
async function backfillRatings(userId, history) {
  // Group all sessions by date
  const byDate = {}
  for (const s of history) {
    if (!byDate[s.date]) byDate[s.date] = []
    byDate[s.date].push(s)
  }

  const dates = Object.keys(byDate).sort()
  let changed = false

  for (let i = 0; i < dates.length; i++) {
    const date     = dates[i]
    const sessions = byDate[date]

    // Skip if every session for this date already has a rating
    if (sessions.every(s => s.rating != null)) continue

    // Build sessionData shape: { muscleGroup: [sets] }
    const sessionData = {}
    for (const s of sessions) {
      sessionData[s.muscleGroup] = s.sets || []
    }

    // History up to (not including) this date
    const priorHistory = history.filter(s => s.date < date)

    const { score } = calculateSessionRating(sessionData, priorHistory)

    await Promise.all(
      sessions.map(s => saveSessionRating(userId, date, s.muscleGroup, score))
    )

    // Update in-place so the chart renders immediately
    sessions.forEach(s => { s.rating = score })
    changed = true
  }

  return changed
}

export function Progress({ userId }) {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    try {
      const data = await getWorkoutHistory(userId)
      // Backfill any missing ratings silently, then update state once
      await backfillRatings(userId, data)
      setHistory([...data])
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    window.addEventListener('workoutHistoryUpdated', load)
    return () => window.removeEventListener('workoutHistoryUpdated', load)
  }, [load])

  return (
    <div className={styles.page}>
      <div className={styles.topbar}>
        <span className={styles.title}>Progress</span>
        {loading && <span className={styles.loadingDot} />}
      </div>

      {loading ? (
        <div className={styles.skeleton}>
          <div className={styles.skeletonStrip} />
          <div className={styles.skeletonCard} />
          <div className={styles.skeletonCard} />
          <div className={styles.skeletonCardTall} />
        </div>
      ) : (
        <div className={styles.content}>
          <StatsSummaryStrip history={history} />

          <div className={styles.section}>
            <SessionRatingChart history={history} />
          </div>

          <div className={styles.section}>
            <WeightProgressChart userId={userId} />
          </div>

          <div className={styles.row}>
            <div className={styles.col}>
              <BodyPartPieChart history={history} />
            </div>
            <div className={styles.col}>
              <VolumeBarChart history={history} />
            </div>
          </div>

          <div className={styles.section}>
            <PBTracker history={history} />
          </div>

          <div className={styles.bottomPad} />
        </div>
      )}
    </div>
  )
}
