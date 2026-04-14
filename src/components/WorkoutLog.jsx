import { useState, useEffect } from 'react'
import styles from './WorkoutLog.module.css'
import { getWorkoutPlans, createWorkoutPlan, deleteWorkoutPlan, getSelectedPlanId, saveSelectedPlanId } from '../lib/db'

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
          <button className={styles.addBtn} onClick={() => setShowPlanModal(true)}>+ Add Plan</button>
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
