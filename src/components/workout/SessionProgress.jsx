import styles from './SessionProgress.module.css'

export function SessionProgress({ currentIndex, totalExercises, completedSets, totalSets }) {
  const progress = totalSets > 0 ? completedSets / totalSets : 0

  return (
    <div className={styles.strip}>
      <div className={styles.labels}>
        <span className={styles.dim}>EXERCISE {currentIndex + 1} OF {totalExercises}</span>
        <span className={styles.accent}>{completedSets} / {totalSets} SETS</span>
      </div>
      <div className={styles.track}>
        <div className={styles.fill} style={{ width: `${progress * 100}%` }} />
      </div>
    </div>
  )
}
