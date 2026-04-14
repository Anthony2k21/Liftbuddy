import { useState, useEffect, useRef, useCallback } from 'react'
import { Canvas } from '@react-three/fiber'
import { HumanModel } from './components/Humanmodel'
import { WorkoutModal } from './components/WorkoutModal'
import { FlatBench } from './components/flat_bench'
import { PullUpBar } from './components/pull_up_bar'
import { BoxingBag } from './components/boxing_bag'
import { TabBar } from './components/TabBar'
import { AiAssistant } from './components/AiAssistant'
import { InfoBoard } from './components/InfoBoard'
import { WorkoutLogBoard } from './components/WorkoutLogBoard'
import { WorkoutLog } from './components/WorkoutLog'
import { DailyTracker } from './components/DailyTracker'
import { useWorkoutHistory } from './hooks/useWorkoutHistory'
import { useAuth } from './contexts/AuthContext'
import { AuthScreen } from './components/AuthScreen'
import { getMuscleCalendar, saveMuscleDay } from './lib/db'
// import { GymFloor } from './components/GymFloor'
// import { GymWall } from './components/GymWall'
import './index.css'
import styles from './App.module.css'

const INITIAL_MUSCLE_DATA = {
  chest:     'rest',
  shoulders: 'rest',
  abs:       'rest',
  arms:      'rest',
  back:      'rest',
  legs:      'rest',
}

function todayKey() {
  return new Date().toISOString().slice(0, 10)
}

function setsToLevel(count) {
  if (count === 0) return 'rest'
  if (count <= 2)  return 'low'
  if (count <= 5)  return 'med'
  return 'high'
}

export default function App() {
  const { session, user, signOut } = useAuth()

  if (session === undefined) return (
    <div style={{ background: '#000', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '0.8rem', letterSpacing: '2px' }}>
      LOADING…
    </div>
  )

  if (!session) return <AuthScreen />

  const userName = user?.user_metadata?.name || user?.email?.split('@')[0] || 'Anthony'

  return <AppInner userName={userName} userId={user.id} signOut={signOut} />
}


function AppInner({ userName, userId, signOut }) {
  const [muscleData, setMuscleData]   = useState(INITIAL_MUSCLE_DATA)
  const [sessionData, setSessionData] = useState({})
  const [activeModal, setActiveModal] = useState(null)
  const { logSession, history }       = useWorkoutHistory(userId)

  // Load today's muscle state from Supabase on mount
  useEffect(() => {
    getMuscleCalendar(userId).then(calendar => {
      const today = calendar[todayKey()]
      if (today) setMuscleData(today)
    })
  }, [userId])

  // Save muscle state to Supabase whenever it changes
  useEffect(() => {
    saveMuscleDay(userId, todayKey(), muscleData)
  }, [muscleData, userId])
  const [activeTab, setActiveTab]     = useState('workout')
  const [autoRotate, setAutoRotate]   = useState(true)
  const [rotY, setRotY] = useState(0)
  const [showArcUI, setShowArcUI]               = useState(false)
  const [showSessionBoard, setShowSessionBoard] = useState(false)
  const [showWorkoutBoard, setShowWorkoutBoard] = useState(false)
  const [playing, setPlaying]                   = useState(false)
  const audioRef                                = useRef(null)
  const [animationNames, setAnimationNames]     = useState([])
  const [activeAnimation, setActiveAnimation]   = useState(null)
  const animInitialized                         = useRef(false)

  const QUOTES = [
    { text: "The only bad workout is the one that didn't happen.", author: "Unknown" },
    { text: "Push yourself because no one else is going to do it for you.", author: "Unknown" },
    { text: "Strength does not come from the body. It comes from the will.", author: "Unknown" },
    { text: "The pain you feel today will be the strength you feel tomorrow.", author: "Unknown" },
    { text: "Don't limit your challenges. Challenge your limits.", author: "Unknown" },
    { text: "It never gets easier. You just get stronger.", author: "Unknown" },
    { text: "Your body can stand almost anything. It's your mind you have to convince.", author: "Unknown" },
    { text: "Success starts with self-discipline.", author: "Unknown" },
    { text: "Train insane or remain the same.", author: "Unknown" },
    { text: "Wake up. Work out. Look hot. Kick ass.", author: "Unknown" },
    { text: "Sweat is just fat crying.", author: "Unknown" },
    { text: "Be stronger than your excuses.", author: "Unknown" },
  ]
  const [quoteIdx, setQuoteIdx] = useState(() => Math.floor(Math.random() * 12))

  useEffect(() => {
    if (!audioRef.current) return
    if (playing) {
      audioRef.current.play().catch(() => {})
    } else {
      audioRef.current.pause()
    }
  }, [playing])

  // Pick a random animation on load, then cycle every 12 seconds
  useEffect(() => {
    if (animationNames.length === 0 || animInitialized.current) return
    animInitialized.current = true

    const pick = (exclude) => {
      const pool = exclude
        ? animationNames.filter(n => n !== exclude)
        : animationNames
      return pool.length > 0
        ? pool[Math.floor(Math.random() * pool.length)]
        : animationNames[0]
    }

    setActiveAnimation(pick())

    const interval = setInterval(() => {
      setActiveAnimation(prev => pick(prev))
    }, 12000)

    return () => clearInterval(interval)
  }, [animationNames])

  useEffect(() => {
    const interval = setInterval(() => {
      setQuoteIdx(i => (i + 1) % QUOTES.length)
    }, 18000)
    return () => clearInterval(interval)
  }, [QUOTES.length])

  const dragging    = useRef(false)
  const prevPos     = useRef({ x: 0, y: 0 })
  const currentRotY = useRef(0)

  const weekNum = Math.ceil(
    (new Date() - new Date(new Date().getFullYear(), 0, 1)) / 604800000
  )

  function handleUpdateBoards(boards) {
    const withIds = boards.map((b, i) => ({
      ...b,
      id: Date.now() + i,
      open: i === 0,
      exercises: b.exercises.map((e, j) => ({ ...e, id: j + 1 }))
    }))
    localStorage.setItem('workoutBoards', JSON.stringify(withIds))
    window.dispatchEvent(new Event('storage'))
  }

  function handleCreatePlan(plan) {
    const existing = JSON.parse(localStorage.getItem('workoutPlans') || '[]')
    const newPlan = { ...plan, id: Date.now() }
    localStorage.setItem('workoutPlans', JSON.stringify([...existing, newPlan]))
    localStorage.setItem('selectedPlanId', JSON.stringify(newPlan.id))
    window.dispatchEvent(new Event('storage'))
  }

  function handleSave({ muscleGroup, sets }) {
    setSessionData(prev => ({ ...prev, [muscleGroup]: sets }))
    setMuscleData(prev => ({
      ...prev,
      [muscleGroup]: setsToLevel(sets.reduce((total, e) => total + parseInt(e.sets, 10), 0))
    }))
    logSession({ muscleGroup, sets })
  }

  const onPointerDown = useCallback((e) => {
    dragging.current = true
    prevPos.current  = {
      x: e.clientX ?? e.touches?.[0]?.clientX,
      y: e.clientY ?? e.touches?.[0]?.clientY
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

  const onPointerUp = useCallback(() => {
    dragging.current = false
  }, [])

  return (
    <div className={styles.app}>

      <audio ref={audioRef} src="/music.mp3" loop />

      <header className={styles.header}>
        <div className={styles.titleGroup}>
          <h1 className={styles.title}>No1Assist</h1>
          <span className={styles.welcomeText}>Welcome back, {userName}</span>
        </div>
        <div className={styles.headerRight}>
          <span className={styles.weekLabel}>
            Week {weekNum} · {new Date().getFullYear()}
          </span>
          <button className={styles.signOutBtn} onClick={signOut} title="Sign out">⏻</button>
        </div>
      </header>

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
          camera={{ position: [0, 0, 2.5], fov: 40}}
          gl={{ antialias: true, alpha: true }}
          style={{ background: "transparent" }}
        >
          {/* <GymWall />
          <GymFloor /> */}
          <FlatBench position={[-1.1, -1.0, -2.7]} scale={0.75} />
          <BoxingBag position={[-1.0, 0.0, -2.5]} scale={0.75} />
          <PullUpBar
            position={[1.0, -1.0, -2.5]}
            scale={0.009}
            rotation={[0, Math.PI / -4, 0]}
          />
          <HumanModel
            muscleData={muscleData}
            autoRotate={autoRotate}
            rotY={rotY}
            onClickModel={() => setShowArcUI(v => !v)}
            activeAnimation={activeAnimation}
            onAnimationsLoaded={setAnimationNames}
          />
          {showSessionBoard && (
            <InfoBoard
              sessionData={sessionData}
              muscleData={muscleData}
              onEdit={setActiveModal}
            />
          )}
          {showWorkoutBoard && <WorkoutLogBoard />}
        </Canvas>

        <div className={styles.scanlines} />
        <div className={styles.gradientTop} />
        <div className={styles.gradientBottom} />

        <div className={styles.quoteOverlay}>
          <p key={quoteIdx} className={styles.quoteText}>"{QUOTES[quoteIdx].text}"</p>
        </div>

        {showArcUI && (
          <div className={styles.arcOverlay} onMouseDown={e => e.stopPropagation()} onTouchStart={e => e.stopPropagation()}>
            {Object.keys(INITIAL_MUSCLE_DATA).map((group) => {
              // Front muscles arc on the left, other muscles arc on the right
              const leftGroups  = ['shoulders', 'chest', 'abs']
              const rightGroups = ['arms', 'back', 'legs']
              const leftAngles  = [225, 195, 160]   // upper-left → lower-left
              const rightAngles = [315, 345, 20]    // upper-right → lower-right
              const radius = 120

              let angle
              if (leftGroups.includes(group)) {
                angle = leftAngles[leftGroups.indexOf(group)]
              } else {
                angle = rightAngles[rightGroups.indexOf(group)]
              }

              const rad = (angle * Math.PI) / 180
              const x   = radius * Math.cos(rad)
              const y   = radius * Math.sin(rad)

              return (
                <button
                  key={group}
                  className={`${styles.arcItem} ${styles.muscleBtn}`}
                  style={{
                    left: `calc(50% + ${x}px)`,
                    top:  `calc(25% + ${y}px)`,
                    animationDelay: `0ms`,
                  }}
                  onClick={() => setActiveModal(group)}
                >
                  {group.toUpperCase()}
                </button>
              )
            })}
          </div>
        )}

        {/* Legend */}
        <div className={styles.legend}>
          {[
            { cls: styles.dotHigh, label: 'High' },
            { cls: styles.dotMed,  label: 'Med'  },
            { cls: styles.dotLow,  label: 'Low'  },
            { cls: styles.dotRest, label: 'Rest' },
          ].map(({ cls, label }) => (
            <div key={label} className={styles.legendItem}>
              <div className={`${styles.dot} ${cls}`} />
              {label}
            </div>
          ))}
        </div>

 

<div className={styles.boardToggles}>
          <button
            className={`${styles.boardToggleBtn} ${showSessionBoard ? styles.boardToggleActive : ''}`}
            onClick={e => { e.stopPropagation(); setShowSessionBoard(v => !v) }}
          >
            SESSION LOG
          </button>
          <button
            className={`${styles.boardToggleBtn} ${showWorkoutBoard ? styles.boardToggleActive : ''}`}
            onClick={e => { e.stopPropagation(); setShowWorkoutBoard(v => !v) }}
          >
            WORKOUT LOG
          </button>
        </div>

        {autoRotate && (
          <div className={styles.hint}>
            <div className={styles.hintIcon}>↻</div>
            Drag to rotate · Tap muscle to log
          </div>
        )}


      </div>

      {activeModal && (
        <WorkoutModal
          muscleGroup={activeModal}
          onSave={handleSave}
          onClose={() => setActiveModal(null)}
        />
      )}

      {activeTab === 'assistant' && (
        <div className={styles.assistantWrap}>
          <AiAssistant muscleData={muscleData} history={history} onLogWorkout={handleSave} onUpdateBoards={handleUpdateBoards} onCreatePlan={handleCreatePlan} />
        </div>
      )}

      {activeTab === 'log' && (
        <div className={styles.assistantWrap}>
          <WorkoutLog userId={userId} />
        </div>
      )}

      {activeTab === 'tracker' && (
        <div className={styles.assistantWrap}>
          <DailyTracker
            userId={userId}
            onMuscleUpdate={(part, level) => setMuscleData(prev => ({ ...prev, [part]: level }))}
            onSessionUpdate={(part, sets, date) => {
              if (!date || date === todayKey()) {
                setSessionData(prev => ({ ...prev, [part]: sets }))
              }
              logSession({ muscleGroup: part, sets }, date)
            }}
          />
        </div>
      )}

      <TabBar activeTab={activeTab} onChange={setActiveTab} />

    </div>
  )
}