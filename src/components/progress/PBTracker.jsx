import { useMemo } from 'react'
import { computePBRows } from '../../utils/progressUtils'
import styles from './PBTracker.module.css'

function formatDate(dateStr) {
  if (!dateStr) return '—'
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-GB')
}

export function PBTracker({ history }) {
  const rows = useMemo(() => computePBRows(history), [history])

  if (!rows.length) {
    return (
      <div className={styles.wrap}>
        <div className={styles.heading}>Personal Bests</div>
        <div className={styles.empty}>No data yet — log sets with weights to track your PBs.</div>
      </div>
    )
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.heading}>Personal Bests</div>
      <div className={styles.table}>
        <div className={styles.header}>
          <span>Exercise</span>
          <span>Best</span>
          <span>Date</span>
          <span>Progress</span>
        </div>
        {rows.map(row => (
          <div key={row.exercise} className={`${styles.row} ${row.recentPB ? styles.rowRecent : ''}`}>
            <span className={styles.exName}>
              {row.recentPB && <span className={styles.badge}>NEW</span>}
              {row.exercise}
            </span>
            <span className={styles.pbWeight}>{row.pbWeight}kg</span>
            <span className={styles.date}>{formatDate(row.pbDate)}</span>
            <span className={`${styles.improvement} ${row.improvement > 0 ? styles.up : row.improvement < 0 ? styles.down : styles.flat}`}>
              {row.improvement > 0 ? `▲ +${row.improvement}kg` : row.improvement < 0 ? `▼ ${row.improvement}kg` : '—'}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
