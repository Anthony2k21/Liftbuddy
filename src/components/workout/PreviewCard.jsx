import { getMuscles } from '../../lib/muscles'
import styles from './PreviewCard.module.css'

export function PreviewCard({ exercise, index, loggedSets, isDone, onClick }) {
  const sets = loggedSets || []
  const doneSets = sets.filter(s => s.done)
  const topWeight = doneSets.length
    ? Math.max(...doneSets.map(s => parseFloat(s.weight) || 0))
    : null
  const topReps = doneSets.length
    ? Math.max(...doneSets.map(s => parseInt(s.reps) || 0))
    : null

  const setsLabel = isDone && doneSets.length
    ? `${doneSets.length} × ${topReps} · ${topWeight ? `${topWeight}kg` : 'BW'}`
    : `${exercise.sets} × ${exercise.reps}`

  const muscles = getMuscles(exercise.exercise)

  return (
    <button className={`${styles.card} ${isDone ? styles.done : ''}`} onClick={onClick}>
      <div className={styles.left}>
        <span className={styles.num}>{String(index + 1).padStart(2, '0')}</span>
        <div className={styles.info}>
          <div className={styles.name}>{exercise.exercise}</div>
          <div className={styles.meta}>{setsLabel}</div>
          {muscles.length > 0 && (
            <div className={styles.muscleLine}>
              {muscles.join(' · ')}
            </div>
          )}
        </div>
      </div>
      <div className={`${styles.status} ${isDone ? styles.statusDone : ''}`}>
        {isDone ? '✓ DONE' : 'PENDING'}
      </div>
    </button>
  )
}
