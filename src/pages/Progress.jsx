import { useState, useEffect, useCallback } from 'react'
import { fetchProgressHistory, saveProgressRating } from '../lib/supabase/progress'
import { calculateSessionRating } from '../utils/calculateSessionRating'
import { StatsSummaryStrip }  from '../components/progress/StatsSummaryStrip'
import { BodyPartPieChart }   from '../components/progress/BodyPartPieChart'
import { PBTracker }          from '../components/progress/PBTracker'
import { VolumeBarChart }       from '../components/progress/VolumeBarChart'
import { SessionRatingChart }   from '../components/progress/SessionRatingChart'
import { WeightProgressChart }  from '../components/WeightProgressChart'
import styles from './Progress.module.css'

// Compute auto-ratings in memory for sessions that don't have one yet.
// Mutates history entries in place — no DB writes.
function applyAutoRatings(history) {
  const byDate = {}
  for (const s of history) {
    if (!byDate[s.date]) byDate[s.date] = []
    byDate[s.date].push(s)
  }

  const dates = Object.keys(byDate).sort()

  for (let i = 0; i < dates.length; i++) {
    const date     = dates[i]
    const sessions = byDate[date]
    if (sessions.every(s => s.rating != null)) continue

    const sessionData = {}
    for (const s of sessions) {
      sessionData[s.muscleGroup] = s.sets || []
    }

    const priorHistory = history.filter(s => s.date < date)
    const { score } = calculateSessionRating(sessionData, priorHistory)
    sessions.forEach(s => { if (s.rating == null) s.rating = score })
  }
}

export function Progress({ userId }) {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    try {
      const data = await fetchProgressHistory(userId)
      applyAutoRatings(data)
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
