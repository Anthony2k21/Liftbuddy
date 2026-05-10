import { useRef, useState } from 'react'
import { SetRow } from './SetRow'
import { InsightsSheet } from './InsightsSheet'
import { getMuscles } from '../../lib/muscles'
import styles from './ExerciseCard.module.css'

function formatLastSession(sessionSets) {
  if (!sessionSets?.length) return null
  const sorted = [...sessionSets].sort((a, b) => a.setNumber - b.setNumber)
  const topWeight = Math.max(...sorted.map(s => parseFloat(s.weight) || 0))
  const repsStr = sorted.map(s => s.reps).join(', ')
  return topWeight > 0 ? `${topWeight}kg × ${repsStr}` : `BW × ${repsStr}`
}

export function ExerciseCard({
  exercise,
  index,
  isActive,
  sets,
  userId,
  lastSession,
  onSetDone,
  onSetUndo,
  onFieldChange,
  onRemoveSet,
  onAddSet,
  onNext,
  isLast,
}) {
  const [showInsights, setShowInsights] = useState(false)
  const weightRefs = useRef({})
  const repsRefs = useRef({})

  const hasLoggedSet = sets.some(s => s.done)
  const muscles = getMuscles(exercise.exercise)
  const lastSessionLabel = formatLastSession(lastSession)

  function getWeightRef(localId) {
    if (!weightRefs.current[localId]) weightRefs.current[localId] = { current: null }
    return weightRefs.current[localId]
  }

  function getRepsRef(localId) {
    if (!repsRefs.current[localId]) repsRefs.current[localId] = { current: null }
    return repsRefs.current[localId]
  }

  async function handleSetDone(localId, weight, reps) {
    await onSetDone(exercise.exercise, localId, weight, reps)
    const nextPending = sets.find(s => !s.done && s.localId !== localId)
    if (nextPending) {
      setTimeout(() => {
        weightRefs.current[nextPending.localId]?.current?.focus()
      }, 80)
    }
  }

  if (!isActive) return null

  return (
    <>
      <div className={styles.card}>
        <div className={styles.nowPill}>NOW</div>

        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <h3 className={styles.name}>{exercise.exercise}</h3>
            {muscles.length > 0 && (
              <div className={styles.muscleTags}>
                {muscles.map(m => (
                  <span key={m} className={styles.muscleTag}>{m}</span>
                ))}
              </div>
            )}
            <div className={styles.meta}>
              <strong>{exercise.sets}</strong> SETS · {exercise.reps} REPS
              {exercise.weight ? ` · ${exercise.weight}kg` : ''}
            </div>
          </div>
          <button className={styles.insightsBtn} onClick={() => setShowInsights(true)}>
            📊 INSIGHTS
          </button>
        </div>

        <div className={styles.lastSession}>
          {lastSession === null ? (
            <span className={styles.baselineLoading}>—</span>
          ) : lastSessionLabel ? (
            <>LAST SESSION: <strong>{lastSessionLabel}</strong></>
          ) : (
            <span className={styles.baseline}>FIRST TIME · BUILD A BASELINE</span>
          )}
        </div>

        <div className={styles.setsTable}>
          <div className={styles.setsHeader}>
            <span>SET</span>
            <span>WEIGHT</span>
            <span>REPS</span>
            <span />
          </div>
          {sets.map((set) => (
            <SetRow
              key={set.localId}
              set={set}
              exerciseName={exercise.exercise}
              weightRef={getWeightRef(set.localId)}
              repsRef={getRepsRef(set.localId)}
              autoFocusWeight={!set.done && sets.filter(s => !s.done)[0]?.localId === set.localId}
              onDone={handleSetDone}
              onUndo={(localId) => onSetUndo(exercise.exercise, localId)}
              onFieldChange={(localId, field, value) =>
                onFieldChange(exercise.exercise, localId, field, value)
              }
              onRemove={(localId) => onRemoveSet(exercise.exercise, localId)}
            />
          ))}
        </div>

        <div className={styles.actions}>
          <button className={styles.addSetBtn} onClick={() => onAddSet(exercise.exercise)}>
            + ADD SET
          </button>
          {!isLast && (
            <button
              className={`${styles.nextBtn} ${!hasLoggedSet ? styles.nextBtnDisabled : ''}`}
              onClick={hasLoggedSet ? onNext : undefined}
            >
              {hasLoggedSet ? 'NEXT EXERCISE →' : 'LOG A SET TO CONTINUE'}
            </button>
          )}
          {isLast && (
            <button
              className={`${styles.nextBtn} ${styles.finishBtn} ${!hasLoggedSet ? styles.nextBtnDisabled : ''}`}
              onClick={hasLoggedSet ? onNext : undefined}
            >
              {hasLoggedSet ? 'FINISH SESSION ✓' : 'LOG A SET TO CONTINUE'}
            </button>
          )}
        </div>
      </div>

      {showInsights && (
        <InsightsSheet
          userId={userId}
          exerciseName={exercise.exercise}
          currentSets={sets}
          onClose={() => setShowInsights(false)}
        />
      )}
    </>
  )
}
