import { useRef, useState } from 'react'
import styles from './SetRow.module.css'

export function SetRow({
  set,
  exerciseName,
  onDone,
  onUndo,
  onFieldChange,
  onRemove,
  autoFocusWeight,
  weightRef,
  repsRef,
  nextWeightRef,
}) {
  const longPressTimer = useRef(null)
  const [showActions, setShowActions] = useState(false)

  const handleCheck = () => {
    if (!set.weight || !set.reps) return
    onDone(set.localId, set.weight, set.reps)
    setShowActions(false)
  }

  const handleLongPressStart = () => {
    if (!set.done) return
    longPressTimer.current = setTimeout(() => setShowActions(true), 500)
  }

  const handleLongPressEnd = () => {
    clearTimeout(longPressTimer.current)
  }

  if (showActions) {
    return (
      <div className={`${styles.row} ${styles.actionRow}`}>
        <span className={styles.setNum}>{set.setNumber}</span>
        <div className={styles.actions}>
          <button
            className={styles.editBtn}
            onClick={() => {
              onUndo(set.localId)
              setShowActions(false)
            }}
          >
            EDIT
          </button>
          <button
            className={styles.deleteBtn}
            onClick={() => {
              onRemove(set.localId)
              setShowActions(false)
            }}
          >
            DELETE
          </button>
          <button className={styles.cancelBtn} onClick={() => setShowActions(false)}>
            CANCEL
          </button>
        </div>
      </div>
    )
  }

  if (set.done) {
    return (
      <div
        className={`${styles.row} ${styles.rowDone}`}
        onPointerDown={handleLongPressStart}
        onPointerUp={handleLongPressEnd}
        onPointerLeave={handleLongPressEnd}
        onTouchStart={handleLongPressStart}
        onTouchEnd={handleLongPressEnd}
      >
        <span className={styles.setNum}>{set.setNumber}</span>
        <span className={styles.doneValue}>{set.weight || 'BW'}</span>
        <span className={styles.doneSep}>×</span>
        <span className={styles.doneValue}>{set.reps}</span>
        <span className={styles.check}>✓</span>
      </div>
    )
  }

  return (
    <div className={styles.row}>
      <span className={styles.setNum}>{set.setNumber}</span>
      <input
        ref={weightRef}
        className={styles.input}
        type="number"
        inputMode="decimal"
        placeholder="kg"
        value={set.weight}
        autoFocus={autoFocusWeight}
        onChange={e => onFieldChange(set.localId, 'weight', e.target.value)}
        onFocus={e => e.target.select()}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === 'Tab') {
            e.preventDefault()
            repsRef?.current?.focus()
          }
        }}
      />
      <span className={styles.sep}>×</span>
      <input
        ref={repsRef}
        className={styles.input}
        type="number"
        inputMode="numeric"
        placeholder="reps"
        value={set.reps}
        onChange={e => onFieldChange(set.localId, 'reps', e.target.value)}
        onFocus={e => e.target.select()}
        onKeyDown={e => {
          if (e.key === 'Enter') handleCheck()
        }}
      />
      <button
        className={`${styles.checkBtn} ${set.weight && set.reps ? styles.checkReady : ''}`}
        onClick={handleCheck}
        disabled={!set.weight || !set.reps}
      >
        ✓
      </button>
    </div>
  )
}
