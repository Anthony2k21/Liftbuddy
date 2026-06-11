import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import { HumanModel } from './components/Humanmodel'
import { WorkoutModal } from './components/WorkoutModal'
import { TabBar } from './components/TabBar'
import { WorkoutLog } from './components/WorkoutLog'
import { Progress } from './pages/Progress'
import { Settings } from './components/Settings'
import { useWorkoutHistory } from './hooks/useWorkoutHistory'
import { useAuth } from './contexts/AuthContext'
import { AuthScreen } from './components/AuthScreen'
import { getMuscleCalendar, saveMuscleDay, saveSessionRating, getSelectedPlanId, getWorkoutPlans } from './lib/db'
import { getTodaySession, fetchWeeklySets } from './lib/supabase/sessions'
import { supabase } from './lib/supabase'
import { calculateSessionRating } from './utils/calculateSessionRating'
import { WorkoutMode } from './pages/WorkoutMode'
import './index.css'
import styles from './App.module.css'

const INITIAL_MUSCLE_DATA = {
  chest:     'low',
  shoulders: 'low',
  abs:       'low',
  arms:      'low',
  back:      'low',
  legs:      'low',
}

function todayKey() {
  return new Date().toISOString().slice(0, 10)
}

function setsToLevel(count) {
  if (count === 0) return 'low'
  if (count <= 2)  return 'low'
  if (count <= 5)  return 'med'
  return 'high'
}

const LEVEL_RANK = { low: 0, med: 1, high: 2 }
function maxLevel(a, b) {
  return LEVEL_RANK[a] >= LEVEL_RANK[b] ? a : b
}

function computeWeeklyDisplay(calendar, todayData) {
  const today       = new Date()
  const dayOfWeek   = today.getDay()
  const daysFromMon = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  let result = { ...INITIAL_MUSCLE_DATA }
  for (let i = 0; i <= daysFromMon; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() - daysFromMon + i)
    const key     = d.toISOString().slice(0, 10)
    const dayData = key === todayKey() ? todayData : (calendar[key] || {})
    for (const muscle of Object.keys(result)) {
      result[muscle] = maxLevel(result[muscle], dayData[muscle] || 'low')
    }
  }
  return result
}

function inferMuscleGroupLocal(name) {
  if (!name) return null
  if (/bench|chest fly|pec deck|push.?up/i.test(name)) return 'chest'
  if (/face pull|pull.?apart|lateral raise|front raise|shoulder|overhead press|military press|arnold/i.test(name)) return 'shoulders'
  if (/back|row|lat pull|pull.?up|deadlift|rack pull|chin.?up/i.test(name)) return 'back'
  if (/squat|leg press|lunge|hack squat|leg extension|hamstring|rdl|romanian|leg curl|glute|hip thrust|calf/i.test(name)) return 'legs'
  if (/bicep|curl|tricep|pushdown|skull crusher|dip/i.test(name)) return 'arms'
  if (/ab|crunch|plank|sit.?up|core|cable crunch/i.test(name)) return 'abs'
  return null
}

function computeWeeklyDisplayFromSets(weeklySets) {
  const result = { ...INITIAL_MUSCLE_DATA }
  if (!weeklySets?.length) return result

  const volumeByGroup = {}
  const touchedGroups = new Set()

  for (const s of weeklySets) {
    const group = inferMuscleGroupLocal(s.exercise_name)
    if (!group) continue
    touchedGroups.add(group)
    const vol = (Number(s.weight) || 0) * (Number(s.reps) || 0)
    volumeByGroup[group] = (volumeByGroup[group] || 0) + vol
  }

  const maxVol = Math.max(...Object.values(volumeByGroup), 1)
  
  for (const group of touchedGroups) {
    const vol = volumeByGroup[group] || 0
    if (vol === 0) {
      result[group] = 'low'
    } else {
      const ratio = vol / maxVol
      if (ratio > 0.66) result[group] = 'high'
      else if (ratio > 0.25) result[group] = 'med'
      else result[group] = 'low'
    }
  }

  return result
}

function fmtVolume(v) {
  if (v >= 1000) return (v / 1000).toFixed(1).replace(/\.0$/, '') + 'K'
  return v > 0 ? String(v) : '0'
}

function inferWorkoutType(exercises) {
  if (!exercises?.length) return null
  const names = exercises.map(e => (e.exercise || '').toLowerCase()).join(' ')
  if (/squat|lunge|leg press|romanian|hamstring|quad|glute/.test(names)) return 'LEG DAY'
  if (/deadlift|row|pull.?up|pulldown|curl|chin/.test(names)) return 'PULL DAY'
  if (/bench|press|fly|dip|push.?up|overhead|lateral/.test(names)) return 'PUSH DAY'
  return null
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

const FREQ_MAP = { 1:[0],2:[0,3],3:[0,2,4],4:[0,1,3,4],5:[0,1,2,3,4],6:[0,1,2,3,4,5],7:[0,1,2,3,4,5,6] }

function getWorkoutLetter(exercises) {
  const type = inferWorkoutType(exercises)
  if (type === 'PUSH DAY') return 'P'
  if (type === 'PULL DAY') return 'L'
  if (type === 'LEG DAY') return 'G'
  if (exercises?.length > 0) return 'W'
  return null
}

function buildWeekMap(planInfo) {
  if (!planInfo?.allSchedule?.length) return Array(7).fill(null)
  const { allSchedule, weekAssignment, daysPerWeek } = planInfo
  const result = Array(7).fill(null)
  if (weekAssignment) {
    for (let dow = 0; dow < 7; dow++) {
      const idx = weekAssignment[dow]
      if (idx != null && allSchedule[idx]) result[dow] = allSchedule[idx]
    }
  } else {
    const days = FREQ_MAP[daysPerWeek] || []
    days.forEach((dow, i) => {
      const slot = allSchedule[i % allSchedule.length]
      if (slot) result[dow] = slot
    })
  }
  return result
}

// Plan exercises use `name`; WorkoutMode expects `exercise`. Normalise at the boundary.
function normalizeExercises(exs) {
  return (exs || []).map(ex => ({ ...ex, exercise: ex.exercise || ex.name || '' }))
}

// ── Stat icons ────────────────────────────────────────────────────────────────

const IconFlame = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
    <path d="M13.5.67s.74 2.65.74 4.8c0 2.06-1.35 3.73-3.41 3.73-2.07 0-3.63-1.67-3.63-3.73l.03-.36C5.21 7.51 4 10.62 4 14c0 4.42 3.58 8 8 8s8-3.58 8-8C20 8.61 17.41 3.8 13.5.67z"/>
  </svg>
)

const IconBars = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
    <rect x="4" y="12" width="4" height="8"/>
    <rect x="10" y="7" width="4" height="13"/>
    <rect x="16" y="4" width="4" height="16"/>
  </svg>
)

const IconClock = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <circle cx="12" cy="12" r="9"/>
    <polyline points="12 7 12 12 15 14"/>
  </svg>
)

// ─────────────────────────────────────────────────────────────────────────────

export default function App() {
  const { session, user, signOut } = useAuth()

  if (session === undefined) return (
    <div style={{ background: '#000', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '0.8rem', letterSpacing: '2px' }}>
      LOADING…
    </div>
  )

  if (!session) return <AuthScreen />

  const userName = user?.user_metadata?.name || user?.email?.split('@')[0] || 'Anthony'

  return <AppInner userName={userName} userEmail={user?.email} userId={user.id} signOut={signOut} />
}


function AppInner({ userName, userEmail, userId, signOut }) {
  const [muscleData, setMuscleData]           = useState(INITIAL_MUSCLE_DATA)
  const [weekDisplayData, setWeekDisplayData] = useState(INITIAL_MUSCLE_DATA)
  const [sessionData, setSessionData]         = useState({})
  const [activeModal, setActiveModal]         = useState(null)
  const { logSession, history }               = useWorkoutHistory(userId)

  const [displayName, setDisplayName] = useState(
    () => localStorage.getItem(`displayName_${userId}`) || userName
  )

  // ── Plan data ──────────────────────────────────────────────────────────────
  const [todayPlanInfo, setTodayPlanInfo] = useState(null)

  useEffect(() => {
    async function loadTodayPlan() {
      try {
        const selectedId = await getSelectedPlanId(userId)
        if (!selectedId) { setTodayPlanInfo(null); return }
        const plans = await getWorkoutPlans(userId)
        const active = plans.find(p => p.id === selectedId)
        if (!active) { setTodayPlanInfo(null); return }

        // Use weekAssignment-aware lookup (same logic as DailyTracker)
        const todayStr = todayKey()
        const dowMon = (new Date(todayStr + 'T00:00:00').getDay() + 6) % 7
        const FREQ_MAP = { 1:[0],2:[0,3],3:[0,2,4],4:[0,1,3,4],5:[0,1,2,3,4],6:[0,1,2,3,4,5],7:[0,1,2,3,4,5,6] }
        let daySchedule = null
        if (active.schedule?.length) {
          const wa = active.weekAssignment
          if (wa) {
            const idx = wa[dowMon]
            if (idx != null) daySchedule = active.schedule[idx] ?? null
          } else {
            const days = FREQ_MAP[active.daysPerWeek] || []
            const i = days.indexOf(dowMon)
            if (i !== -1) daySchedule = active.schedule[i % active.schedule.length]
          }
        }

        setTodayPlanInfo({
          planId:         active.id,
          planName:       active.name,
          exercises:      normalizeExercises(daySchedule?.exercises || []),
          allSchedule:    active.schedule || [],
          weekAssignment: active.weekAssignment || null,
          daysPerWeek:    active.daysPerWeek || 3,
        })
      } catch { setTodayPlanInfo(null) }
    }
    loadTodayPlan()
    window.addEventListener('storage', loadTodayPlan)
    return () => window.removeEventListener('storage', loadTodayPlan)
  }, [userId])

  // ── Stats ──────────────────────────────────────────────────────────────────
  const [streak, setStreak] = useState(0)

  useEffect(() => {
    async function computeStreak() {
      const { data } = await supabase
        .from('sets')
        .select('logged_at')
        .eq('user_id', userId)
        .order('logged_at', { ascending: false })
        .limit(200)

      if (!data || data.length === 0) return setStreak(0)

      const trainedDates = new Set(
        data.map(s => s.logged_at.split('T')[0])
      )

      let count = 0
      const cursor = new Date()
      cursor.setHours(0, 0, 0, 0)

      while (true) {
        const day = cursor.toISOString().split('T')[0]
        if (trainedDates.has(day)) {
          count++
          cursor.setDate(cursor.getDate() - 1)
        } else if (count === 0) {
          cursor.setDate(cursor.getDate() - 1)
          const yesterday = cursor.toISOString().split('T')[0]
          if (!trainedDates.has(yesterday)) break
        } else {
          break
        }
      }

      setStreak(count)
    }

    computeStreak()
  }, [userId])

  const weeklyVolume = useMemo(() => {
    const today = new Date()
    const dow = today.getDay()
    const mon = new Date(today)
    mon.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1))
    const mondayKey = mon.toISOString().slice(0, 10)
    let vol = 0
    for (const h of history) {
      if (!h.date || h.date < mondayKey) continue
      for (const s of (h.sets || [])) {
        vol += (parseInt(s.sets) || 1) * (parseInt(s.reps) || 0) * (parseFloat(s.weight) || 0)
      }
    }
    return vol
  }, [history])

  const lastWorkoutDays = useMemo(() => {
    const dates = history.map(h => h.date).filter(Boolean).sort().reverse()
    if (!dates.length) return null
    const last = new Date(dates[0])
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    last.setHours(0, 0, 0, 0)
    return Math.round((today - last) / 86400000)
  }, [history])

  // ── Muscle calendar ────────────────────────────────────────────────────────
  useEffect(() => {
    getMuscleCalendar(userId).then(calendar => {
      setMuscleData(calendar[todayKey()] || INITIAL_MUSCLE_DATA)
    })
  }, [userId])

  useEffect(() => {
    saveMuscleDay(userId, todayKey(), muscleData)
  }, [muscleData, userId])

  // ── Weekly heatmap from sets ────────────────────────────────────────────────
  useEffect(() => {
    if (!userId) return
    fetchWeeklySets(userId).then(sets => setWeekDisplayData(computeWeeklyDisplayFromSets(sets)))
  }, [userId])

  useEffect(() => {
    if (!userId) return
    function refresh() {
      fetchWeeklySets(userId).then(sets => setWeekDisplayData(computeWeeklyDisplayFromSets(sets)))
    }
    window.addEventListener('workoutHistoryUpdated', refresh)
    return () => window.removeEventListener('workoutHistoryUpdated', refresh)
  }, [userId])

  // ── Workout mode ───────────────────────────────────────────────────────────
  const [workoutModeData, setWorkoutModeData] = useState(null)
  const [showDayPicker, setShowDayPicker] = useState(false)
  const [hasTodaySession, setHasTodaySession] = useState(false)

  // ── UI state ───────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab]   = useState('workout')
  const [autoRotate, setAutoRotate] = useState(true)
  const [rotY, setRotY]             = useState(0)
  const [showArcUI, setShowArcUI]   = useState(false)
  const [showModel, setShowModel]   = useState(true)
  const [playing, setPlaying]       = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const audioRef                    = useRef(null)
  const [animationNames, setAnimationNames] = useState([])
  const [activeAnimation, setActiveAnimation] = useState(null)
  const animInitialized             = useRef(false)

  useEffect(() => {
    if (!audioRef.current) return
    if (playing) audioRef.current.play().catch(() => {})
    else audioRef.current.pause()
  }, [playing])

  useEffect(() => {
    if (animationNames.length === 0 || animInitialized.current) return
    animInitialized.current = true
    const pick = (exclude) => {
      const pool = exclude ? animationNames.filter(n => n !== exclude) : animationNames
      return pool.length > 0 ? pool[Math.floor(Math.random() * pool.length)] : animationNames[0]
    }
    setActiveAnimation(pick())
    const interval = setInterval(() => setActiveAnimation(prev => pick(prev)), 12000)
    return () => clearInterval(interval)
  }, [animationNames])

  const dragging    = useRef(false)
  const prevPos     = useRef({ x: 0, y: 0 })
  const currentRotY = useRef(0)

  const weekNum = Math.ceil(
    (new Date() - new Date(new Date().getFullYear(), 0, 1)) / 604800000
  )

  const todayDayName    = DAY_NAMES[new Date().getDay()].toUpperCase()
  const workoutExercises = todayPlanInfo?.exercises || []
  const workoutTitle    = inferWorkoutType(workoutExercises) || todayPlanInfo?.planName?.toUpperCase() || 'WORKOUT DAY'
  const isRestDay       = workoutExercises.length === 0
  const workoutMeta     = todayPlanInfo && !isRestDay
    ? `${todayPlanInfo.planName.toUpperCase()} · ${workoutExercises.length} EXERCISES · ~${workoutExercises.length * 10} MIN`
    : todayPlanInfo?.planName?.toUpperCase() || 'SET UP A PLAN IN PLANS TAB'

  // Stats for today's day type (PUSH/PULL/LEG) — rotated through in the 3rd cell.
  // Falls back to "days since last workout" when there's no day type / no matching history.
  const dayStats = useMemo(() => {
    const dayType = inferWorkoutType(workoutExercises) // e.g. 'PUSH DAY'
    const short   = dayType ? dayType.replace(' DAY', '') : null // 'PUSH'
    const fallback = [{ val: lastWorkoutDays !== null ? `${lastWorkoutDays}D` : '—', lbl: 'LAST WORKOUT' }]
    if (!short) return fallback

    // Past sessions whose logged sets classify as the same day type
    const matching = history.filter(h => inferWorkoutType(
      (h.sets || []).map(s => ({ exercise: s.exercise }))
    ) === dayType)
    if (matching.length === 0) return fallback

    const sessionVolume = h =>
      (h.sets || []).reduce((v, s) =>
        v + (parseInt(s.sets) || 1) * (parseInt(s.reps) || 0) * (parseFloat(s.weight) || 0), 0)

    const volumes = matching.map(sessionVolume)
    const bestVol = Math.max(...volumes)
    const lastVol = sessionVolume(matching[matching.length - 1])
    const topSet  = Math.max(0, ...matching.flatMap(h => (h.sets || []).map(s => parseFloat(s.weight) || 0)))

    return [
      { val: fmtVolume(bestVol), lbl: `BEST ${short}` },
      { val: fmtVolume(lastVol), lbl: `LAST ${short}` },
      { val: String(matching.length), lbl: `${short} SESSIONS` },
      { val: topSet > 0 ? `${topSet}KG` : '—', lbl: `TOP ${short}` },
    ]
  }, [workoutExercises, history, lastWorkoutDays])

  // Rotate through dayStats every 10s
  const [dayStatIdx, setDayStatIdx] = useState(0)
  useEffect(() => {
    setDayStatIdx(0)
    if (dayStats.length <= 1) return
    const id = setInterval(() => setDayStatIdx(i => (i + 1) % dayStats.length), 10000)
    return () => clearInterval(id)
  }, [dayStats])
  const currentDayStat = dayStats[dayStatIdx % dayStats.length]

  useEffect(() => {
    if (!userId || isRestDay) { setHasTodaySession(false); return }
    const label = workoutTitle.endsWith(' DAY') ? workoutTitle : workoutTitle + ' DAY'
    getTodaySession(userId, label).then(s => setHasTodaySession(!!s))
  }, [userId, workoutTitle, isRestDay, workoutModeData])

  const activeMuscleLabels = Object.entries(weekDisplayData)
    .filter(([, lvl]) => lvl !== 'low')
    .map(([m]) => m.toUpperCase())
    .join(' · ')

  const todayDowMon = (new Date().getDay() + 6) % 7  // 0=Mon … 6=Sun
  const weekMap     = buildWeekMap(todayPlanInfo)
  const WEEK_INITIALS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
  const LETTER_CLASS  = { P: styles.dayPush, L: styles.dayPull, G: styles.dayLegs, W: styles.dayWork }

  // ── Handlers ───────────────────────────────────────────────────────────────
  async function handleSave({ muscleGroup, sets }) {
    const newSessionData = { ...sessionData, [muscleGroup]: sets }
    setSessionData(newSessionData)
    setMuscleData(prev => ({
      ...prev,
      [muscleGroup]: setsToLevel(sets.reduce((total, e) => total + parseInt(e.sets, 10), 0))
    }))
    logSession({ muscleGroup, sets })
    const { score } = calculateSessionRating(newSessionData, history)
    const today = todayKey()
    Object.keys(newSessionData).forEach(mg => saveSessionRating(userId, today, mg, score))
  }

  const onPointerDown = useCallback((e) => {
    dragging.current = true
    prevPos.current  = {
      x: e.clientX ?? e.touches?.[0]?.clientX,
      y: e.clientY ?? e.touches?.[0]?.clientY,
    }
    setAutoRotate(false)
  }, [])

  const onPointerMove = useCallback((e) => {
    if (!dragging.current) return
    const x  = e.clientX ?? e.touches?.[0]?.clientX
    const y  = e.clientY ?? e.touches?.[0]?.clientY
    const dx = x - prevPos.current.x
    currentRotY.current += dx * 0.008
    prevPos.current = { x, y }
    setRotY(currentRotY.current)
  }, [])

  const onPointerUp = useCallback(() => { dragging.current = false }, [])

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className={styles.app}>
      <audio ref={audioRef} src="/music.mp3" loop />

      {/* ── HEADER ── */}
      <header className={styles.header}>
        <div className={styles.titleGroup}>
          <div className={styles.wipSign}>
            <span className={styles.wipIcon}>⚠</span>
            <h1 className={styles.title}>Work In Progress</h1>
          </div>
          <span className={styles.welcomeText}>Welcome back, {displayName}</span>
        </div>
        <div className={styles.headerRight}>
          <span className={styles.weekPill}>WK {weekNum} · {new Date().getFullYear()}</span>
          <button className={styles.settingsBtn} onClick={() => setShowSettings(true)} title="Settings">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
          </button>
        </div>
      </header>

      {/* ── CANVAS + OVERLAYS ── */}
      <div
        className={styles.canvasWrap}
        onMouseDown={onPointerDown}
        onMouseMove={onPointerMove}
        onMouseUp={onPointerUp}
        onMouseLeave={onPointerUp}
        onTouchStart={onPointerDown}
        onTouchMove={onPointerMove}
        onTouchEnd={onPointerUp}
      >
        <Canvas
          shadows
          camera={{ position: [0, 0, 2.5], fov: 40 }}
          gl={{ antialias: true, alpha: true }}
          style={{ background: 'transparent' }}
        >
          {showModel && (
            <HumanModel
              muscleData={weekDisplayData}
              autoRotate={autoRotate}
              rotY={rotY}
              onClickModel={() => setShowArcUI(v => !v)}
              activeAnimation={activeAnimation}
              onAnimationsLoaded={setAnimationNames}
            />
          )}
        </Canvas>

        <div className={styles.scanlines} />
        <div className={styles.gradientTop} />

        {/* ── WORKOUT CARD + STATS ── */}
        <div className={styles.topOverlay}>
          <div className={styles.workoutCard}>
            <div className={styles.workoutCardLeft}>
              <span className={styles.workoutDayLabel}>TODAY · {todayDayName}</span>
              <h2 className={styles.workoutTitle}>{workoutTitle}</h2>
              <span className={styles.workoutMeta}>{workoutMeta}</span>
            </div>
            <button
              className={styles.startBtn}
              onMouseDown={e => e.stopPropagation()}
              onClick={() => {
                if (!isRestDay && workoutExercises.length > 0) {
                  setWorkoutModeData({
                    planId: todayPlanInfo?.planId || null,
                    exercises: workoutExercises,
                    dayLabel: workoutTitle.endsWith(' DAY') ? workoutTitle : workoutTitle + ' DAY',
                  })
                } else if (todayPlanInfo?.allSchedule?.length > 0) {
                  setShowDayPicker(true)
                } else {
                  setActiveTab('log')
                }
              }}
            >
              {isRestDay ? 'TRAIN ANYWAY →' : hasTodaySession ? 'RETURN →' : 'START →'}
            </button>
          </div>

          <div className={styles.statsRow}>
            <div className={styles.statCell}>
              <span className={styles.statVal}>{streak}</span>
              <span className={styles.statLbl}><IconFlame /> DAY STREAK</span>
            </div>
            <div className={styles.statDivider} />
            <div className={styles.statCell}>
              <span className={styles.statVal}>{fmtVolume(weeklyVolume)}</span>
              <span className={styles.statLbl}><IconBars /> VOL THIS WK</span>
            </div>
            <div className={styles.statDivider} />
            <div className={styles.statCell}>
              <span key={currentDayStat.lbl} className={`${styles.statVal} ${styles.statSlide}`}>{currentDayStat.val}</span>
              <span key={currentDayStat.lbl + '-l'} className={`${styles.statLbl} ${styles.statSlide}`}><IconClock /> {currentDayStat.lbl}</span>
            </div>
          </div>
        </div>

        {/* ── LEGEND (right side) ── */}
        <div className={styles.legend}>
          {[
            { cls: styles.dotHigh, label: 'HIGH' },
            { cls: styles.dotMed,  label: 'MED'  },
            { cls: styles.dotLow,  label: 'LOW'  },
          ].map(({ cls, label }) => (
            <div key={label} className={styles.legendItem}>
              <div className={`${styles.dot} ${cls}`} />
              {label}
            </div>
          ))}
        </div>

        {/* ── WEEK DAY CIRCLES ── */}
        <div className={styles.weekDayBar}>
          {weekMap.map((slot, dow) => {
            const letter = slot ? getWorkoutLetter(slot.exercises) : null
            const isToday = dow === todayDowMon
            return (
              <div key={dow} className={styles.weekDayItem}>
                <div className={`${styles.weekDayCircle} ${letter ? LETTER_CLASS[letter] : styles.dayRest} ${isToday ? styles.dayToday : ''}`}>
                  {letter || '·'}
                </div>
                <span className={styles.weekDayLabel}>{WEEK_INITIALS[dow]}</span>
              </div>
            )
          })}
        </div>

        {/* ── MUSCLE TAGS BAR ── */}
        <div className={styles.muscleTagsBar}>
          {activeMuscleLabels || 'REST DAY'}
        </div>

        {/* ── ARC UI ── */}
        {showArcUI && (
          <div className={styles.arcOverlay} onMouseDown={e => e.stopPropagation()} onTouchStart={e => e.stopPropagation()}>
            {Object.keys(INITIAL_MUSCLE_DATA).map((group) => {
              const leftGroups  = ['shoulders', 'chest', 'abs']
              const rightGroups = ['arms', 'back', 'legs']
              const leftAngles  = [225, 195, 160]
              const rightAngles = [315, 345, 20]
              const radius = 120
              let angle
              if (leftGroups.includes(group)) angle = leftAngles[leftGroups.indexOf(group)]
              else angle = rightAngles[rightGroups.indexOf(group)]
              const rad = (angle * Math.PI) / 180
              return (
                <button
                  key={group}
                  className={`${styles.arcItem} ${styles.muscleBtn}`}
                  style={{
                    left: `calc(50% + ${radius * Math.cos(rad)}px)`,
                    top:  `calc(25% + ${radius * Math.sin(rad)}px)`,
                  }}
                  onClick={() => setActiveModal(group)}
                >
                  {group.toUpperCase()}
                </button>
              )
            })}
          </div>
        )}

        {autoRotate && (
          <div className={styles.hint}>
            <div className={styles.hintIcon}>↻</div>
            Drag to rotate · Tap model to log
          </div>
        )}
      </div>

      {/* ── MODALS ── */}
      {activeModal && (
        <WorkoutModal
          muscleGroup={activeModal}
          onSave={handleSave}
          onClose={() => setActiveModal(null)}
        />
      )}

      {activeTab === 'log' && (
        <div className={styles.assistantWrap}>
          <WorkoutLog userId={userId} />
        </div>
      )}

      {activeTab === 'progress' && (
        <div className={styles.assistantWrap}>
          <Progress userId={userId} />
        </div>
      )}

      <Settings
        open={showSettings}
        onClose={() => setShowSettings(false)}
        userName={userName}
        userEmail={userEmail}
        userId={userId}
        displayName={displayName}
        onUpdateName={name => {
          setDisplayName(name)
          localStorage.setItem(`displayName_${userId}`, name)
        }}
        playing={playing}
        onToggleMusic={() => setPlaying(v => !v)}
        showModel={showModel}
        onToggleModel={() => setShowModel(v => !v)}
        onResetToday={() => {
          setMuscleData(INITIAL_MUSCLE_DATA)
          setSessionData({})
        }}
        signOut={signOut}
      />

      <TabBar activeTab={activeTab} onChange={setActiveTab} />

      {showDayPicker && todayPlanInfo && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 100,
            background: 'rgba(0,0,0,0.8)',
            display: 'flex', alignItems: 'flex-end',
          }}
          onClick={() => setShowDayPicker(false)}
        >
          <div
            style={{
              width: '100%', background: '#111114',
              borderTop: '1px solid #2a2a32',
              borderRadius: '20px 20px 0 0',
              padding: '20px 20px 40px',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ width: 36, height: 4, background: '#2a2a32', borderRadius: 2, margin: '0 auto 20px' }} />
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.1rem', letterSpacing: '0.1em', color: '#f4f4f6', marginBottom: 4 }}>
              PICK A WORKOUT
            </div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.6rem', letterSpacing: '1.5px', color: '#8a8a92', marginBottom: 16 }}>
              {todayPlanInfo.planName?.toUpperCase()} · CHOOSE A DAY TO TRAIN
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {(todayPlanInfo.allSchedule || []).map((block, i) => (
                <button
                  key={i}
                  style={{
                    width: '100%', padding: '14px 16px',
                    background: '#16161a', border: '1px solid #2a2a32',
                    borderRadius: 10, cursor: 'pointer',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    textAlign: 'left',
                  }}
                  onClick={() => {
                    setShowDayPicker(false)
                    setWorkoutModeData({
                      planId: todayPlanInfo.planId || null,
                      exercises: normalizeExercises(block.exercises),
                      dayLabel: block.day.toUpperCase() + ' DAY',
                    })
                  }}
                >
                  <div>
                    <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1rem', letterSpacing: '0.1em', color: '#f4f4f6' }}>
                      {block.day.toUpperCase()}
                    </div>
                    <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.6rem', letterSpacing: '1px', color: '#8a8a92', marginTop: 2 }}>
                      {block.exercises.length} EXERCISES
                    </div>
                  </div>
                  <span style={{ color: '#b8ff3a', fontSize: '1rem' }}>→</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {workoutModeData && (
        <WorkoutMode
          userId={userId}
          planId={workoutModeData.planId}
          exercises={workoutModeData.exercises}
          dayLabel={workoutModeData.dayLabel}
          onExit={() => setWorkoutModeData(null)}
        />
      )}
    </div>
  )
}
