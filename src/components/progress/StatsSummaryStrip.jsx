import { useMemo } from 'react'
import { computeSummaryStats } from '../../utils/progressUtils'
import styles from './StatsSummaryStrip.module.css'

const CARDS = [
  { key: 'totalWorkouts',      icon: '🔥', label: 'Total Workouts',      format: v => v },
  { key: 'streak',             icon: '📅', label: 'Current Streak',      format: v => `${v}d` },
  { key: 'totalPBs',           icon: '🏆', label: 'Exercises Tracked',   format: v => v },
  { key: 'avgSessionsPerWeek', icon: '⏱',  label: 'Avg / Week',          format: v => `${v}x` },
  { key: 'mostTrainedPart',    icon: '💪', label: 'Most Trained',        format: v => v.toUpperCase() },
]

export function StatsSummaryStrip({ history }) {
  const stats = useMemo(() => computeSummaryStats(history), [history])

  return (
    <div className={styles.strip}>
      {CARDS.map(({ key, icon, label, format }) => (
        <div key={key} className={styles.card}>
          <span className={styles.icon}>{icon}</span>
          <span className={styles.value}>{format(stats[key])}</span>
          <span className={styles.label}>{label}</span>
        </div>
      ))}
    </div>
  )
}
