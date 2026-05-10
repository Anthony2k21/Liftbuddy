import { useState, useEffect } from 'react'
import styles from './WorkoutLog.module.css'
import { getWorkoutPlans, createWorkoutPlan, updateWorkoutPlan, deleteWorkoutPlan, getSelectedPlanId, saveSelectedPlanId } from '../lib/db'

const ACCENT_COLORS = [
  '#4f6cff','#00e5c8','#a56bff','#ff6bae',
  '#ffd166','#ff9f40','#ff6b6b','#43e97b','#00e5ff'
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

// ── COMPONENT ──────────────────────────────────────────────────────────────
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

export function WorkoutLog({ userId }) {
  const [plans, setPlans]               = useState([])
  const [activePlanId, setActivePlanId] = useState(null)
  const [selectedPlanId, setSelectedPlanId] = useState(null)
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
  const [editingPlan, setEditingPlan] = useState(null) // plan object being edited
  const [editSchedule, setEditSchedule] = useState([]) // draft schedule
  const [schedSaving, setSchedSaving] = useState(false)

  // Load plans and selected plan from Supabase on mount
  // If user has no plans yet, seed the defaults into Supabase so IDs are real
  useEffect(() => {
    if (!userId) return
    getWorkoutPlans(userId).then(async data => {
      if (data.length > 0) {
        setPlans(data)
      } else {
        // Seed initial plans into Supabase
        const seeded = await Promise.all(
          INITIAL_PLANS.map(p => createWorkoutPlan(userId, p))
        )
        setPlans(seeded.filter(Boolean))
      }
    })
    getSelectedPlanId(userId).then(setSelectedPlanId)
  }, [userId])

  // Persist selected plan (localStorage, scoped by userId)
  useEffect(() => {
    if (!userId || selectedPlanId === null) return
    saveSelectedPlanId(userId, selectedPlanId)
  }, [selectedPlanId, userId])

  async function savePlan() {
    if (!planName.trim()) return
    const newPlan = {
      name: planName.trim(),
      type: planType.trim() || 'Custom',
      duration: planDur.trim() || '4 weeks',
      daysPerWeek: +planDays,
      color: planColor,
      description: planDesc.trim(),
      schedule: [],
    }
    const created = await createWorkoutPlan(userId, newPlan)
    if (created) setPlans(prev => [...prev, created])
    setShowPlanModal(false)
    setPlanName(''); setPlanType(''); setPlanDur('4 weeks')
    setPlanDays(3); setPlanDesc('')
  }

  async function deletePlan(id, e) {
    e.stopPropagation()
    await deleteWorkoutPlan(userId, id)
    setPlans(prev => prev.filter(p => p.id !== id))
    if (activePlanId === id) setActivePlanId(null)
    if (selectedPlanId === id) setSelectedPlanId(null)
  }

  async function generateAiPlan() {
    const text = aiPrompt.trim()
    if (!text || aiLoading) return
    setAiLoading(true)
    setAiError('')
    try {
      const contents = [
        { role: 'user',  parts: [{ text: AI_PLAN_PROMPT }] },
        { role: 'model', parts: [{ text: 'Ready. Describe the plan.' }] },
        { role: 'user',  parts: [{ text }] },
      ]
      const res  = await fetch('/api/chat', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ contents }),
      })
      const data = await res.json()
      const parts = data.candidates?.[0]?.content?.parts ?? []
      const raw   = parts.map(p => p.text || '').join('')
      const match = raw.match(/<PLAN>([\s\S]*?)<\/PLAN>/)
      if (!match) throw new Error('No plan returned. Try describing it differently.')
      const plan = JSON.parse(match[1])
      const created = await createWorkoutPlan(userId, plan)
      if (created) {
        setPlans(prev => [...prev, created])
        setActivePlanId(created.id)
      }
      setShowAiModal(false)
      setAiPrompt('')
    } catch (err) {
      setAiError(err.message || 'Something went wrong. Try again.')
    } finally {
      setAiLoading(false)
    }
  }

  // ── SCHEDULE EDITOR ────────────────────────────────────────────────────────

  function openScheduleEditor(plan, e) {
    e.stopPropagation()
    setEditingPlan(plan)
    setEditSchedule(plan.schedule.map(block => ({
      day: block.day,
      exercises: block.exercises.map(ex => ({ ...ex })),
    })))
  }

  function updateDayLabel(dayIdx, value) {
    setEditSchedule(prev => prev.map((b, i) => i === dayIdx ? { ...b, day: value } : b))
  }

  function updateExField(dayIdx, exIdx, field, value) {
    setEditSchedule(prev => prev.map((b, i) =>
      i !== dayIdx ? b : {
        ...b,
        exercises: b.exercises.map((ex, j) => j === exIdx ? { ...ex, [field]: value } : ex),
      }
    ))
  }

  function addExercise(dayIdx) {
    setEditSchedule(prev => prev.map((b, i) =>
      i !== dayIdx ? b : {
        ...b,
        exercises: [...b.exercises, { name: '', sets: 3, reps: '8-10' }],
      }
    ))
  }

  function removeExercise(dayIdx, exIdx) {
    setEditSchedule(prev => prev.map((b, i) =>
      i !== dayIdx ? b : {
        ...b,
        exercises: b.exercises.filter((_, j) => j !== exIdx),
      }
    ))
  }

  function addDay() {
    setEditSchedule(prev => [...prev, { day: `Day ${prev.length + 1}`, exercises: [] }])
  }

  function removeDay(dayIdx) {
    setEditSchedule(prev => prev.filter((_, i) => i !== dayIdx))
  }

  async function saveSchedule() {
    if (!editingPlan) return
    setSchedSaving(true)
    const ok = await updateWorkoutPlan(userId, editingPlan.id, { schedule: editSchedule })
    if (ok) {
      setPlans(prev => prev.map(p =>
        p.id === editingPlan.id ? { ...p, schedule: editSchedule } : p
      ))
      setEditingPlan(null)
    }
    setSchedSaving(false)
  }

  // ── RENDER ──
  return (
    <div className={styles.wrap}>
      <div className={styles.boardsPanel}>

        {/* Top bar */}
        <div className={styles.topbar}>
          <div>
            <h1 className={styles.topbarTitle}>WORKOUT PLANS</h1>
            <div className={styles.dateLabel}>
              {new Date().toLocaleDateString('en-GB', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}
            </div>
          </div>
          <div className={styles.topbarBtns}>
            <button className={styles.addBtnAi} onClick={() => setShowAiModal(true)}>✨ AI Plan</button>
            <button className={styles.addBtn} onClick={() => setShowPlanModal(true)}>+ Add Plan</button>
          </div>
        </div>

        {/* Plans list */}
        <div className={styles.boardsContainer}>
          {plans.map(plan => {
            const isOpen = activePlanId === plan.id
            return (
              <div key={plan.id} className={styles.planCard} style={{ borderColor: isOpen ? plan.color + '55' : undefined }}>
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
                  <button className={styles.planEditBtn} onClick={e => openScheduleEditor(plan, e)} title="Edit schedule">✎</button>
                  <button className={styles.planDeleteBtn} onClick={e => deletePlan(plan.id, e)}>✕</button>
                  <span className={`${styles.toggle} ${isOpen ? styles.toggleOpen : ''}`}>▾</span>
                </div>

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
              No workout plans yet. Tap <strong>+ Add Plan</strong> to create one,<br />or ask the AI assistant to generate a program for you.
            </div>
          )}
        </div>
      </div>

      {/* ── SCHEDULE EDITOR MODAL ── */}
      {editingPlan && (
        <div className={styles.modalBackdrop} onClick={() => !schedSaving && setEditingPlan(null)}>
          <div className={`${styles.modalBox} ${styles.scheduleModal}`} onClick={e => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>Edit Schedule · {editingPlan.name}</h3>

            <div className={styles.scheduleEditor}>
              {editSchedule.map((block, dayIdx) => (
                <div key={dayIdx} className={styles.schedDay}>
                  <div className={styles.schedDayHeader}>
                    <input
                      className={`${styles.input} ${styles.schedDayInput}`}
                      value={block.day}
                      onChange={e => updateDayLabel(dayIdx, e.target.value)}
                      placeholder="Day label (e.g. Push)"
                    />
                    <button className={styles.schedRemoveDay} onClick={() => removeDay(dayIdx)}>✕</button>
                  </div>

                  {block.exercises.map((ex, exIdx) => (
                    <div key={exIdx} className={styles.schedExRow}>
                      <input
                        className={`${styles.input} ${styles.schedExName}`}
                        value={ex.name}
                        onChange={e => updateExField(dayIdx, exIdx, 'name', e.target.value)}
                        placeholder="Exercise name"
                      />
                      <input
                        className={`${styles.input} ${styles.schedExSmall}`}
                        type="number"
                        min="1"
                        value={ex.sets}
                        onChange={e => updateExField(dayIdx, exIdx, 'sets', Number(e.target.value))}
                        placeholder="Sets"
                      />
                      <input
                        className={`${styles.input} ${styles.schedExSmall}`}
                        value={ex.reps}
                        onChange={e => updateExField(dayIdx, exIdx, 'reps', e.target.value)}
                        placeholder="Reps"
                      />
                      <button className={styles.schedRemoveEx} onClick={() => removeExercise(dayIdx, exIdx)}>✕</button>
                    </div>
                  ))}

                  <button className={styles.schedAddEx} onClick={() => addExercise(dayIdx)}>
                    + Add Exercise
                  </button>
                </div>
              ))}

              <button className={styles.schedAddDay} onClick={addDay}>
                + Add Day
              </button>
            </div>

            <div className={styles.modalBtns}>
              <button className={styles.btnSave} onClick={saveSchedule} disabled={schedSaving}>
                {schedSaving ? 'Saving…' : 'Save Schedule'}
              </button>
              <button className={styles.btnCancel} onClick={() => setEditingPlan(null)} disabled={schedSaving}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── AI PLAN MODAL ── */}
      {showAiModal && (
        <div className={styles.modalBackdrop} onClick={() => { setShowAiModal(false); setAiError('') }}>
          <div className={styles.modalBox} onClick={e => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>✨ AI Plan Generator</h3>
            <label className={styles.label}>Describe your plan</label>
            <textarea
              className={styles.aiTextarea}
              value={aiPrompt}
              onChange={e => setAiPrompt(e.target.value)}
              placeholder="e.g. A 4-day upper/lower split for building strength over 8 weeks, intermediate level"
              rows={4}
              onKeyDown={e => { if (e.key === 'Enter' && e.metaKey) generateAiPlan() }}
            />
            {aiError && <div className={styles.aiError}>{aiError}</div>}
            <div className={styles.modalBtns}>
              <button className={styles.btnSave} onClick={generateAiPlan} disabled={aiLoading}>
                {aiLoading ? 'Generating…' : 'Generate Plan'}
              </button>
              <button className={styles.btnCancel} onClick={() => { setShowAiModal(false); setAiError('') }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

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
    </div>
  )
}
