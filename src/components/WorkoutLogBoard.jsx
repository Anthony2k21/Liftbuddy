import { Text } from '@react-three/drei'
import * as THREE from 'three'

const BEBAS = '/fonts/bebas-neue.woff'

const BORDER_COLOR = '#000000'
const BOARD_W = 0.75
const BOARD_H = 1.6
const BAR_W = BOARD_W - 0.1
const BAR_H = 0.016

const MUSCLE_COLOR = {
  chest:     '#4f6cff',
  back:      '#a56bff',
  shoulders: '#00e5ff',
  arms:      '#f5a623',
  abs:       '#ff3d71',
  legs:      '#39ff14',
}

const MUSCLE_ORDER = ['chest', 'back', 'shoulders', 'arms', 'abs', 'legs']

function BoardBorder({ w, h }) {
  const shape = new THREE.Shape()
  const r = 0.03
  shape.moveTo(-w / 2 + r, -h / 2)
  shape.lineTo( w / 2 - r, -h / 2)
  shape.quadraticCurveTo( w / 2, -h / 2,  w / 2, -h / 2 + r)
  shape.lineTo( w / 2,  h / 2 - r)
  shape.quadraticCurveTo( w / 2,  h / 2,  w / 2 - r,  h / 2)
  shape.lineTo(-w / 2 + r,  h / 2)
  shape.quadraticCurveTo(-w / 2,  h / 2, -w / 2,  h / 2 - r)
  shape.lineTo(-w / 2, -h / 2 + r)
  shape.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2)

  const inner = new THREE.Path()
  const t = 0.012
  inner.moveTo(-w / 2 + r + t, -h / 2 + t)
  inner.lineTo( w / 2 - r - t, -h / 2 + t)
  inner.quadraticCurveTo( w / 2 - t, -h / 2 + t,  w / 2 - t, -h / 2 + r + t)
  inner.lineTo( w / 2 - t,  h / 2 - r - t)
  inner.quadraticCurveTo( w / 2 - t,  h / 2 - t,  w / 2 - r - t,  h / 2 - t)
  inner.lineTo(-w / 2 + r + t,  h / 2 - t)
  inner.quadraticCurveTo(-w / 2 + t,  h / 2 - t, -w / 2 + t,  h / 2 - r - t)
  inner.lineTo(-w / 2 + t, -h / 2 + r + t)
  inner.quadraticCurveTo(-w / 2 + t, -h / 2 + t, -w / 2 + r + t, -h / 2 + t)
  shape.holes.push(inner)

  return (
    <mesh position={[0, 0, 0.002]}>
      <shapeGeometry args={[shape]} />
      <meshBasicMaterial color={BORDER_COLOR} opacity={0.5} transparent />
    </mesh>
  )
}


function loadBoards() {
  try {
    const saved = localStorage.getItem('workoutBoards')
    return saved ? JSON.parse(saved) : []
  } catch { return [] }
}

function loadCompleted() {
  try {
    const saved = localStorage.getItem('completedBoards')
    return saved ? new Set(JSON.parse(saved)) : new Set()
  } catch { return new Set() }
}

const WORKOUT_DAYS_BY_FREQ = {
  1: [0], 2: [0,3], 3: [0,2,4], 4: [0,1,3,4],
  5: [0,1,2,3,4], 6: [0,1,2,3,4,5], 7: [0,1,2,3,4,5,6],
}

function loadActivePlanDay() {
  try {
    const id    = JSON.parse(localStorage.getItem('selectedPlanId'))
    const plans = JSON.parse(localStorage.getItem('workoutPlans') || '[]')
    const plan  = plans.find(p => p.id === id)
    if (!plan || !plan.schedule?.length) return null
    const dowMon = (new Date().getDay() + 6) % 7
    const workoutDays = WORKOUT_DAYS_BY_FREQ[plan.daysPerWeek] || []
    const idx = workoutDays.indexOf(dowMon)
    if (idx === -1) return { planName: plan.name, color: plan.color, day: null }
    return { planName: plan.name, color: plan.color, day: plan.schedule[idx % plan.schedule.length] }
  } catch { return null }
}


const LEVEL_PCT = { rest: 0, low: 0.33, med: 0.66, high: 1.0 }
const LEVEL_LABEL = { rest: 'REST', low: 'LOW', med: 'MED', high: 'HIGH' }

export function WorkoutLogBoard({ muscleData = {} }) {
  const planInfo  = loadActivePlanDay()
  const boards    = loadBoards()
  const completed = loadCompleted()

  const rows = []
  let y = BOARD_H / 2 - 0.1

  // Title
  const titleText = planInfo?.day ? planInfo.day.day.toUpperCase() + ' DAY' : 'WORKOUT LOG'
  rows.push(
    <Text key="title" position={[0, y, 0.005]} fontSize={0.052} color="#ffffff"
      anchorX="center" anchorY="top" letterSpacing={0.15} font={BEBAS}>
      {titleText}
    </Text>
  )
  y -= 0.05

  if (planInfo) {
    rows.push(
      <Text key="planname" position={[0, y, 0.005]} fontSize={0.022}
        color={planInfo.color} anchorX="center" anchorY="top" letterSpacing={0.08}>
        {planInfo.planName.toUpperCase()}
      </Text>
    )
    y -= 0.04
  }

  rows.push(
    <mesh key="div" position={[0, y, 0.003]}>
      <planeGeometry args={[BOARD_W - 0.06, 0.005]} />
      <meshBasicMaterial color={BORDER_COLOR} opacity={0.2} transparent />
    </mesh>
  )
  y -= 0.05

  // Show active plan day exercises, or fall back to boards
  if (planInfo && planInfo.day) {
    for (const ex of planInfo.day.exercises.slice(0, 6)) {
      rows.push(
        <Text key={`pex-${ex.name}`} position={[-BOARD_W / 2 + 0.05, y, 0.005]}
          fontSize={0.026} color="#ffffff" anchorX="left" anchorY="top"
          letterSpacing={0.04} maxWidth={BOARD_W - 0.08}>
          {`${ex.name}`}
        </Text>
      )
      y -= 0.036
      rows.push(
        <Text key={`pex-meta-${ex.name}`} position={[-BOARD_W / 2 + 0.07, y, 0.005]}
          fontSize={0.020} color={planInfo.color} anchorX="left" anchorY="top">
          {`${ex.sets} sets × ${ex.reps} reps`}
        </Text>
      )
      y -= 0.032
    }
    if (planInfo.day.exercises.length > 6) {
      rows.push(
        <Text key="pex-more" position={[-BOARD_W / 2 + 0.07, y, 0.005]}
          fontSize={0.02} color="#ffffff" anchorX="left" anchorY="top">
          {`+${planInfo.day.exercises.length - 6} more`}
        </Text>
      )
      y -= 0.028
    }
  } else if (planInfo && !planInfo.day) {
    rows.push(
      <Text key="rest" position={[0, y, 0.005]} fontSize={0.03} color="#ffffff"
        anchorX="center" anchorY="top" letterSpacing={0.08}>
        REST DAY
      </Text>
    )
    y -= 0.05
  } else {
    // No active plan — show boards
    if (boards.length === 0) {
      rows.push(
        <Text key="empty" position={[0, y, 0.005]} fontSize={0.03} color="#ffffff"
          anchorX="center" anchorY="top">
          No boards yet
        </Text>
      )
      y -= 0.05
    } else {
      for (const b of boards.slice(0, 4)) {
        rows.push(
          <Text key={`b-${b.id}`} position={[-BOARD_W / 2 + 0.05, y, 0.005]}
            fontSize={0.032} color="#ffffff" anchorX="left" anchorY="top" letterSpacing={0.06} font={BEBAS}>
            {`${completed.has(b.id) ? '✓' : b.emoji}  ${b.name.toUpperCase()}`}
          </Text>
        )
        y -= 0.048
        for (const ex of b.exercises.slice(0, 2)) {
          const label = `${ex.name}   ${ex.sets}×${ex.reps}${ex.weight ? `   ${ex.weight}kg` : ''}`
          rows.push(
            <Text key={`${b.id}-${ex.id}`} position={[-BOARD_W / 2 + 0.07, y, 0.005]}
              fontSize={0.022} color="#ffffff" anchorX="left" anchorY="top" maxWidth={BOARD_W - 0.1}>
              {label}
            </Text>
          )
          y -= 0.034
        }
        if (b.exercises.length > 2) {
          rows.push(
            <Text key={`${b.id}-more`} position={[-BOARD_W / 2 + 0.07, y, 0.005]}
              fontSize={0.02} color="#ffffff" anchorX="left" anchorY="top">
              {`+${b.exercises.length - 2} more`}
            </Text>
          )
          y -= 0.028
        }
        y -= 0.014
      }
    }
  }

  // Divider before body parts
  y -= 0.01
  rows.push(
    <mesh key="div2" position={[0, y, 0.003]}>
      <planeGeometry args={[BOARD_W - 0.06, 0.004]} />
      <meshBasicMaterial color={BORDER_COLOR} opacity={0.15} transparent />
    </mesh>
  )
  y -= 0.03

  rows.push(
    <Text key="bptitle" position={[0, y, 0.005]} fontSize={0.022} color="#ffffff"
      anchorX="center" anchorY="top" letterSpacing={0.1}>
      TODAY'S PROGRESS
    </Text>
  )
  y -= 0.036

  // Body part progress bars — driven by muscleData intensity
  for (const muscle of MUSCLE_ORDER) {
    const level = muscleData[muscle] ?? 'rest'
    const pct   = LEVEL_PCT[level] ?? 0
    const color = MUSCLE_COLOR[muscle]
    const label = LEVEL_LABEL[level] ?? 'REST'

    rows.push(
      <Text key={`ml-${muscle}`} position={[-BOARD_W / 2 + 0.05, y, 0.005]}
        fontSize={0.021} color={color} anchorX="left" anchorY="middle">
        {muscle.toUpperCase()}
      </Text>
    )

    rows.push(
      <group key={`mbg-${muscle}`} position={[0.07, y, 0.005]}>
        <mesh>
          <planeGeometry args={[BAR_W * 0.62, BAR_H]} />
          <meshBasicMaterial color="#111111" />
        </mesh>
        {pct > 0 && (
          <mesh position={[-(BAR_W * 0.62) / 2 + (BAR_W * 0.62 * pct) / 2, 0, 0.001]}>
            <planeGeometry args={[BAR_W * 0.62 * pct, BAR_H]} />
            <meshBasicMaterial color={color} opacity={0.85} transparent />
          </mesh>
        )}
        <Text position={[(BAR_W * 0.62) / 2 + 0.03, 0, 0.002]} fontSize={0.016} color={color}
          anchorX="left" anchorY="middle">
          {label}
        </Text>
      </group>
    )

    y -= 0.100
  }

  return (
    <group position={[-0.35, -0.1, -1.2]} rotation={[0, 0.25, 0]}>
      {/* Edge rim highlight (behind) */}
      <mesh position={[0, 0, -0.045]}>
        <boxGeometry args={[BOARD_W + 0.006, BOARD_H + 0.006, 0.04]} />
        <meshStandardMaterial color={BORDER_COLOR} opacity={0.15} transparent />
      </mesh>
      {/* Board body with thickness */}
      <mesh position={[0, 0, -0.02]}>
        <boxGeometry args={[BOARD_W, BOARD_H, 0.04]} />
        <meshStandardMaterial color="#000000" opacity={0.92} transparent />
      </mesh>
      <BoardBorder w={BOARD_W} h={BOARD_H} />
      {rows}
    </group>
  )
}
