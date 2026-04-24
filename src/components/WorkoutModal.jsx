import { useState } from 'react'
import styles from './WorkoutModal.module.css'

const EXERCISES = {
  chest:     ['Bench Press', 'Incline Press', 'Cable Fly', 'Push Up', 'Chest Dip', 'Pec Deck'],
  shoulders: ['Overhead Press', 'Lateral Raise', 'Front Raise', 'Arnold Press', 'Face Pull', 'Shrugs'],
  abs:       ['Crunch', 'Plank', 'Leg Raise', 'Russian Twist', 'Cable Crunch', 'Ab Rollout'],
  arms:      ['Bicep Curl', 'Tricep Pushdown', 'Hammer Curl', 'Skull Crusher', 'Preacher Curl', 'Dips'],
  legs:      ['Squat', 'Leg Press', 'Romanian Deadlift', 'Leg Curl', 'Leg Extension', 'Calf Raise'],
  back:      ['Deadlift', 'Pull Up', 'Bent Over Row', 'Lat Pulldown', 'Seated Row', 'Face Pull'],
}

const REP_RANGES = ['1–3', '4–6', '6–8', '8–10', '10–12', '12–15', '15–20']
const SET_RANGES = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12']

function makeExercise(name) {
  return { exercise: name, sets: '3', reps: '8–10', weight: '' }
}

function normalizeReps(r) {
  if (!r) return '8–10'
  const n = String(r).replace('-', '–')
  return REP_RANGES.includes(n) ? n : '8–10'
}

export function WorkoutModal({ muscleGroup, onSave, onClose, initialSets }) {
  const exercises = EXERCISES[muscleGroup] || []

  const [entries, setEntries] = useState(() =>
    initialSets?.length
      ? initialSets.map(s => ({
          exercise: s.exercise || exercises[0] || '',
          sets:     SET_RANGES.includes(String(s.sets)) ? String(s.sets) : '3',
          reps:     normalizeReps(s.reps),
          weight:   s.weight || '',
        }))
      : [makeExercise(exercises[0] || '')]
  )

  function addExercise() {
    setEntries(prev => [...prev, makeExercise(exercises[0] || '')])
  }

  function removeExercise(ei) {
    setEntries(prev => prev.filter((_, i) => i !== ei))
  }

  function updateExerciseName(ei, value) {
    setEntries(prev => prev.map((e, i) => i === ei ? { ...e, exercise: value } : e))
  }

  function updateEntry(ei, field, value) {
    setEntries(prev => prev.map((e, i) =>
      i === ei ? { ...e, [field]: value } : e
    ))
  }

  function handleSave() {
    const flatSets = entries.map(e => ({
      exercise: e.exercise,
      sets: e.sets,
      reps: e.reps,
      weight: e.weight,
    }))
    onSave({ muscleGroup, sets: flatSets })
    onClose()
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className={styles.header}>
          <div>
            <div className={styles.tag}>{initialSets ? 'EDIT WORKOUT' : 'LOG WORKOUT'}</div>
            <h2 className={styles.title}>{muscleGroup.toUpperCase()}</h2>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        {/* Exercise blocks */}
        <div className={styles.setsList}>
          {entries.map((entry, ei) => (
            <div key={ei} className={styles.exerciseBlock}>

              {/* Exercise header row */}
              <div className={styles.exerciseHeader}>
                <select
                  className={styles.exerciseSelect}
                  value={entry.exercise}
                  onChange={e => updateExerciseName(ei, e.target.value)}
                >
                  {!exercises.includes(entry.exercise) && (
                    <option value={entry.exercise}>{entry.exercise}</option>
                  )}
                  {exercises.map(ex => (
                    <option key={ex} value={ex}>{ex}</option>
                  ))}
                </select>
                {entries.length > 1 && (
                  <button className={styles.deleteBtn} onClick={() => removeExercise(ei)}>✕</button>
                )}
              </div>

              {/* Column headers */}
              <div className={styles.colHeaders}>
                <span className={styles.colSets}>SETS</span>
                <span className={styles.colReps}>REPS</span>
                <span className={styles.colWeight}>KG</span>
              </div>

              {/* Single row per exercise */}
              <div className={styles.setRow}>
                <select
                  className={styles.selectSmall}
                  value={entry.sets}
                  onChange={e => updateEntry(ei, 'sets', e.target.value)}
                >
                  {SET_RANGES.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>

                <select
                  className={styles.selectSmall}
                  value={entry.reps}
                  onChange={e => updateEntry(ei, 'reps', e.target.value)}
                >
                  {REP_RANGES.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>

                <input
                  className={styles.weightInput}
                  type="number"
                  placeholder="—"
                  value={entry.weight}
                  onChange={e => updateEntry(ei, 'weight', e.target.value)}
                  min="0"
                  max="999"
                />
              </div>

            </div>
          ))}
        </div>

        {/* Add exercise */}
        <button className={styles.addSetBtn} onClick={addExercise}>
          + ADD EXERCISE
        </button>

        {/* Footer */}
        <div className={styles.footer}>
          <button className={styles.cancelBtn} onClick={onClose}>CANCEL</button>
          <button className={styles.saveBtn} onClick={handleSave}>SAVE SESSION</button>
        </div>

      </div>
    </div>
  )
}