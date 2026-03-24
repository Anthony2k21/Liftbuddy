import { useState, useEffect, useRef, useCallback } from 'react'
import { Canvas } from '@react-three/fiber'
import { HumanModel } from './components/Humanmodel'
import { StatsBar } from './components/StatsBar'
import { WorkoutModal } from './components/WorkoutModal'
import { FlatBench } from './components/flat_bench'
import { PullUpBar } from './components/pull_up_bar'
import { BoxingBag } from './components/boxing_bag'
import { TabBar } from './components/TabBar'
import { AiAssistant } from './components/AiAssistant'
import { useWorkoutHistory } from './hooks/useWorkoutHistory'
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

function setsToLevel(count) {
  if (count === 0) return 'rest'
  if (count <= 2)  return 'low'
  if (count <= 5)  return 'med'
  return 'high'
}

export default function App() {
  const [muscleData, setMuscleData]   = useState(() => {
    const saved = localStorage.getItem('muscleData')
    return saved ? JSON.parse(saved) : INITIAL_MUSCLE_DATA
  })
  const [sessionData, setSessionData] = useState({})
  const [activeModal, setActiveModal] = useState(null)
  const { logSession, history }       = useWorkoutHistory()

  useEffect(() => {
    localStorage.setItem('muscleData', JSON.stringify(muscleData))
  }, [muscleData])
  const [activeTab, setActiveTab]     = useState('workout')
  const [autoRotate, setAutoRotate]   = useState(true)
  const [rotY, setRotY]               = useState(0)
  const [rotX, setRotX]               = useState(0)
  const [showArcUI, setShowArcUI]     = useState(false)

  const dragging    = useRef(false)
  const prevPos     = useRef({ x: 0, y: 0 })
  const currentRotY = useRef(0)
  const currentRotX = useRef(0)

  const weekNum = Math.ceil(
    (new Date() - new Date(new Date().getFullYear(), 0, 1)) / 604800000
  )

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
    const dy = y - prevPos.current.y
    currentRotY.current += dx * 0.008
    currentRotX.current += dy * 0.005
    currentRotX.current  = Math.max(-0.5, Math.min(0.5, currentRotX.current))
    prevPos.current = { x, y }
    setRotY(currentRotY.current)
    setRotX(currentRotX.current)
  }, [])

  const onPointerUp = useCallback(() => {
    dragging.current = false
  }, [])

  return (
    <div className={styles.app}>

      <header className={styles.header}>
        <h1 className={styles.title}>No1Assist</h1>
        <span className={styles.weekLabel}>
          Week {weekNum} · {new Date().getFullYear()}
        </span>
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
            rotX={rotX}
            onClickModel={() => setShowArcUI(v => !v)}
          />
        </Canvas>

        <div className={styles.scanlines} />
        <div className={styles.gradientTop} />
        <div className={styles.gradientBottom} />

        {showArcUI && (
          <div className={styles.arcOverlay}>
            {Object.keys(INITIAL_MUSCLE_DATA).map((group, i) => {
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
                    top:  `calc(48% + ${y}px)`,
                    animationDelay: `${i * 60}ms`,
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

 

        {autoRotate && (
          <div className={styles.hint}>
            <div className={styles.hintIcon}>↻</div>
            Drag to rotate · Tap muscle to log
          </div>
        )}

        <StatsBar muscleData={muscleData} sessionData={sessionData} />
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
          <AiAssistant muscleData={muscleData} history={history} onLogWorkout={handleSave} />
        </div>
      )}

      <TabBar activeTab={activeTab} onChange={setActiveTab} />

    </div>
  )
}