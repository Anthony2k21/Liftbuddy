import { useState, useEffect, useMemo, useRef } from 'react'
import styles from './WorkoutLog.module.css'
import { getWorkoutPlans, createWorkoutPlan, updateWorkoutPlan, deleteWorkoutPlan, getSelectedPlanId, saveSelectedPlanId, saveWeekAssignment } from '../lib/db'
import { useWorkoutHistory } from '../hooks/useWorkoutHistory'

const ACCENT_COLORS = [
  '#4f6cff','#00e5c8','#a56bff','#ff6bae',
  '#ffd166','#ff9f40','#ff6b6b','#43e97b','#00e5ff'
]

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
        { name: 'Bench Press',      sets: 4, reps: '6–8'   },
        { name: 'Overhead Press',   sets: 3, reps: '8–10'  },
        { name: 'Incline DB Press', sets: 3, reps: '10–12' },
        { name: 'Lateral Raise',    sets: 3, reps: '15'    },
        { name: 'Tricep Pushdown',  sets: 3, reps: '12'    },
      ]},
      { day: 'Pull', exercises: [
        { name: 'Deadlift',         sets: 3, reps: '5'     },
        { name: 'Pull-ups',         sets: 4, reps: '6–8'   },
        { name: 'Barbell Row',      sets: 3, reps: '8–10'  },
        { name: 'Face Pulls',       sets: 3, reps: '15'    },
        { name: 'Hammer Curl',      sets: 3, reps: '12'    },
      ]},
      { day: 'Legs', exercises: [
        { name: 'Squat',            sets: 4, reps: '6–8'   },
        { name: 'Leg Press',        sets: 3, reps: '10–12' },
        { name: 'Romanian Deadlift',sets: 3, reps: '10'    },
        { name: 'Leg Curl',         sets: 3, reps: '12'    },
        { name: 'Calf Raises',      sets: 4, reps: '20'    },
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

const AI_PLAN_PROMPT = `You are a fitness plan generator. The user will describe the workout plan they want.
Output ONLY a JSON object wrapped in <PLAN>...</PLAN> tags with this exact schema — no other text:
<PLAN>{
  "name": "Plan Name",
  "type": "Plan Type (e.g. Push Pull Legs, Strength, Hypertrophy, Full Body, Custom)",
  "duration": "X weeks",
  "daysPerWeek": 3,
  "color": "#4f6cff",
  "description": "Brief description of the plan.",
  "schedule": [
    {
      "day": "Day label (e.g. Push, Pull, Legs, Monday, Workout A)",
      "exercises": [
        { "name": "Exercise Name", "sets": 3, "reps": "8-10" }
      ]
    }
  ]
}</PLAN>
Pick a color from: #4f6cff #00e5c8 #a56bff #ff6bae #ffd166 #ff9f40 #ff6b6b #43e97b #00e5ff
Include a complete, realistic schedule with proper exercises. Output ONLY the <PLAN> block.`

const DOW_LABELS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']
const FREQ_MAP = { 1:[0],2:[0,3],3:[0,2,4],4:[0,1,3,4],5:[0,1,2,3,4],6:[0,1,2,3,4,5],7:[0,1,2,3,4,5,6] }

function getBlockForDow(plan, dow) {
  if (!plan?.schedule?.length) return null
  const wa = plan.weekAssignment
  if (wa) {
    const idx = wa[dow]
    return idx != null ? (plan.schedule[idx] ?? null) : null
  }
  const days = FREQ_MAP[plan.daysPerWeek] || []
  const i = days.indexOf(dow)
  return i !== -1 ? plan.schedule[i % plan.schedule.length] : null
}

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

function weekNumber() {
  const now = new Date()
  const start = new Date(now.getFullYear(), 0, 1)
  return Math.ceil(((now - start) / 86400000 + start.getDay() + 1) / 7)
}

export function WorkoutLog({ userId }) {
  const [plans, setPlans]               = useState([])
  const [selectedPlanId, setSelectedPlanId] = useState(null)
  const [openMenuId, setOpenMenuId]     = useState(null)

  // Modals
  const [showPlanModal, setShowPlanModal] = useState(false)
  const [planName,  setPlanName]  = useState('')
  const [planType,  setPlanType]  = useState('')
  const [planDur,   setPlanDur]   = useState('4 weeks')
  const [planDays,  setPlanDays]  = useState(3)
  const [planColor, setPlanColor] = useState(ACCENT_COLORS[0])
  const [planDesc,  setPlanDesc]  = useState('')

  const [showAiModal, setShowAiModal] = useState(false)
  const [aiPrompt,  setAiPrompt]  = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError,   setAiError]   = useState('')

  // Schedule editor
  const [editingPlan,   setEditingPlan]   = useState(null)
  const [editSchedule,  setEditSchedule]  = useState([])
  const [schedSaving,   setSchedSaving]   = useState(false)

  const { history } = useWorkoutHistory(userId)

  useEffect(() => {
    if (!userId) return
    getWorkoutPlans(userId).then(async data => {
      if (data.length > 0) {
        setPlans(data)
      } else {
        const seeded = await Promise.all(INITIAL_PLANS.map(p => createWorkoutPlan(userId, p)))
        setPlans(seeded.filter(Boolean))
      }
    })
    getSelectedPlanId(userId).then(setSelectedPlanId)
  }, [userId])

  useEffect(() => {
    if (!userId || selectedPlanId === null) return
    saveSelectedPlanId(userId, selectedPlanId)
  }, [selectedPlanId, userId])

  // Derived data
  const activePlan = useMemo(() => plans.find(p => p.id === selectedPlanId) || null, [plans, selectedPlanId])
  const savedPlans = useMemo(() => plans.filter(p => p.id !== selectedPlanId), [plans, selectedPlanId])

  const loggedDates = useMemo(() => new Set(history.map(h => h.date).filter(Boolean)), [history])

  const today = new Date()
  const todayDow = (today.getDay() + 6) % 7

  const weekGrid = useMemo(() => {
    const t = today
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(t)
      d.setDate(t.getDate() - todayDow + i)
      const ds = d.toISOString().slice(0, 10)
      const block = activePlan ? getBlockForDow(activePlan, i) : null
      return {
        dow:     DOW_LABELS[i],
        dateStr: ds,
        block,
        isToday: ds === todayStr(),
        isDone:  ds < todayStr() && loggedDates.has(ds),
      }
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePlan, loggedDates])

  const trainingDaysThisWeek = weekGrid.filter(d => d.block !== null).length

  // Drag-to-swap on the week grid
  const dragDowRef = useRef(null)
  const [dragOverDow, setDragOverDow] = useState(null)
  const [pendingSwap, setPendingSwap] = useState(null) // { from, to }

  function buildDefaultAssignment(plan) {
    const days = FREQ_MAP[plan.daysPerWeek] || []
    const wa = {}
    for (let d = 0; d < 7; d++) {
      const i = days.indexOf(d)
      wa[d] = i !== -1 ? i % plan.schedule.length : null
    }
    return wa
  }

  function requestSwap(fromDow, toDow) {
    if (!activePlan || fromDow == null || toDow == null || fromDow === toDow) return
    setPendingSwap({ from: fromDow, to: toDow })
  }

  function confirmSwap() {
    if (!pendingSwap || !activePlan) return
    const { from, to } = pendingSwap
    const wa = activePlan.weekAssignment ?? buildDefaultAssignment(activePlan)
    const next = { ...wa }
    const tmp = next[from]; next[from] = next[to]; next[to] = tmp
    setPlans(prev => prev.map(p => p.id === activePlan.id ? { ...p, weekAssignment: next } : p))
    saveWeekAssignment(userId, activePlan.id, next)
    window.dispatchEvent(new Event('storage'))
    setPendingSwap(null)
  }
  const doneThisWeek = weekGrid.filter(d => d.isDone && d.block !== null).length
  const weekPct = trainingDaysThisWeek > 0 ? Math.round(doneThisWeek / trainingDaysThisWeek * 100) : 0

  const dateLabel = today.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }).toUpperCase()

  // ── Handlers ──────────────────────────────────────────────────────────────
  async function savePlan() {
    if (!planName.trim()) return
    const created = await createWorkoutPlan(userId, {
      name: planName.trim(), type: planType.trim() || 'Custom',
      duration: planDur.trim() || '4 weeks', daysPerWeek: +planDays,
      color: planColor, description: planDesc.trim(), schedule: [],
    })
    if (created) setPlans(prev => [...prev, created])
    setShowPlanModal(false)
    setPlanName(''); setPlanType(''); setPlanDur('4 weeks'); setPlanDays(3); setPlanDesc('')
  }

  async function deletePlan(id) {
    await deleteWorkoutPlan(userId, id)
    setPlans(prev => prev.filter(p => p.id !== id))
    if (selectedPlanId === id) setSelectedPlanId(null)
    setOpenMenuId(null)
  }

  async function generateAiPlan() {
    const text = aiPrompt.trim()
    if (!text || aiLoading) return
    setAiLoading(true); setAiError('')
    try {
      const res  = await fetch('/api/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [
          { role: 'user',  parts: [{ text: AI_PLAN_PROMPT }] },
          { role: 'model', parts: [{ text: 'Ready. Describe the plan.' }] },
          { role: 'user',  parts: [{ text }] },
        ]}),
      })
      const data  = await res.json()
      const raw   = (data.candidates?.[0]?.content?.parts ?? []).map(p => p.text || '').join('')
      const match = raw.match(/<PLAN>([\s\S]*?)<\/PLAN>/)
      if (!match) throw new Error('No plan returned. Try describing it differently.')
      const plan    = JSON.parse(match[1])
      const created = await createWorkoutPlan(userId, plan)
      if (created) { setPlans(prev => [...prev, created]); setSelectedPlanId(created.id) }
      setShowAiModal(false); setAiPrompt('')
    } catch (err) {
      setAiError(err.message || 'Something went wrong.')
    } finally { setAiLoading(false) }
  }

  function openScheduleEditor(plan) {
    setEditingPlan(plan)
    setEditSchedule(plan.schedule.map(b => ({ day: b.day, exercises: b.exercises.map(ex => ({ ...ex })) })))
    setOpenMenuId(null)
  }

  async function saveSchedule() {
    if (!editingPlan) return
    setSchedSaving(true)
    const ok = await updateWorkoutPlan(userId, editingPlan.id, { schedule: editSchedule })
    if (ok) {
      setPlans(prev => prev.map(p => p.id === editingPlan.id ? { ...p, schedule: editSchedule } : p))
      setEditingPlan(null)
    }
    setSchedSaving(false)
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className={styles.wrap}>

      {/* HEADER */}
      <div className={styles.header}>
        <div className={styles.headerTop}>
          <div>
            <h1 className={styles.title}>WORKOUT PLANS</h1>
            <p className={styles.dateLabel}>{dateLabel}</p>
          </div>
          <div className={styles.actions}>
            <button className={styles.btn} onClick={() => setShowPlanModal(true)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              NEW PLAN
            </button>
            <button className={styles.btnAi} onClick={() => setShowAiModal(true)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2l1.5 4.5L18 8l-4.5 1.5L12 14l-1.5-4.5L6 8l4.5-1.5z"/><path d="M19 14l.8 2.4L22 17l-2.2.6L19 20l-.8-2.4L16 17l2.2-.6z"/></svg>
              AI PLAN
            </button>
          </div>
        </div>
      </div>

      {/* CONTENT */}
      <div className={styles.content}>

        {/* ACTIVE PLAN */}
        {activePlan ? (
          <>
            <div className={styles.sectionLabel}>
              <span>ACTIVE PLAN</span>
              <span>WEEK {weekNumber()}</span>
            </div>

            <div className={styles.activeCard}>
              {/* Left accent bar */}
              <div className={styles.activeBar} />

              {/* Hero */}
              <div className={styles.activeHero}>
                <div className={styles.activeStatus}>
                  <span className={styles.activePill}>ACTIVE</span>
                  <div className={styles.activeIcons}>
                    <button className={styles.iconBtn} onClick={() => openScheduleEditor(activePlan)} title="Edit schedule">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                    <button className={styles.iconBtn} onClick={() => setOpenMenuId(openMenuId === activePlan.id ? null : activePlan.id)} title="More options">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="5" r="1" fill="currentColor"/><circle cx="12" cy="12" r="1" fill="currentColor"/><circle cx="12" cy="19" r="1" fill="currentColor"/></svg>
                    </button>
                    {openMenuId === activePlan.id && (
                      <div className={styles.dropMenu}>
                        <button className={styles.dropItem} onClick={() => { setSelectedPlanId(null); setOpenMenuId(null) }}>Deactivate</button>
                        <button className={`${styles.dropItem} ${styles.dropItemDanger}`} onClick={() => deletePlan(activePlan.id)}>Delete</button>
                      </div>
                    )}
                  </div>
                </div>

                <div className={styles.activeName}>{activePlan.name}</div>
                <div className={styles.activeMeta}>
                  <span className={styles.metaTag}>{activePlan.type?.toUpperCase()}</span>
                  <span className={styles.metaTag}>{activePlan.duration?.toUpperCase()}</span>
                  <span className={styles.metaTag}>{activePlan.daysPerWeek}× / WEEK</span>
                </div>
              </div>

              {/* Weekly schedule grid */}
              <div className={styles.scheduleSection}>
                <div className={styles.scheduleHeader}>
                  <span className={styles.scheduleTitle}>THIS WEEK</span>
                  <span className={styles.scheduleWeek}>{today.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }).toUpperCase()}</span>
                </div>
                <div className={styles.scheduleGrid}>
                  {weekGrid.map(({ dow, block, isToday, isDone }, i) => {
                    const isOver = dragOverDow === i
                    return (
                      <div
                        key={dow}
                        className={`${styles.day} ${isToday ? styles.dayToday : isDone ? styles.dayDone : ''} ${isOver ? styles.dayDragOver : ''}`}
                        draggable
                        onDragStart={e => { dragDowRef.current = i; e.dataTransfer.effectAllowed = 'move' }}
                        onDragOver={e => { e.preventDefault(); setDragOverDow(i) }}
                        onDrop={() => { requestSwap(dragDowRef.current, i); dragDowRef.current = null; setDragOverDow(null) }}
                        onDragEnd={() => { dragDowRef.current = null; setDragOverDow(null) }}
                        onTouchStart={() => { dragDowRef.current = i }}
                        onTouchMove={e => {
                          e.preventDefault()
                          const t = e.touches[0]
                          const el = document.elementFromPoint(t.clientX, t.clientY)
                          const cell = el?.closest('[data-gridcell]')
                          if (cell) setDragOverDow(Number(cell.dataset.gridcell))
                        }}
                        onTouchEnd={() => {
                          requestSwap(dragDowRef.current, dragOverDow)
                          dragDowRef.current = null; setDragOverDow(null)
                        }}
                        data-gridcell={i}
                        style={{ touchAction: 'none', cursor: 'grab' }}
                      >
                        <div className={styles.dayLabel}>{dow}</div>
                        <div className={`${styles.dayName} ${!block ? styles.dayRest : ''}`}>
                          {block ? block.day.toUpperCase().slice(0, 4) : 'REST'}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Progress */}
              <div className={styles.progressSection}>
                <div className={styles.progressRow}>
                  <span className={styles.progressLabel}>THIS WEEK</span>
                  <span className={styles.progressValue}>{doneThisWeek} / {trainingDaysThisWeek} SESSIONS · {weekPct}%</span>
                </div>
                <div className={styles.progressBar}>
                  <div className={styles.progressFill} style={{ width: `${weekPct}%` }} />
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className={styles.noActivePlan}>
            No active plan. Activate one below or create a new plan.
          </div>
        )}

        {/* SAVED PLANS */}
        {savedPlans.length > 0 && (
          <>
            <div className={styles.sectionLabel}>
              <span>SAVED</span>
              <span>{savedPlans.length} {savedPlans.length === 1 ? 'PLAN' : 'PLANS'}</span>
            </div>
            <div className={styles.savedList}>
              {savedPlans.map(plan => (
                <div key={plan.id} className={styles.savedRow}>
                  <div className={styles.savedRowMain}>
                    <div className={styles.savedName}>{plan.name}</div>
                    <div className={styles.savedMeta}>
                      <span className={styles.savedTag}>{plan.type?.toUpperCase()}</span>
                      <span className={styles.savedTag}>{plan.duration?.toUpperCase()}</span>
                      <span className={styles.savedTag}>{plan.daysPerWeek}× / WEEK</span>
                    </div>
                  </div>
                  <div className={styles.savedActions}>
                    <button className={styles.activateBtn} onClick={() => setSelectedPlanId(plan.id)}>ACTIVATE</button>
                    <div className={styles.menuWrap}>
                      <button className={styles.iconBtn} onClick={() => setOpenMenuId(openMenuId === plan.id ? null : plan.id)}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="5" r="1" fill="currentColor"/><circle cx="12" cy="12" r="1" fill="currentColor"/><circle cx="12" cy="19" r="1" fill="currentColor"/></svg>
                      </button>
                      {openMenuId === plan.id && (
                        <div className={styles.dropMenu}>
                          <button className={styles.dropItem} onClick={() => openScheduleEditor(plan)}>Edit schedule</button>
                          <button className={`${styles.dropItem} ${styles.dropItemDanger}`} onClick={() => deletePlan(plan.id)}>Delete</button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {plans.length === 0 && (
          <div className={styles.emptyState}>
            No plans yet. Tap <strong>NEW PLAN</strong> to create one or use <strong>AI PLAN</strong>.
          </div>
        )}
      </div>

      {/* click-away overlay for menus */}
      {openMenuId && <div className={styles.menuOverlay} onClick={() => setOpenMenuId(null)} />}

      {/* ── SCHEDULE EDITOR MODAL ── */}
      {editingPlan && (
        <div className={styles.modalBackdrop} onClick={() => !schedSaving && setEditingPlan(null)}>
          <div className={`${styles.modalBox} ${styles.scheduleModal}`} onClick={e => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>EDIT SCHEDULE</h3>
            <p className={styles.modalSub}>{editingPlan.name}</p>
            <div className={styles.scheduleEditor}>
              {editSchedule.map((block, dayIdx) => (
                <div key={dayIdx} className={styles.schedDay}>
                  <div className={styles.schedDayHeader}>
                    <input className={`${styles.input} ${styles.schedDayInput}`} value={block.day} onChange={e => setEditSchedule(prev => prev.map((b, i) => i === dayIdx ? { ...b, day: e.target.value } : b))} placeholder="Day label"/>
                    <button className={styles.schedRemove} onClick={() => setEditSchedule(prev => prev.filter((_, i) => i !== dayIdx))}>✕</button>
                  </div>
                  {block.exercises.map((ex, exIdx) => (
                    <div key={exIdx} className={styles.schedExRow}>
                      <input className={`${styles.input} ${styles.schedExName}`} value={ex.name} onChange={e => setEditSchedule(prev => prev.map((b, i) => i !== dayIdx ? b : { ...b, exercises: b.exercises.map((x, j) => j === exIdx ? { ...x, name: e.target.value } : x) }))} placeholder="Exercise"/>
                      <input className={`${styles.input} ${styles.schedExSmall}`} type="number" min="1" value={ex.sets} onChange={e => setEditSchedule(prev => prev.map((b, i) => i !== dayIdx ? b : { ...b, exercises: b.exercises.map((x, j) => j === exIdx ? { ...x, sets: Number(e.target.value) } : x) }))} placeholder="Sets"/>
                      <input className={`${styles.input} ${styles.schedExSmall}`} value={ex.reps} onChange={e => setEditSchedule(prev => prev.map((b, i) => i !== dayIdx ? b : { ...b, exercises: b.exercises.map((x, j) => j === exIdx ? { ...x, reps: e.target.value } : x) }))} placeholder="Reps"/>
                      <button className={styles.schedRemove} onClick={() => setEditSchedule(prev => prev.map((b, i) => i !== dayIdx ? b : { ...b, exercises: b.exercises.filter((_, j) => j !== exIdx) }))}>✕</button>
                    </div>
                  ))}
                  <button className={styles.schedAddEx} onClick={() => setEditSchedule(prev => prev.map((b, i) => i !== dayIdx ? b : { ...b, exercises: [...b.exercises, { name: '', sets: 3, reps: '8-10' }] }))}>+ Add Exercise</button>
                </div>
              ))}
              <button className={styles.schedAddDay} onClick={() => setEditSchedule(prev => [...prev, { day: `Day ${prev.length + 1}`, exercises: [] }])}>+ Add Day</button>
            </div>
            <div className={styles.modalBtns}>
              <button className={styles.btnSave} onClick={saveSchedule} disabled={schedSaving}>{schedSaving ? 'Saving…' : 'Save'}</button>
              <button className={styles.btnCancel} onClick={() => setEditingPlan(null)} disabled={schedSaving}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ── AI PLAN MODAL ── */}
      {showAiModal && (
        <div className={styles.modalBackdrop} onClick={() => { setShowAiModal(false); setAiError('') }}>
          <div className={styles.modalBox} onClick={e => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>AI PLAN GENERATOR</h3>
            <label className={styles.label}>Describe your plan</label>
            <textarea className={styles.aiTextarea} value={aiPrompt} onChange={e => setAiPrompt(e.target.value)} placeholder="e.g. A 4-day upper/lower split for building strength over 8 weeks, intermediate level" rows={4} onKeyDown={e => { if (e.key === 'Enter' && e.metaKey) generateAiPlan() }}/>
            {aiError && <div className={styles.aiError}>{aiError}</div>}
            <div className={styles.modalBtns}>
              <button className={styles.btnSave} onClick={generateAiPlan} disabled={aiLoading}>{aiLoading ? 'Generating…' : 'Generate'}</button>
              <button className={styles.btnCancel} onClick={() => { setShowAiModal(false); setAiError('') }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ── NEW PLAN MODAL ── */}
      {showPlanModal && (
        <div className={styles.modalBackdrop} onClick={() => setShowPlanModal(false)}>
          <div className={styles.modalBox} onClick={e => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>NEW WORKOUT PLAN</h3>
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
            <input className={styles.input} value={planDesc} onChange={e => setPlanDesc(e.target.value)} placeholder="Optional…"/>
            <label className={styles.label}>Accent Color</label>
            <div className={styles.colorRow}>
              {ACCENT_COLORS.map(c => (
                <div key={c} className={`${styles.swatch} ${c === planColor ? styles.swatchSel : ''}`} style={{ background: c }} onClick={() => setPlanColor(c)}/>
              ))}
            </div>
            <div className={styles.modalBtns}>
              <button className={styles.btnSave} onClick={savePlan}>Create Plan</button>
              <button className={styles.btnCancel} onClick={() => setShowPlanModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ── SWAP CONFIRMATION ── */}
      {pendingSwap && activePlan && (() => {
        const wa = activePlan.weekAssignment ?? buildDefaultAssignment(activePlan)
        const fromBlock = wa[pendingSwap.from] != null ? activePlan.schedule[wa[pendingSwap.from]] : null
        const toBlock   = wa[pendingSwap.to]   != null ? activePlan.schedule[wa[pendingSwap.to]]   : null
        const fromDay = DOW_LABELS[pendingSwap.from]
        const toDay   = DOW_LABELS[pendingSwap.to]
        return (
          <div className={styles.modalBackdrop} onClick={() => setPendingSwap(null)}>
            <div className={styles.modalBox} onClick={e => e.stopPropagation()}>
              <h3 className={styles.modalTitle}>CONFIRM SWAP</h3>
              <p className={styles.swapDesc}>
                <span className={styles.swapPill}>{fromDay} · {fromBlock ? fromBlock.day.toUpperCase() : 'REST'}</span>
                <span className={styles.swapArrow}>⇄</span>
                <span className={styles.swapPill}>{toDay} · {toBlock ? toBlock.day.toUpperCase() : 'REST'}</span>
              </p>
              <p className={styles.swapNote}>This will update your schedule in the database.</p>
              <div className={styles.modalBtns}>
                <button className={styles.btnSave} onClick={confirmSwap}>Confirm</button>
                <button className={styles.btnCancel} onClick={() => setPendingSwap(null)}>Cancel</button>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
