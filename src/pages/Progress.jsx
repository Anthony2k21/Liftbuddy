import { useState, useEffect, useCallback } from 'react'
import { getWorkoutHistory } from '../lib/db'
import { StatsSummaryStrip }  from '../components/progress/StatsSummaryStrip'
import { BodyPartPieChart }   from '../components/progress/BodyPartPieChart'
import { PBTracker }          from '../components/progress/PBTracker'
import { VolumeBarChart }     from '../components/progress/VolumeBarChart'
import { WeightProgressChart } from '../components/WeightProgressChart'
import styles from './Progress.module.css'

export function Progress({ userId }) {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(() => {
    if (!userId) return
    setLoading(true)
    getWorkoutHistory(userId)
      .then(data => { setHistory(data); setLoading(false) })
      .catch(() => setLoading(false))
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
