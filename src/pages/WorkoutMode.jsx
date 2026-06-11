import { useState, useEffect, useRef } from 'react'
import { useWorkoutSession } from '../hooks/useWorkoutSession'
import { useRestTimer } from '../hooks/useRestTimer'
import { SessionProgress } from '../components/workout/SessionProgress'
import { ExerciseCard } from '../components/workout/ExerciseCard'
import { PreviewCard } from '../components/workout/PreviewCard'
import { RestTimer } from '../components/workout/RestTimer'
import { getExerciseHistory } from '../lib/supabase/sessions'
import styles from './WorkoutMode.module.css'

function fmtMmss(seconds) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function WorkoutMode({ userId, planId, exercises, dayLabel, onExit }) {
  const {
    sessionId,
    currentIndex,
    setCurrentIndex,
    loggedSets,
    elapsedSeconds,
    elapsedMmss,
    totalSets,
    completedSets,
    hasUnsaved,
    isEnded,
    markSetDone,
    undoSet,
    addSet,
    removeSet,
    updateSetField,
    finishSession,
  } = useWorkoutSession(userId, planId, exercises, dayLabel)

  const restTimer = useRestTimer()

  const [lastSessionSets, setLastSessionSets] = useState(null)

  // Fetch previous session data for the current exercise
  useEffect(() => {
    const ex = exercises[currentIndex]
    if (!ex?.exercise || !userId) return
    setLastSessionSets(null)
    getExerciseHistory(userId, ex.exercise, 2).then(history => {
      const prev = history.find(h => h.sessionId !== sessionId)
      setLastSessionSets(prev?.sets ?? [])
    })
  }, [currentIndex, userId, sessionId, exercises])

  const [showEndModal, setShowEndModal] = useState(false)
  const [rating, setRating] = useState(0)
  const [endNotes, setEndNotes] = useState('')
  const [ending, setEnding] = useState(false)
  const wakeLock = useRef(null)

  // Screen wake lock
  useEffect(() => {
    navigator.wakeLock?.request('screen').then(lock => {
      wakeLock.current = lock
    }).catch(() => {})
    return () => { wakeLock.current?.release().catch(() => {}) }
  }, [])

  // Navigate away when session ended
  useEffect(() => {
    if (isEnded) onExit()
  }, [isEnded, onExit])

  const handleBack = () => {
    if (hasUnsaved) {
      if (!window.confirm('You have logged sets this session. Exit anyway?')) return
    }
    onExit()
  }

  async function handleSetDone(exerciseName, localId, weight, reps) {
    const restSeconds = await markSetDone(exerciseName, localId, weight, reps)
    restTimer.start(restSeconds)
  }

  function handleNext() {
    if (currentIndex < exercises.length - 1) {
      setCurrentIndex(i => i + 1)
      restTimer.skip()
    } else {
      setShowEndModal(true)
    }
  }

  async function handleEndSession() {
    setEnding(true)
    await finishSession(rating || null, endNotes || null)
  }

  const titleLabel = dayLabel?.toUpperCase() || 'WORKOUT'

  return (
    <div className={styles.wrap}>
      {/* Top bar */}
      <div className={styles.topBar}>
        <button className={styles.backBtn} onClick={handleBack}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        <div className={styles.center}>
          <span className={styles.sessionTitle}>{titleLabel}</span>
          <span className={styles.elapsed}>SESSION · {elapsedMmss} ELAPSED</span>
        </div>

        <button className={styles.endBtn} onClick={() => setShowEndModal(true)}>
          END
        </button>
      </div>

      {/* Progress strip */}
      <SessionProgress
        currentIndex={currentIndex}
        totalExercises={exercises.length}
        completedSets={completedSets}
        totalSets={totalSets}
      />

      {/* Main scroll area */}
      <div className={styles.scroll}>
        {/* Current exercise */}
        <ExerciseCard
          exercise={exercises[currentIndex]}
          index={currentIndex}
          isActive
          sets={loggedSets[exercises[currentIndex]?.exercise] || []}
          userId={userId}
          lastSession={lastSessionSets}
          onSetDone={handleSetDone}
          onSetUndo={undoSet}
          onFieldChange={updateSetField}
          onRemoveSet={removeSet}
          onAddSet={addSet}
          onNext={handleNext}
          isLast={currentIndex === exercises.length - 1}
        />

        {/* Other exercises — "done" means a set was actually logged, not just
            that we scrolled past it. Anything not current and not logged is pending. */}
        {(() => {
          const others = exercises
            .map((ex, idx) => ({ ex, idx }))
            .filter(({ idx }) => idx !== currentIndex)
            .map(({ ex, idx }) => ({
              ex,
              idx,
              done: (loggedSets[ex.exercise] || []).some(s => s.done),
            }))

          const pending = others.filter(o => !o.done)
          const done = others.filter(o => o.done)

          const renderCard = ({ ex, idx, done }) => (
            <PreviewCard
              key={ex.exercise + idx}
              exercise={ex}
              index={idx}
              loggedSets={loggedSets[ex.exercise]}
              isDone={done}
              onClick={() => {
                setCurrentIndex(idx)
                restTimer.skip()
              }}
            />
          )

          return (
            <>
              {pending.length > 0 && (
                <div className={styles.section}>
                  <div className={styles.sectionLabel}>UP NEXT</div>
                  <div className={styles.previewList}>{pending.map(renderCard)}</div>
                </div>
              )}
              {done.length > 0 && (
                <div className={styles.section}>
                  <div className={styles.sectionLabel}>DONE</div>
                  <div className={styles.previewList}>{done.map(renderCard)}</div>
                </div>
              )}
            </>
          )
        })()}

        <div style={{ height: 120 }} />
      </div>

      {/* Floating rest timer */}
      <RestTimer
        mmss={restTimer.mmss}
        seconds={restTimer.seconds}
        progress={restTimer.progress}
        isActive={restTimer.isActive}
        onSkip={restTimer.skip}
        onAddTime={restTimer.addTime}
      />

      {/* End session modal */}
      {showEndModal && (
        <div className={styles.modalBackdrop} onClick={() => !ending && setShowEndModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>END SESSION?</h2>
            <p className={styles.modalSub}>
              {completedSets} SETS LOGGED · {fmtMmss(elapsedSeconds)} ELAPSED
            </p>

            <div className={styles.ratingRow}>
              <span className={styles.ratingLabel}>HOW WAS IT?</span>
              <div className={styles.stars}>
                {[1, 2, 3, 4, 5].map(n => (
                  <button
                    key={n}
                    className={`${styles.star} ${rating >= n ? styles.starActive : ''}`}
                    onClick={() => setRating(n)}
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>

            <textarea
              className={styles.notesInput}
              placeholder="Session notes (optional)…"
              value={endNotes}
              onChange={e => setEndNotes(e.target.value)}
              rows={3}
            />

            <div className={styles.modalActions}>
              <button
                className={styles.cancelModalBtn}
                onClick={() => setShowEndModal(false)}
                disabled={ending}
              >
                KEEP GOING
              </button>
              <button
                className={styles.confirmEndBtn}
                onClick={handleEndSession}
                disabled={ending}
              >
                {ending ? 'SAVING…' : 'SAVE SESSION'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
