import { useState, useEffect } from 'react'
import styles from './WorkoutLog.module.css'

const ACCENT_COLORS = [
  '#4f6cff','#00e5c8','#a56bff','#ff6bae',
  '#ffd166','#ff9f40','#ff6b6b','#43e97b','#00e5ff'
]

const PART_OPTIONS = [
  'chest','back','shoulders','biceps','triceps',
  'abs','quads','hamstrings','calves','glutes','full'
]

const INITIAL_BOARDS = [
  { id:1, name:'Chest & Triceps', part:'chest', emoji:'🏋️', color:'#4f6cff', open:true, exercises:[
    { id:1, name:'Bench Press',          sets:4, reps:8,  weight:80, notes:'' },
    { id:2, name:'Incline Dumbbell Press',sets:3, reps:10, weight:28, notes:'slow eccentric' },
    { id:3, name:'Cable Fly',            sets:3, reps:12, weight:15, notes:'' },
    { id:4, name:'Tricep Pushdown',      sets:3, reps:12, weight:25, notes:'' },
  ]},
  { id:2, name:'Back & Biceps', part:'biceps', emoji:'💪', color:'#ff6bae', open:false, exercises:[
    { id:1, name:'Pull-ups',     sets:4, reps:8,  weight:0,  notes:'bodyweight' },
    { id:2, name:'Barbell Row',  sets:4, reps:8,  weight:70, notes:'' },
    { id:3, name:'Lat Pulldown', sets:3, reps:10, weight:60, notes:'' },
    { id:4, name:'Hammer Curl',  sets:3, reps:12, weight:18, notes:'' },
  ]},
  { id:3, name:'Leg Day', part:'quads', emoji:'🦵', color:'#ffd166', open:false, exercises:[
    { id:1, name:'Squat',               sets:5, reps:5,  weight:100, notes:'belt on 3+ sets' },
    { id:2, name:'Leg Press',           sets:4, reps:12, weight:160, notes:'' },
    { id:3, name:'Romanian Deadlift',   sets:3, reps:10, weight:70,  notes:'' },
    { id:4, name:'Calf Raises',         sets:4, reps:20, weight:40,  notes:'' },
  ]},
  { id:4, name:'Shoulders', part:'shoulders', emoji:'🎯', color:'#a56bff', open:false, exercises:[
    { id:1, name:'Overhead Press', sets:4, reps:8,  weight:50, notes:'' },
    { id:2, name:'Lateral Raise',  sets:3, reps:15, weight:10, notes:'drop set last set' },
    { id:3, name:'Face Pulls',     sets:3, reps:15, weight:20, notes:'' },
  ]},
]

function loadBoards() {
  try {
    const saved = localStorage.getItem('workoutBoards')
    return saved ? JSON.parse(saved) : INITIAL_BOARDS
  } catch { return INITIAL_BOARDS }
}

function totalVol(ex)   { return ex.sets * ex.reps * (ex.weight || 0) }
function boardVol(b)    { return b.exercises.reduce((s, e) => s + totalVol(e), 0) }
function maxVol(b)      { return Math.max(...b.exercises.map(e => totalVol(e)), 1) }

const PART_TO_MUSCLE = {
  chest: 'chest', back: 'back', shoulders: 'shoulders',
  biceps: 'arms', triceps: 'arms', abs: 'abs',
  quads: 'legs', hamstrings: 'legs', calves: 'legs', glutes: 'legs',
}

export function WorkoutLog({ onComplete }) {
  const [boards, setBoards]         = useState(loadBoards)
  const [nextId, setNextId]         = useState(() => Math.max(...loadBoards().map(b => b.id), 4) + 1)

  // When the AI assistant creates a new routine, App.jsx writes it to localStorage
  // and fires a 'storage' event. This listener picks that up and re-renders the boards.
  useEffect(() => {
    function onStorage() {
      setBoards(loadBoards())
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const [completed, setCompleted] = useState(() => {
    try {
      const saved = localStorage.getItem('completedBoards')
      return saved ? new Set(JSON.parse(saved)) : new Set()
    } catch { return new Set() }
  })

  // Add board modal
  const [showBoardModal, setShowBoardModal] = useState(false)
  const [newName,  setNewName]  = useState('')
  const [newPart,  setNewPart]  = useState('chest')
  const [newEmoji, setNewEmoji] = useState('💪')
  const [newColor, setNewColor] = useState(ACCENT_COLORS[0])

  // Edit exercise modal
  const [editTarget, setEditTarget] = useState(null) // { boardId, exId } or { boardId } for new
  const [exName,   setExName]   = useState('')
  const [exSets,   setExSets]   = useState(3)
  const [exReps,   setExReps]   = useState(10)
  const [exWeight, setExWeight] = useState(0)
  const [exNotes,  setExNotes]  = useState('')

  // Quick add inputs per board
  const [quickInputs, setQuickInputs] = useState({})

  useEffect(() => {
    localStorage.setItem('workoutBoards', JSON.stringify(boards))
  }, [boards])

  useEffect(() => {
    localStorage.setItem('completedBoards', JSON.stringify([...completed]))
  }, [completed])

  function toggleBoard(id) {
    setBoards(prev => prev.map(b => b.id === id ? { ...b, open: !b.open } : b))
  }

  function toggleComplete(b, e) {
    e.stopPropagation()
    const isCompleted = completed.has(b.id)
    setCompleted(prev => {
      const next = new Set(prev)
      isCompleted ? next.delete(b.id) : next.add(b.id)
      return next
    })
    if (!isCompleted && onComplete) {
      const muscleGroup = PART_TO_MUSCLE[b.part]
      if (muscleGroup) {
        const sets = b.exercises.map(ex => ({
          exercise: ex.name,
          sets:     String(ex.sets),
          reps:     String(ex.reps),
          weight:   String(ex.weight),
        }))
        onComplete({ muscleGroup, sets })
      }
    }
  }

  function openAddBoard() {
    setNewName(''); setNewPart('chest'); setNewEmoji('💪'); setNewColor(ACCENT_COLORS[0])
    setShowBoardModal(true)
  }

  function saveBoard() {
    if (!newName.trim()) return
    setBoards(prev => [...prev, {
      id: nextId, name: newName.trim(), part: newPart,
      emoji: newEmoji || '💪', color: newColor, open: true, exercises: []
    }])
    setNextId(n => n + 1)
    setShowBoardModal(false)
  }

  function openEditEx(boardId, exId) {
    const b = boards.find(b => b.id === boardId)
    const ex = b.exercises.find(e => e.id === exId)
    setEditTarget({ boardId, exId })
    setExName(ex.name); setExSets(ex.sets); setExReps(ex.reps)
    setExWeight(ex.weight); setExNotes(ex.notes)
  }

  function saveExercise() {
    if (!editTarget) return
    setBoards(prev => prev.map(b => b.id === editTarget.boardId ? {
      ...b, exercises: b.exercises.map(e => e.id === editTarget.exId
        ? { ...e, name: exName, sets: +exSets, reps: +exReps, weight: +exWeight, notes: exNotes }
        : e)
    } : b))
    setEditTarget(null)
  }

  function deleteExercise() {
    if (!editTarget) return
    setBoards(prev => prev.map(b => b.id === editTarget.boardId
      ? { ...b, exercises: b.exercises.filter(e => e.id !== editTarget.exId) }
      : b))
    setEditTarget(null)
  }

  function quickAdd(boardId) {
    const q = quickInputs[boardId] || {}
    const name = (q.name || '').trim()
    if (!name) return
    const b = boards.find(b => b.id === boardId)
    const maxId = b.exercises.reduce((m, e) => Math.max(m, e.id), 0)
    setBoards(prev => prev.map(x => x.id === boardId ? {
      ...x, exercises: [...x.exercises, {
        id: maxId + 1, name,
        sets: +(q.sets || 3), reps: +(q.reps || 10),
        weight: +(q.wt || 0), notes: ''
      }]
    } : x))
    setQuickInputs(prev => ({ ...prev, [boardId]: { name:'', sets:3, reps:10, wt:0 } }))
  }

  function setQ(boardId, field, val) {
    setQuickInputs(prev => ({ ...prev, [boardId]: { ...(prev[boardId] || {}), [field]: val } }))
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.boardsPanel}>
        <div className={styles.topbar}>
          <div>
            <h1 className={styles.topbarTitle}>WORKOUT LOG</h1>
            <div className={styles.dateLabel}>
              {new Date().toLocaleDateString('en-GB', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}
            </div>
          </div>
          <button className={styles.addBtn} onClick={openAddBoard}>+ Add Board</button>
        </div>

        <div className={styles.boardsContainer}>
          {boards.map(b => {
            const vol  = boardVol(b)
            const mv   = maxVol(b)
            const q    = quickInputs[b.id] || {}
            return (
              <div key={b.id} id={`board-${b.id}`} className={styles.boardCard}>
                <div className={styles.boardHeader} onClick={() => toggleBoard(b.id)}>
                  <div className={styles.boardIcon} style={{ background: b.color + '22' }}>{b.emoji}</div>
                  <div className={styles.boardTitleWrap}>
                    <div className={styles.boardTitle}>{b.name}</div>
                    <div className={styles.boardSub} style={{ color: b.color + 'bb' }}>
                      {b.part.toUpperCase()} · {b.exercises.length} exercises
                    </div>
                  </div>
                  <span className={styles.boardBadge} style={{ color: b.color }}>
                    {vol > 0 ? `${vol > 999 ? (vol/1000).toFixed(1)+'t' : vol+'kg'} vol` : `${b.exercises.length} ex`}
                  </span>
                  <button
                    className={`${styles.checkBtn} ${completed.has(b.id) ? styles.checkBtnDone : ''}`}
                    style={completed.has(b.id) ? { borderColor: b.color, color: b.color } : {}}
                    onClick={e => toggleComplete(b, e)}
                  >
                    {completed.has(b.id) ? '✓' : '○'}
                  </button>
                  <span className={`${styles.toggle} ${b.open ? styles.toggleOpen : ''}`}>▾</span>
                </div>

                {b.open && (
                  <div className={styles.boardBody}>
                    <div className={styles.statsRow}>
                      {[
                        { v: b.exercises.length, l: 'Exercises' },
                        { v: b.exercises.reduce((s,e) => s+e.sets, 0), l: 'Total Sets' },
                        { v: vol > 0 ? (vol > 999 ? (vol/1000).toFixed(1)+'t' : vol+'kg') : '—', l: 'Volume', color: b.color },
                      ].map(({ v, l, color }) => (
                        <div key={l} className={styles.statPill}>
                          <div className={styles.statVal} style={color ? { color } : {}}>{v}</div>
                          <div className={styles.statLabel}>{l}</div>
                        </div>
                      ))}
                    </div>

                    <table className={styles.exTable}>
                      <thead>
                        <tr>
                          <th>Exercise</th><th>Sets×Reps</th><th>Weight</th><th>Effort</th><th/>
                        </tr>
                      </thead>
                      <tbody>
                        {b.exercises.map(ex => {
                          const pct = Math.round(totalVol(ex) / mv * 100)
                          return (
                            <tr key={ex.id} onClick={() => openEditEx(b.id, ex.id)} className={styles.exRow}>
                              <td>
                                <span className={styles.exName}>{ex.name}</span>
                                {ex.notes && <div className={styles.exNotes}>{ex.notes}</div>}
                              </td>
                              <td><span className={styles.exSets}>{ex.sets}×{ex.reps}</span></td>
                              <td><span className={styles.exVol}>{ex.weight ? ex.weight+'kg' : 'BW'}</span></td>
                              <td>
                                <div className={styles.pctBar}>
                                  <div className={styles.pctFill}
                                    style={{ width:`${pct}%`, background:`linear-gradient(90deg,${b.color},${b.color}88)` }}/>
                                </div>
                              </td>
                              <td>
                                <button className={styles.editBtn}
                                  onClick={e => { e.stopPropagation(); openEditEx(b.id, ex.id) }}>
                                  edit
                                </button>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>

                    <div className={styles.quickAdd}>
                      <input placeholder="Quick add exercise…" value={q.name||''} onChange={e => setQ(b.id,'name',e.target.value)}
                        onKeyDown={e => e.key==='Enter' && quickAdd(b.id)} className={styles.qaInput}/>
                      <input type="number" placeholder="sets" value={q.sets||3} onChange={e => setQ(b.id,'sets',e.target.value)} className={styles.qaNum}/>
                      <input type="number" placeholder="reps" value={q.reps||10} onChange={e => setQ(b.id,'reps',e.target.value)} className={styles.qaNum}/>
                      <input type="number" placeholder="kg"   value={q.wt||0}   onChange={e => setQ(b.id,'wt',e.target.value)}   className={styles.qaNum}/>
                      <button className={styles.qaBtn} onClick={() => quickAdd(b.id)}>+ Add</button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* ADD BOARD MODAL */}
      {showBoardModal && (
        <div className={styles.modalBackdrop} onClick={() => setShowBoardModal(false)}>
          <div className={styles.modalBox} onClick={e => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>Add Workout Board</h3>
            <label className={styles.label}>Board Name</label>
            <input className={styles.input} value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. Leg Day"/>
            <label className={styles.label}>Body Part</label>
            <select className={styles.input} value={newPart} onChange={e => setNewPart(e.target.value)}>
              {PART_OPTIONS.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase()+p.slice(1)}</option>)}
            </select>
            <label className={styles.label}>Icon Emoji</label>
            <input className={styles.input} value={newEmoji} onChange={e => setNewEmoji(e.target.value)} placeholder="💪" maxLength={2}/>
            <label className={styles.label}>Accent Color</label>
            <div className={styles.colorRow}>
              {ACCENT_COLORS.map(c => (
                <div key={c} className={`${styles.swatch} ${c===newColor ? styles.swatchSel : ''}`}
                  style={{ background: c }} onClick={() => setNewColor(c)}/>
              ))}
            </div>
            <div className={styles.modalBtns}>
              <button className={styles.btnSave} onClick={saveBoard}>Create Board</button>
              <button className={styles.btnCancel} onClick={() => setShowBoardModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT EXERCISE MODAL */}
      {editTarget && (
        <div className={styles.modalBackdrop} onClick={() => setEditTarget(null)}>
          <div className={styles.modalBox} onClick={e => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>Edit Exercise</h3>
            <label className={styles.label}>Exercise Name</label>
            <input className={styles.input} value={exName} onChange={e => setExName(e.target.value)}/>
            <div className={styles.modalRow}>
              <div>
                <label className={styles.label}>Sets</label>
                <input className={styles.input} type="number" min="1" max="20" value={exSets} onChange={e => setExSets(e.target.value)}/>
              </div>
              <div>
                <label className={styles.label}>Reps</label>
                <input className={styles.input} type="number" min="1" max="100" value={exReps} onChange={e => setExReps(e.target.value)}/>
              </div>
              <div>
                <label className={styles.label}>Weight (kg)</label>
                <input className={styles.input} type="number" min="0" step="2.5" value={exWeight} onChange={e => setExWeight(e.target.value)}/>
              </div>
            </div>
            <label className={styles.label}>Notes</label>
            <input className={styles.input} value={exNotes} onChange={e => setExNotes(e.target.value)} placeholder="Optional notes…"/>
            <div className={styles.modalBtns}>
              <button className={styles.btnSave}   onClick={saveExercise}>Save</button>
              <button className={styles.btnDelete} onClick={deleteExercise}>Delete</button>
              <button className={styles.btnCancel} onClick={() => setEditTarget(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
