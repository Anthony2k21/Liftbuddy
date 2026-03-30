import { useState, useEffect } from 'react'
import styles from './DailyTracker.module.css'

const TODAY = new Date().toISOString().slice(0, 10)

function loadBoards() {
  try {
    const saved = localStorage.getItem('workoutBoards')
    return saved ? JSON.parse(saved) : []
  } catch { return [] }
}

function loadTracker() {
  try {
    const saved = localStorage.getItem('dailyTracker')
    return saved ? JSON.parse(saved) : {}
  } catch { return {} }
}

function saveTracker(data) {
  localStorage.setItem('dailyTracker', JSON.stringify(data))
}

export function DailyTracker() {
  const [boards, setBoards]   = useState(loadBoards)
  const [tracker, setTracker] = useState(loadTracker)
  const [viewDate, setViewDate] = useState(TODAY)

  // Re-read boards if AI updates them
  useEffect(() => {
    function onStorage() { setBoards(loadBoards()) }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  function getEntry(boardId, exId) {
    return tracker[viewDate]?.[boardId]?.[exId] ?? { done: false, weight: '' }
  }

  function toggleDone(boardId, exId) {
    setTracker(prev => {
      const next = structuredClone(prev)
      if (!next[viewDate]) next[viewDate] = {}
      if (!next[viewDate][boardId]) next[viewDate][boardId] = {}
      const cur = next[viewDate][boardId][exId] ?? { done: false, weight: '' }
      next[viewDate][boardId][exId] = { ...cur, done: !cur.done }
      saveTracker(next)
      return next
    })
  }

  function setWeight(boardId, exId, weight) {
    setTracker(prev => {
      const next = structuredClone(prev)
      if (!next[viewDate]) next[viewDate] = {}
      if (!next[viewDate][boardId]) next[viewDate][boardId] = {}
      const cur = next[viewDate][boardId][exId] ?? { done: false, weight: '' }
      next[viewDate][boardId][exId] = { ...cur, weight }
      saveTracker(next)
      return next
    })
  }

  function boardProgress(b) {
    const total = b.exercises.length
    const done  = b.exercises.filter(e => getEntry(b.id, e.id).done).length
    return { done, total }
  }

  const pastDates = Object.keys(loadTracker())
    .filter(d => d !== TODAY)
    .sort((a, b) => b.localeCompare(a))
    .slice(0, 7)

  return (
    <div className={styles.wrap}>
      <div className={styles.topbar}>
        <div>
          <h1 className={styles.title}>TODAY</h1>
          <div className={styles.date}>
            {new Date(viewDate + 'T00:00:00').toLocaleDateString('en-GB', {
              weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
            })}
          </div>
        </div>
        {pastDates.length > 0 && (
          <select
            className={styles.datePicker}
            value={viewDate}
            onChange={e => setViewDate(e.target.value)}
          >
            <option value={TODAY}>Today</option>
            {pastDates.map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        )}
      </div>

      <div className={styles.boards}>
        {boards.length === 0 && (
          <p className={styles.empty}>No workout boards yet — create one in the Workout Log tab.</p>
        )}

        {boards.map(b => {
          const { done, total } = boardProgress(b)
          const pct = total > 0 ? Math.round(done / total * 100) : 0
          const complete = done === total && total > 0

          return (
            <div key={b.id} className={`${styles.board} ${complete ? styles.boardComplete : ''}`}>
              <div className={styles.boardHeader}>
                <div className={styles.boardIcon} style={{ background: b.color + '22' }}>{b.emoji}</div>
                <div className={styles.boardInfo}>
                  <div className={styles.boardName} style={{ color: complete ? b.color : undefined }}>
                    {b.name}
                  </div>
                  <div className={styles.boardSub} style={{ color: b.color + 'aa' }}>
                    {b.part.toUpperCase()} · {done}/{total} done
                  </div>
                </div>
                {complete && <span className={styles.completeBadge} style={{ color: b.color }}>✓ DONE</span>}
              </div>

              <div className={styles.progressBar}>
                <div
                  className={styles.progressFill}
                  style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${b.color}, ${b.color}88)` }}
                />
              </div>

              <div className={styles.exercises}>
                {b.exercises.map(ex => {
                  const entry = getEntry(b.id, ex.id)
                  return (
                    <div key={ex.id} className={`${styles.exRow} ${entry.done ? styles.exDone : ''}`}>
                      <button
                        className={`${styles.check} ${entry.done ? styles.checked : ''}`}
                        style={entry.done ? { borderColor: b.color, background: b.color + '22', color: b.color } : {}}
                        onClick={() => toggleDone(b.id, ex.id)}
                      >
                        {entry.done ? '✓' : ''}
                      </button>
                      <div className={styles.exInfo}>
                        <span className={styles.exName}>{ex.name}</span>
                        <span className={styles.exMeta}>{ex.sets}×{ex.reps}</span>
                      </div>
                      <div className={styles.weightInput}>
                        <input
                          type="number"
                          min="0"
                          placeholder={ex.weight || '—'}
                          value={entry.weight}
                          onChange={e => setWeight(b.id, ex.id, e.target.value)}
                          className={styles.weightField}
                        />
                        <span className={styles.weightUnit}>kg</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
