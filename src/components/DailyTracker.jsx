import { useState, useEffect } from 'react'
import styles from './DailyTracker.module.css'
import { WeightProgressChart } from './WeightProgressChart'
import { getDailyTrackerDate, saveDailyTrackerDate, getMuscleCalendar, getWorkoutPlans, getSelectedPlanId, getWorkoutHistory, saveWeekAssignment } from '../lib/db'

const TODAY = new Date().toISOString().slice(0, 10)

const MUSCLE_COLORS = {
  chest: '#39ff14', shoulders: '#00e5ff', abs: '#ff3d71',
  arms: '#f5a623', back: '#a259ff', legs: '#ff6b35',
}

// Which weekday indices (Mon=0 … Sun=6) are training days for a given frequency
const WORKOUT_DAYS_BY_FREQ = {
  1: [0],
  2: [0, 3],
  3: [0, 2, 4],
  4: [0, 1, 3, 4],
  5: [0, 1, 2, 3, 4],
  6: [0, 1, 2, 3, 4, 5],
  7: [0, 1, 2, 3, 4, 5, 6],
}

async function loadActivePlan(userId) {
  const [plans, selectedId] = await Promise.all([
    getWorkoutPlans(userId),
    getSelectedPlanId(userId),
  ])
  return plans.find(p => p.id === selectedId) || null
}

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

// Returns the schedule block for a given date, or null if rest day.
// weekAssignment maps dowMon (0=Mon…6=Sun) → schedule block index or null.
function getPlanDayForDate(dateStr, plan, weekAssignment) {
  if (!plan || !plan.schedule || !plan.schedule.length) return null
  const dowSun = new Date(dateStr + 'T00:00:00').getDay()
  const dowMon = (dowSun + 6) % 7

  if (weekAssignment) {
    const blockIdx = weekAssignment[dowMon]
    if (blockIdx == null) return null
    return plan.schedule[blockIdx] ?? null
  }

  const workoutDays = WORKOUT_DAYS_BY_FREQ[plan.daysPerWeek] || []
  const idx = workoutDays.indexOf(dowMon)
  if (idx === -1) return null
  return plan.schedule[idx % plan.schedule.length]
}

function buildDefaultAssignment(plan) {
  const assignment = { 0: null, 1: null, 2: null, 3: null, 4: null, 5: null, 6: null }
  const workoutDays = WORKOUT_DAYS_BY_FREQ[plan.daysPerWeek] || []
  workoutDays.forEach((dow, i) => { assignment[dow] = i % plan.schedule.length })
  return assignment
}

function calcStreak(calendar) {
  let streak = 0
  const d = new Date(TODAY + 'T00:00:00')
  // If today has no activity yet, start checking from yesterday
  const todayData = calendar[TODAY]
  const todayActive = todayData && Object.values(todayData).some(v => v !== 'rest')
  if (!todayActive) d.setDate(d.getDate() - 1)

  while (true) {
    const key = d.toISOString().slice(0, 10)
    const day = calendar[key]
    if (!day || !Object.values(day).some(v => v !== 'rest')) break
    streak++
    d.setDate(d.getDate() - 1)
  }
  return streak
}

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year, month) {
  return (new Date(year, month, 1).getDay() + 6) % 7
}


const PART_TO_MUSCLE = {
  chest: 'chest', back: 'back', shoulders: 'shoulders',
  biceps: 'arms', triceps: 'arms', abs: 'abs',
  quads: 'legs', hamstrings: 'legs', calves: 'legs', glutes: 'legs',
}

// Maps plan day names to muscle group (fallback when exercise name doesn't match)
const PLAN_DAY_TO_MUSCLE = {
  push:       'chest',
  pull:       'back',
  legs:       'legs',
  chest:      'chest',
  back:       'back',
  shoulders:  'shoulders',
  arms:       'arms',
  abs:        'abs',
  upper:      'chest',
  lower:      'legs',
  cardio:     'legs',
}

// Maps exercise name keywords → muscle group for per-exercise accuracy
const EXERCISE_MUSCLE_KEYWORDS = [
  // Legs first so "deadlift" doesn't get caught by "back" keyword
  ['squat',              'legs'],
  ['leg press',          'legs'],
  ['leg curl',           'legs'],
  ['leg extension',      'legs'],
  ['lunge',              'legs'],
  ['romanian deadlift',  'legs'],
  ['rdl',                'legs'],
  ['hip thrust',         'legs'],
  ['calf raise',         'legs'],
  ['calf',               'legs'],
  ['glute',              'legs'],
  ['sumo deadlift',      'legs'],
  // Back
  ['deadlift',           'back'],
  ['pull-up',            'back'],
  ['pull up',            'back'],
  ['pullup',             'back'],
  ['chin-up',            'back'],
  ['chin up',            'back'],
  ['barbell row',        'back'],
  ['dumbbell row',       'back'],
  ['cable row',          'back'],
  ['lat pulldown',       'back'],
  ['face pull',          'back'],
  ['shrug',              'back'],
  ['hyperextension',     'back'],
  ['good morning',       'back'],
  // Chest
  ['bench press',        'chest'],
  ['chest press',        'chest'],
  ['chest fly',          'chest'],
  ['incline press',      'chest'],
  ['decline press',      'chest'],
  ['incline dumbbell',   'chest'],
  ['cable fly',          'chest'],
  ['pec deck',           'chest'],
  ['push up',            'chest'],
  ['pushup',             'chest'],
  ['dip',                'chest'],
  // Shoulders
  ['overhead press',     'shoulders'],
  ['shoulder press',     'shoulders'],
  ['ohp',                'shoulders'],
  ['lateral raise',      'shoulders'],
  ['front raise',        'shoulders'],
  ['arnold press',       'shoulders'],
  ['upright row',        'shoulders'],
  ['reverse fly',        'shoulders'],
  // Arms
  ['curl',               'arms'],
  ['tricep',             'arms'],
  ['pushdown',           'arms'],
  ['skull crusher',      'arms'],
  ['close grip',         'arms'],
  ['hammer curl',        'arms'],
  ['preacher curl',      'arms'],
  ['overhead extension', 'arms'],
  // Abs
  ['crunch',             'abs'],
  ['plank',              'abs'],
  ['sit up',             'abs'],
  ['sit-up',             'abs'],
  ['leg raise',          'abs'],
  ['cable crunch',       'abs'],
  ['russian twist',      'abs'],
  ['ab wheel',           'abs'],
]

function getExerciseMuscle(exerciseName, fallback) {
  const lower = exerciseName.toLowerCase()
  for (const [keyword, muscle] of EXERCISE_MUSCLE_KEYWORDS) {
    if (lower.includes(keyword)) return muscle
  }
  return fallback ?? 'chest'
}

function pctToLevel(pct) {
  if (pct === 0)   return 'rest'
  if (pct <= 33)   return 'low'
  if (pct <= 66)   return 'med'
  return 'high'
}

export function DailyTracker({ userId, onMuscleUpdate, onSessionUpdate }) {
  const [boards, setBoards]         = useState(() => {
    try { return JSON.parse(localStorage.getItem('workoutBoards') || '[]') } catch { return [] }
  })
  const [activePlan, setActivePlan]           = useState(null)
  const [weekAssignment, setWeekAssignment]   = useState(null)
  const [showScheduleEditor, setShowScheduleEditor] = useState(false)
  const [draftAssignment, setDraftAssignment] = useState(null)
  const [tracker, setTracker]       = useState({})
  const [calendar, setCalendar]     = useState({})
  const [loggedDates, setLoggedDates] = useState(new Set())
  const [viewDate, setViewDate]     = useState(TODAY)
  const [calYear, setCalYear]       = useState(new Date().getFullYear())
  const [calMonth, setCalMonth]     = useState(new Date().getMonth())

  // Load from Supabase on mount / userId change
  useEffect(() => {
    if (!userId) return
    loadActivePlan(userId).then(plan => {
      setActivePlan(plan)
      if (plan) {
        setWeekAssignment(plan.weekAssignment ?? buildDefaultAssignment(plan))
      }
    })
    getMuscleCalendar(userId).then(setCalendar)
    getWorkoutHistory(userId).then(history => {
      setLoggedDates(new Set(history.map(h => h.date.slice(0, 10))))
    })
  }, [userId])

  // Load tracker data for viewDate from Supabase
  useEffect(() => {
    if (!userId) return
    getDailyTrackerDate(userId, viewDate).then(data => {
      setTracker(prev => ({ ...prev, [viewDate]: data }))
    })
  }, [userId, viewDate])

  function getEntry(boardId, exId) {
    return tracker[viewDate]?.[boardId]?.[exId] ?? { done: false, weight: '' }
  }

  const isFuture = viewDate > TODAY

  function toggleDone(boardId, exId) {
    if (isFuture) return
    const next = structuredClone(tracker)
    if (!next[viewDate]) next[viewDate] = {}
    if (!next[viewDate][boardId]) next[viewDate][boardId] = {}
    const cur = next[viewDate][boardId][exId] ?? { done: false, weight: '' }
    next[viewDate][boardId][exId] = { ...cur, done: !cur.done }
    setTracker(next)
    saveDailyTrackerDate(userId, viewDate, next[viewDate])

    const board = boards.find(b => b.id === boardId)
    if (board) {
      const muscleGroup = PART_TO_MUSCLE[board.part] ?? board.part
      const total = board.exercises.length
      const done  = board.exercises.filter(e => next[viewDate][boardId]?.[e.id]?.done).length
      const pct   = total > 0 ? Math.round(done / total * 100) : 0
      // Only update 3D model colours for today
      if (viewDate === TODAY && onMuscleUpdate) onMuscleUpdate(muscleGroup, pctToLevel(pct))
      if (onSessionUpdate) {
        const sets = board.exercises
          .filter(e => next[viewDate][boardId]?.[e.id]?.done)
          .map(e => ({
            exercise: e.name,
            sets:     e.sets,
            reps:     e.reps,
            weight:   next[viewDate][boardId]?.[e.id]?.weight || ''
          }))
        onSessionUpdate(muscleGroup, sets, viewDate)
      }
    } else if (activePlan && boardId.startsWith('plan_')) {
      const planDay = getPlanDayForDate(viewDate, activePlan)
      if (planDay) {
        const dayFallback = PLAN_DAY_TO_MUSCLE[planDay.day.toLowerCase()] ?? 'chest'
        const byMuscle = {}
        planDay.exercises.forEach((ex, i) => {
          const muscle = getExerciseMuscle(ex.name, dayFallback)
          if (!byMuscle[muscle]) byMuscle[muscle] = { indices: [], exercises: [] }
          byMuscle[muscle].indices.push(i)
          byMuscle[muscle].exercises.push(ex)
        })
        for (const [muscle, { indices, exercises }] of Object.entries(byMuscle)) {
          const total = indices.length
          const done  = indices.filter(i => next[viewDate][boardId]?.[i]?.done).length
          const pct   = Math.round(done / total * 100)
          if (viewDate === TODAY && onMuscleUpdate) onMuscleUpdate(muscle, pctToLevel(pct))
          if (onSessionUpdate) {
            const sets = exercises
              .map((ex, j) => ({ ex, i: indices[j] }))
              .filter(({ i }) => next[viewDate][boardId]?.[i]?.done)
              .map(({ ex, i }) => ({
                exercise: ex.name,
                sets:     ex.sets,
                reps:     String(ex.reps),
                weight:   next[viewDate][boardId]?.[i]?.weight || ''
              }))
            if (sets.length > 0) onSessionUpdate(muscle, sets, viewDate)
          }
        }
      }
    }
  }

  function setWeight(boardId, exId, weight) {
    if (isFuture) return
    const next = structuredClone(tracker)
    if (!next[viewDate]) next[viewDate] = {}
    if (!next[viewDate][boardId]) next[viewDate][boardId] = {}
    const cur = next[viewDate][boardId][exId] ?? { done: false, weight: '' }
    next[viewDate][boardId][exId] = { ...cur, weight }
    setTracker(next)
    saveDailyTrackerDate(userId, viewDate, next[viewDate])

    // Re-emit session with updated weight whenever exercise is already ticked
    if (!cur.done || !onSessionUpdate) return

    const board = boards.find(b => b.id === boardId)
    if (board) {
      const muscleGroup = PART_TO_MUSCLE[board.part] ?? board.part
      const sets = board.exercises
        .filter(e => next[viewDate][boardId]?.[e.id]?.done)
        .map(e => ({
          exercise: e.name,
          sets:     e.sets,
          reps:     e.reps,
          weight:   next[viewDate][boardId]?.[e.id]?.weight || ''
        }))
      onSessionUpdate(muscleGroup, sets, viewDate)
    } else if (activePlan && boardId.startsWith('plan_')) {
      const planDay = getPlanDayForDate(viewDate, activePlan)
      if (!planDay) return
      const dayFallback = PLAN_DAY_TO_MUSCLE[planDay.day.toLowerCase()] ?? 'chest'
      const byMuscle = {}
      planDay.exercises.forEach((ex, i) => {
        const muscle = getExerciseMuscle(ex.name, dayFallback)
        if (!byMuscle[muscle]) byMuscle[muscle] = { indices: [], exercises: [] }
        byMuscle[muscle].indices.push(i)
        byMuscle[muscle].exercises.push(ex)
      })
      for (const [muscle, { indices, exercises }] of Object.entries(byMuscle)) {
        const sets = exercises
          .map((ex, j) => ({ ex, i: indices[j] }))
          .filter(({ i }) => next[viewDate][boardId]?.[i]?.done)
          .map(({ ex, i }) => ({
            exercise: ex.name,
            sets:     ex.sets,
            reps:     String(ex.reps),
            weight:   next[viewDate][boardId]?.[i]?.weight || ''
          }))
        if (sets.length > 0) onSessionUpdate(muscle, sets, viewDate)
      }
    }
  }

  function boardProgress(b) {
    const total = b.exercises.length
    const done  = b.exercises.filter(e => getEntry(b.id, e.id).done).length
    return { done, total }
  }


  // Calendar
  const daysInMonth = getDaysInMonth(calYear, calMonth)
  const firstDay = getFirstDayOfMonth(calYear, calMonth)
  const monthLabel = new Date(calYear, calMonth).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })

  function prevMonth() {
    if (calMonth === 0) { setCalYear(y => y - 1); setCalMonth(11) }
    else setCalMonth(m => m - 1)
  }
  function nextMonth() {
    if (calMonth === 11) { setCalYear(y => y + 1); setCalMonth(0) }
    else setCalMonth(m => m + 1)
  }

  const todayPlanDay = getPlanDayForDate(viewDate, activePlan, weekAssignment)
  const streak = calcStreak(calendar)

  // Filter chart to only show exercises scheduled for the selected day
  const dayExerciseNames = todayPlanDay
    ? todayPlanDay.exercises.map(e => e.name)
    : boards.flatMap(b => b.exercises.map(e => e.name))

  return (
    <div className={styles.wrap}>
      <div className={styles.topbar}>
        <div>
          <h1 className={styles.title}>
            {viewDate === TODAY ? 'TODAY' : new Date(viewDate + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
          </h1>
          <div className={styles.date}>
            {new Date(viewDate + 'T00:00:00').toLocaleDateString('en-GB', {
              weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
            })}
          </div>
        </div>
        {streak > 0 && (
          <div className={styles.streak}>
            <span className={styles.streakFlame}>🔥</span>
            <span className={styles.streakCount}>{streak}</span>
            <span className={styles.streakLabel}>day streak</span>
          </div>
        )}
      </div>

      {activePlan && (
        <div
          className={styles.planBanner}
          style={{ borderLeftColor: activePlan.color }}
        >
          <div className={styles.planBannerLeft}>
            <span className={styles.planBannerName}>{activePlan.name}</span>
            {todayPlanDay
              ? <span className={styles.planBannerDay} style={{ color: activePlan.color }}>{todayPlanDay.day} Day</span>
              : <span className={styles.planBannerRest}>Rest Day</span>
            }
          </div>
          <button
            className={styles.editScheduleBtn}
            onClick={() => { setDraftAssignment({ ...weekAssignment }); setShowScheduleEditor(true) }}
          >
            Edit Schedule
          </button>
        </div>
      )}

      <div className={styles.calendar}>
        <div className={styles.calNav}>
          <button className={styles.calNavBtn} onClick={prevMonth}>‹</button>
          <span className={styles.calMonthLabel}>{monthLabel}</span>
          <button className={styles.calNavBtn} onClick={nextMonth}>›</button>
        </div>
        <div className={styles.calGrid}>
          {['M','T','W','T','F','S','S'].map((d, i) => (
            <div key={i} className={styles.calDayName}>{d}</div>
          ))}
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`empty-${i}`} />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1
            const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
            const isToday = dateStr === TODAY
            const isSelected = dateStr === viewDate
            const isFutureDay = dateStr > TODAY
            const muscles = calendar[dateStr]
            const trainedMuscles = muscles ? Object.entries(muscles).filter(([, v]) => v !== 'rest') : []
            const planBlock = getPlanDayForDate(dateStr, activePlan, weekAssignment)
            const hasWeights = loggedDates.has(dateStr)
            return (
              <button
                key={dateStr}
                className={`${styles.calDay} ${isToday ? styles.calToday : ''} ${isSelected ? styles.calSelected : ''} ${isFutureDay ? styles.calFuture : ''}`}
                onClick={() => !isFutureDay && setViewDate(dateStr)}
                disabled={isFutureDay}
              >
                <span className={styles.calDayNum}>{day}</span>
                {hasWeights && (
                  <span className={styles.calCheck}>✓</span>
                )}
                {!hasWeights && planBlock && (
                  <span
                    className={styles.calPlanLabel}
                    style={{ color: activePlan.color }}
                  >
                    {planBlock.day.slice(0, 3).toUpperCase()}
                  </span>
                )}
                {trainedMuscles.length > 0 && (
                  <div className={styles.calDots}>
                    {trainedMuscles.slice(0, 3).map(([muscle]) => (
                      <span key={muscle} className={styles.calDot} style={{ background: MUSCLE_COLORS[muscle] }} />
                    ))}
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {isFuture && (
        <div className={styles.futureBanner}>
          You can't log exercises for a future date.
        </div>
      )}

      <div className={styles.boards}>
        {/* ── Active plan day view ── */}
        {activePlan && todayPlanDay && (() => {
          const planBoardId = `plan_${activePlan.id}_${todayPlanDay.day}`
          const total = todayPlanDay.exercises.length
          const done  = todayPlanDay.exercises.filter((_, i) => getEntry(planBoardId, i).done).length
          const pct   = total > 0 ? Math.round(done / total * 100) : 0
          const complete = done === total && total > 0
          return (
            <div className={`${styles.board} ${complete ? styles.boardComplete : ''}`}
              style={{ borderColor: complete ? activePlan.color + '55' : undefined }}>
              <div className={styles.boardHeader}>
                <div className={styles.boardInfo}>
                  <div className={styles.boardName} style={{ color: complete ? activePlan.color : undefined }}>
                    {todayPlanDay.day} Day
                  </div>
                  <div className={styles.boardSub} style={{ color: activePlan.color + 'aa' }}>
                    {activePlan.name.toUpperCase()} · {done}/{total} done
                  </div>
                </div>
                {complete && <span className={styles.completeBadge} style={{ color: activePlan.color }}>✓ DONE</span>}
              </div>
              <div className={styles.progressBar}>
                <div className={styles.progressFill}
                  style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${activePlan.color}, ${activePlan.color}88)` }}/>
              </div>
              <div className={styles.exercises}>
                {todayPlanDay.exercises.map((ex, i) => {
                  const entry = getEntry(planBoardId, i)
                  return (
                    <div key={i} className={`${styles.exRow} ${entry.done ? styles.exDone : ''}`}>
                      <button
                        className={`${styles.check} ${entry.done ? styles.checked : ''}`}
                        style={entry.done ? { borderColor: activePlan.color, background: activePlan.color + '22', color: activePlan.color } : {}}
                        onClick={() => toggleDone(planBoardId, i)}
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
                          placeholder="—"
                          value={entry.weight}
                          onChange={e => setWeight(planBoardId, i, e.target.value)}
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
        })()}

        {/* Rest day message */}
        {activePlan && !todayPlanDay && (
          <p className={styles.empty}>Rest day — no workout scheduled today.</p>
        )}

        {/* No active plan — show all boards */}
        {!activePlan && boards.length === 0 && (
          <p className={styles.empty}>No workout boards yet — create one in the Workout Log tab.</p>
        )}

        {!activePlan && boards.map(b => {
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

      <div className={styles.chartSection}>
        <WeightProgressChart userId={userId} filterExercises={dayExerciseNames} />
      </div>

      {showScheduleEditor && activePlan && (
        <div className={styles.scheduleOverlay} onClick={() => setShowScheduleEditor(false)}>
          <div className={styles.scheduleDrawer} onClick={e => e.stopPropagation()}>
            <div className={styles.scheduleHandle} />
            <div className={styles.scheduleHeader}>
              <span className={styles.scheduleTitle}>Edit Weekly Schedule</span>
              <span className={styles.scheduleSubtitle}>{activePlan.name}</span>
            </div>
            <div className={styles.scheduleRows}>
              {DAYS_OF_WEEK.map((dayName, i) => (
                <div key={i} className={styles.scheduleRow}>
                  <span className={styles.scheduleDayName}>{dayName}</span>
                  <select
                    className={styles.scheduleSelect}
                    style={{ borderColor: draftAssignment?.[i] != null ? activePlan.color + '88' : undefined }}
                    value={draftAssignment?.[i] ?? ''}
                    onChange={e => setDraftAssignment(prev => ({
                      ...prev,
                      [i]: e.target.value === '' ? null : Number(e.target.value),
                    }))}
                  >
                    <option value="">Rest</option>
                    {activePlan.schedule.map((block, idx) => (
                      <option key={idx} value={idx}>{block.day}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
            <button
              className={styles.scheduleSaveBtn}
              style={{ background: activePlan.color }}
              onClick={() => {
                setWeekAssignment(draftAssignment)
                saveWeekAssignment(userId, activePlan.id, draftAssignment)
                setShowScheduleEditor(false)
              }}
            >
              Save Schedule
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
