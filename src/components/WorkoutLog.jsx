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

// ── WORKOUT PLANS ──────────────────────────────────────────────────────────
const INITIAL_PLANS = [
  {
    id: 1,
    name: 'PPL Program',
    type: 'Push Pull Legs',
    duration: '6 weeks',
    daysPerWeek: 6,
    color: '#4f6cff',
    description: 'Classic Push Pull Legs split for hypertrophy and strength.',
    schedule: [
      { day: 'Push', exercises: [
        { name: 'Bench Press',        sets: 4, reps: '6–8'  },
        { name: 'Overhead Press',     sets: 3, reps: '8–10' },
        { name: 'Incline DB Press',   sets: 3, reps: '10–12'},
        { name: 'Lateral Raise',      sets: 3, reps: '15'   },
        { name: 'Tricep Pushdown',    sets: 3, reps: '12'   },
      ]},
      { day: 'Pull', exercises: [
        { name: 'Deadlift',           sets: 3, reps: '5'    },
        { name: 'Pull-ups',           sets: 4, reps: '6–8'  },
        { name: 'Barbell Row',        sets: 3, reps: '8–10' },
        { name: 'Face Pulls',         sets: 3, reps: '15'   },
        { name: 'Hammer Curl',        sets: 3, reps: '12'   },
      ]},
      { day: 'Legs', exercises: [
        { name: 'Squat',              sets: 4, reps: '6–8'  },
        { name: 'Leg Press',          sets: 3, reps: '10–12'},
        { name: 'Romanian Deadlift',  sets: 3, reps: '10'   },
        { name: 'Leg Curl',           sets: 3, reps: '12'   },
        { name: 'Calf Raises',        sets: 4, reps: '20'   },
      ]},
    ],
  },
  {
    id: 2,
    name: 'Stronglifts 5×5',
    type: 'Strength',
    duration: '12 weeks',
    daysPerWeek: 3,
    color: '#ffd166',
    description: 'Linear progression with compound lifts. Add 2.5 kg each session.',
    schedule: [
      { day: 'Workout A', exercises: [
        { name: 'Squat',          sets: 5, reps: '5' },
        { name: 'Bench Press',    sets: 5, reps: '5' },
        { name: 'Barbell Row',    sets: 5, reps: '5' },
      ]},
      { day: 'Workout B', exercises: [
        { name: 'Squat',          sets: 5, reps: '5' },
        { name: 'Overhead Press', sets: 5, reps: '5' },
        { name: 'Deadlift',       sets: 1, reps: '5' },
      ]},
    ],
  },
]

function loadPlans() {
  try {
    const saved = localStorage.getItem('workoutPlans')
    return saved ? JSON.parse(saved) : INITIAL_PLANS
  } catch { return INITIAL_PLANS }
}

// ── BOARDS ─────────────────────────────────────────────────────────────────
const INITIAL_BOARDS = [
  { id:1, name:'Chest & Triceps', part:'chest', emoji:'🏋️', color:'#4f6cff', open:true, exercises:[
    { id:1, name:'Bench Press',           sets:4, reps:8,  weight:80, notes:'' },
    { id:2, name:'Incline Dumbbell Press',sets:3, reps:10, weight:28, notes:'slow eccentric' },
    { id:3, name:'Cable Fly',             sets:3, reps:12, weight:15, notes:'' },
    { id:4, name:'Tricep Pushdown',       sets:3, reps:12, weight:25, notes:'' },
  ]},
  { id:2, name:'Back & Biceps', part:'biceps', emoji:'💪', color:'#ff6bae', open:false, exercises:[
    { id:1, name:'Pull-ups',     sets:4, reps:8,  weight:0,  notes:'bodyweight' },
    { id:2, name:'Barbell Row',  sets:4, reps:8,  weight:70, notes:'' },
    { id:3, name:'Lat Pulldown', sets:3, reps:10, weight:60, notes:'' },
    { id:4, name:'Hammer Curl',  sets:3, reps:12, weight:18, notes:'' },
  ]},
  { id:3, name:'Leg Day', part:'quads', emoji:'🦵', color:'#ffd166', open:false, exercises:[
    { id:1, name:'Squat',             sets:5, reps:5,  weight:100, notes:'belt on 3+ sets' },
    { id:2, name:'Leg Press',         sets:4, reps:12, weight:160, notes:'' },
    { id:3, name:'Romanian Deadlift', sets:3, reps:10, weight:70,  notes:'' },
    { id:4, name:'Calf Raises',       sets:4, reps:20, weight:40,  notes:'' },
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

const PLAN_DAY_PARTS = {
  push:      ['chest', 'shoulders', 'triceps'],
  pull:      ['back', 'biceps'],
  legs:      ['quads', 'hamstrings', 'calves', 'glutes'],
  chest:     ['chest'],
  back:      ['back'],
  shoulders: ['shoulders'],
  arms:      ['biceps', 'triceps'],
  abs:       ['abs'],
  upper:     ['chest', 'shoulders', 'back', 'biceps', 'triceps'],
  lower:     ['quads', 'hamstrings', 'calves', 'glutes'],
  full:      ['chest', 'back', 'shoulders', 'biceps', 'triceps', 'abs', 'quads', 'hamstrings', 'calves', 'glutes'],
}

const WORKOUT_DAYS_BY_FREQ = {
  1: [0], 2: [0,3], 3: [0,2,4], 4: [0,1,3,4],
  5: [0,1,2,3,4], 6: [0,1,2,3,4,5], 7: [0,1,2,3,4,5,6],
}

function getPlanDayForDate(dateStr, plan) {
  if (!plan || !plan.schedule || !plan.schedule.length) return null
  const dowMon = (new Date(dateStr + 'T00:00:00').getDay() + 6) % 7
  const workoutDays = WORKOUT_DAYS_BY_FREQ[plan.daysPerWeek] || []
  const idx = workoutDays.indexOf(dowMon)
  if (idx === -1) return null
  return plan.schedule[idx % plan.schedule.length]
}


// ── COMPONENT ──────────────────────────────────────────────────────────────
export function WorkoutLog({ onComplete }) {
  // Plans state
  const [plans, setPlans]           = useState(loadPlans)
  const [activePlanId, setActivePlanId] = useState(null)
  const [selectedPlanId, setSelectedPlanId] = useState(() => {
    const saved = localStorage.getItem('selectedPlanId')
    return saved ? JSON.parse(saved) : null
  })
  const [showPlanModal, setShowPlanModal] = useState(false)
  const [planName,  setPlanName]  = useState('')
  const [planType,  setPlanType]  = useState('')
  const [planDur,   setPlanDur]   = useState('4 weeks')
  const [planDays,  setPlanDays]  = useState(3)
  const [planColor, setPlanColor] = useState(ACCENT_COLORS[0])
  const [planDesc,  setPlanDesc]  = useState('')
  const [nextPlanId, setNextPlanId] = useState(() => Math.max(...loadPlans().map(p => p.id), 2) + 1)

  // View: 'plans' | 'boards'
  const [view, setView] = useState('plans')

  // Boards state
  const [boards, setBoards]   = useState(loadBoards)
  const [nextId, setNextId]   = useState(() => Math.max(...loadBoards().map(b => b.id), 4) + 1)

  useEffect(() => {
    function onStorage() { setBoards(loadBoards()) }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const [completed, setCompleted] = useState(() => {
    try {
      const saved = localStorage.getItem('completedBoards')
      return saved ? new Set(JSON.parse(saved)) : new Set()
    } catch { return new Set() }
  })

  const [showBoardModal, setShowBoardModal] = useState(false)
  const [newName,  setNewName]  = useState('')
  const [newPart,  setNewPart]  = useState('chest')
  const [newEmoji, setNewEmoji] = useState('💪')
  const [newColor, setNewColor] = useState(ACCENT_COLORS[0])

  const [editTarget, setEditTarget] = useState(null)
  const [exName,   setExName]   = useState('')
  const [exSets,   setExSets]   = useState(3)
  const [exReps,   setExReps]   = useState(10)
  const [exWeight, setExWeight] = useState(0)
  const [exNotes,  setExNotes]  = useState('')
  const [quickInputs, setQuickInputs] = useState({})

  useEffect(() => { localStorage.setItem('workoutBoards', JSON.stringify(boards)) }, [boards])
  useEffect(() => { localStorage.setItem('completedBoards', JSON.stringify([...completed])) }, [completed])
  useEffect(() => { localStorage.setItem('workoutPlans', JSON.stringify(plans)) }, [plans])
  useEffect(() => { localStorage.setItem('selectedPlanId', JSON.stringify(selectedPlanId)) }, [selectedPlanId])

  // ── Plans helpers ──
  function savePlan() {
    if (!planName.trim()) return
    setPlans(prev => [...prev, {
      id: nextPlanId,
      name: planName.trim(),
      type: planType.trim() || 'Custom',
      duration: planDur.trim() || '4 weeks',
      daysPerWeek: +planDays,
      color: planColor,
      description: planDesc.trim(),
      schedule: [],
    }])
    setNextPlanId(n => n + 1)
    setShowPlanModal(false)
    setPlanName(''); setPlanType(''); setPlanDur('4 weeks')
    setPlanDays(3); setPlanDesc('')
  }

  function deletePlan(id, e) {
    e.stopPropagation()
    setPlans(prev => prev.filter(p => p.id !== id))
    if (activePlanId === id) setActivePlanId(null)
  }

  // ── Board helpers ──
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
    const b  = boards.find(b => b.id === boardId)
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
    const q    = quickInputs[boardId] || {}
    const name = (q.name || '').trim()
    if (!name) return
    const b     = boards.find(b => b.id === boardId)
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


  // ── RENDER ──
  return (
    <div className={styles.wrap}>
      <div className={styles.boardsPanel}>

        {/* Top bar */}
        <div className={styles.topbar}>
          <div>
            <h1 className={styles.topbarTitle}>WORKOUT LOG</h1>
            <div className={styles.dateLabel}>
              {new Date().toLocaleDateString('en-GB', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}
            </div>
          </div>
          {view === 'plans'
            ? <button className={styles.addBtn} onClick={() => setShowPlanModal(true)}>+ Add Plan</button>
            : <button className={styles.addBtn} onClick={openAddBoard}>+ Add Board</button>
          }
        </div>

        {/* View switcher */}
        <div className={styles.viewTabs}>
          <button
            className={`${styles.viewTab} ${view === 'plans' ? styles.viewTabActive : ''}`}
            onClick={() => setView('plans')}
          >
            Plans
          </button>
          <button
            className={`${styles.viewTab} ${view === 'boards' ? styles.viewTabActive : ''}`}
            onClick={() => setView('boards')}
          >
            My Boards
          </button>
        </div>

        {/* ── PLANS VIEW ── */}
        {view === 'plans' && (
          <div className={styles.boardsContainer}>
            {plans.map(plan => {
              const isOpen = activePlanId === plan.id
              return (
                <div key={plan.id} className={styles.planCard} style={{ borderColor: isOpen ? plan.color + '55' : undefined }}>
                  {/* Plan header */}
                  <div className={styles.planHeader} onClick={() => setActivePlanId(isOpen ? null : plan.id)}>
                    <div className={styles.planColorBar} style={{ background: plan.color }} />
                    <div className={styles.planTitleWrap}>
                      <div className={styles.planName}>{plan.name}</div>
                      <div className={styles.planMeta}>
                        <span className={styles.planTypeBadge} style={{ color: plan.color, borderColor: plan.color + '44' }}>
                          {plan.type}
                        </span>
                        <span className={styles.planDurBadge}>{plan.duration}</span>
                        <span className={styles.planDaysBadge}>{plan.daysPerWeek}x / week</span>
                      </div>
                    </div>
                    <button
                      className={`${styles.planCheckBtn} ${selectedPlanId === plan.id ? styles.planCheckBtnActive : ''}`}
                      style={selectedPlanId === plan.id ? { borderColor: plan.color, color: plan.color } : {}}
                      onClick={e => { e.stopPropagation(); setSelectedPlanId(id => id === plan.id ? null : plan.id) }}
                      title="Set as active plan"
                    >
                      {selectedPlanId === plan.id ? '✓' : '○'}
                    </button>
                    <button
                      className={styles.planDeleteBtn}
                      onClick={e => deletePlan(plan.id, e)}
                    >✕</button>
                    <span className={`${styles.toggle} ${isOpen ? styles.toggleOpen : ''}`}>▾</span>
                  </div>

                  {/* Plan detail */}
                  {isOpen && (
                    <div className={styles.planBody}>
                      {plan.description && (
                        <p className={styles.planDesc}>{plan.description}</p>
                      )}
                      <div className={styles.planSchedule}>
                        {plan.schedule.length === 0 && (
                          <div className={styles.planEmpty}>No schedule added yet.</div>
                        )}
                        {plan.schedule.map((block, i) => (
                          <div key={i} className={styles.planDay}>
                            <div className={styles.planDayHeader} style={{ color: plan.color }}>
                              {block.day}
                            </div>
                            <table className={styles.planTable}>
                              <thead>
                                <tr>
                                  <th>Exercise</th>
                                  <th>Sets</th>
                                  <th>Reps</th>
                                </tr>
                              </thead>
                              <tbody>
                                {block.exercises.map((ex, j) => (
                                  <tr key={j} className={styles.planExRow}>
                                    <td className={styles.planExName}>{ex.name}</td>
                                    <td className={styles.planExVal}>{ex.sets}</td>
                                    <td className={styles.planExVal}>{ex.reps}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}

            {plans.length === 0 && (
              <div className={styles.emptyState}>
                No workout plans yet. Tap <strong>+ Add Plan</strong> to create one.
              </div>
            )}
          </div>
        )}

        {/* ── BOARDS VIEW ── */}
        {view === 'boards' && (
          <div className={styles.boardsContainer}>
            {boards.map(b => {
              const vol = boardVol(b)
              const mv  = maxVol(b)
              const q   = quickInputs[b.id] || {}
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
                          <tr><th>Exercise</th><th>Sets×Reps</th><th>Weight</th><th>Effort</th><th/></tr>
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
                        <input type="number" placeholder="sets" value={q.sets||3}  onChange={e => setQ(b.id,'sets',e.target.value)} className={styles.qaNum}/>
                        <input type="number" placeholder="reps" value={q.reps||10} onChange={e => setQ(b.id,'reps',e.target.value)} className={styles.qaNum}/>
                        <input type="number" placeholder="kg"   value={q.wt||0}    onChange={e => setQ(b.id,'wt',e.target.value)}   className={styles.qaNum}/>
                        <button className={styles.qaBtn} onClick={() => quickAdd(b.id)}>+ Add</button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── ADD PLAN MODAL ── */}
      {showPlanModal && (
        <div className={styles.modalBackdrop} onClick={() => setShowPlanModal(false)}>
          <div className={styles.modalBox} onClick={e => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>New Workout Plan</h3>
            <label className={styles.label}>Plan Name</label>
            <input className={styles.input} value={planName} onChange={e => setPlanName(e.target.value)} placeholder="e.g. PPL Program"/>
            <label className={styles.label}>Type</label>
            <input className={styles.input} value={planType} onChange={e => setPlanType(e.target.value)} placeholder="e.g. Push Pull Legs"/>
            <div className={styles.modalRow}>
              <div>
                <label className={styles.label}>Duration</label>
                <input className={styles.input} value={planDur} onChange={e => setPlanDur(e.target.value)} placeholder="e.g. 4 weeks"/>
              </div>
              <div>
                <label className={styles.label}>Days / week</label>
                <input className={styles.input} type="number" min="1" max="7" value={planDays} onChange={e => setPlanDays(e.target.value)}/>
              </div>
            </div>
            <label className={styles.label}>Description</label>
            <input className={styles.input} value={planDesc} onChange={e => setPlanDesc(e.target.value)} placeholder="Optional description…"/>
            <label className={styles.label}>Accent Color</label>
            <div className={styles.colorRow}>
              {ACCENT_COLORS.map(c => (
                <div key={c} className={`${styles.swatch} ${c===planColor ? styles.swatchSel : ''}`}
                  style={{ background: c }} onClick={() => setPlanColor(c)}/>
              ))}
            </div>
            <div className={styles.modalBtns}>
              <button className={styles.btnSave} onClick={savePlan}>Create Plan</button>
              <button className={styles.btnCancel} onClick={() => setShowPlanModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ── ADD BOARD MODAL ── */}
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

      {/* ── EDIT EXERCISE MODAL ── */}
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
