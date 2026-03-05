import styles from './StatsBar.module.css'

export function StatsBar({ muscleData }) {
  // Work out which muscle group has the highest / lowest score
  const groups = Object.entries(muscleData)
  const mostWorked = groups.find(([, v]) => v === 'high')?.[0] ?? '—'
  const needsWork  = groups.find(([, v]) => v === 'low')?.[0]  ?? '—'
  const sessions   = groups.filter(([, v]) => v !== 'rest').length

  return (
    <div className={styles.bar}>
      <div className={styles.card}>
        <div className={styles.label}>Most Worked</div>
        <div className={`${styles.value} ${styles.green}`}>{mostWorked.toUpperCase()}</div>
      </div>
      <div className={styles.card}>
        <div className={styles.label}>Needs Work</div>
        <div className={`${styles.value} ${styles.red}`}>{needsWork.toUpperCase()}</div>
      </div>
      <div className={styles.card}>
        <div className={styles.label}>Sessions</div>
        <div className={`${styles.value} ${styles.cyan}`}>{sessions}</div>
      </div>
    </div>
  )
}