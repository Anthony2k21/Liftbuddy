import { useState, useEffect } from 'react'
import { Text } from '@react-three/drei'
import * as THREE from 'three'
import { getWorkoutPlans, getSelectedPlanId, getDailyTrackerDate } from '../lib/db'

const BEBAS = '/fonts/bebas-neue.woff'

const BORDER_COLOR = '#000000'
const BOARD_W = 0.75
const BOARD_H = 1.6

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


const WORKOUT_DAYS_BY_FREQ = {
  1: [0], 2: [0,3], 3: [0,2,4], 4: [0,1,3,4],
  5: [0,1,2,3,4], 6: [0,1,2,3,4,5], 7: [0,1,2,3,4,5,6],
}

const TODAY = new Date().toISOString().slice(0, 10)

async function fetchActivePlanDay(userId) {
  const [plans, selectedId] = await Promise.all([
    getWorkoutPlans(userId),
    getSelectedPlanId(userId),
  ])
  const plan = plans.find(p => p.id === selectedId)
  if (!plan || !plan.schedule?.length) return null
  const dowMon = (new Date().getDay() + 6) % 7
  const workoutDays = WORKOUT_DAYS_BY_FREQ[plan.daysPerWeek] || []
  const idx = workoutDays.indexOf(dowMon)
  if (idx === -1) return { planId: plan.id, planName: plan.name, color: plan.color, day: null }
  return { planId: plan.id, planName: plan.name, color: plan.color, day: plan.schedule[idx % plan.schedule.length] }
}


const BAR_W = BOARD_W - 0.1
const BAR_H = 0.016

export function WorkoutLogBoard({ userId }) {
  const [planInfo, setPlanInfo]         = useState(null)
  const [todayProgress, setTodayProgress] = useState({})

  useEffect(() => {
    if (!userId) return
    fetchActivePlanDay(userId).then(info => {
      setPlanInfo(info)
      if (info?.day) {
        const boardId = `plan_${info.planId}_${info.day.day}`
        getDailyTrackerDate(userId, TODAY).then(data => {
          setTodayProgress(data?.[boardId] || {})
        })
      }
    })
  }, [userId])

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
    const exercises = planInfo.day.exercises
    const total = exercises.length
    const done  = exercises.filter((_, i) => todayProgress[i]?.done).length
    const pct   = total > 0 ? done / total : 0

    // Progress bar
    rows.push(
      <group key="prog-bar" position={[0, y, 0.005]}>
        <mesh>
          <planeGeometry args={[BAR_W, BAR_H]} />
          <meshBasicMaterial color="#111111" />
        </mesh>
        {pct > 0 && (
          <mesh position={[-BAR_W / 2 + (BAR_W * pct) / 2, 0, 0.001]}>
            <planeGeometry args={[BAR_W * pct, BAR_H]} />
            <meshBasicMaterial color={planInfo.color} opacity={0.9} transparent />
          </mesh>
        )}
        <Text position={[BAR_W / 2 + 0.03, 0, 0.002]} fontSize={0.016} color={planInfo.color}
          anchorX="left" anchorY="middle">
          {`${done}/${total}`}
        </Text>
      </group>
    )
    y -= 0.036

    for (const [i, ex] of exercises.slice(0, 5).entries()) {
      const isDone = !!todayProgress[i]?.done
      const weight = todayProgress[i]?.weight
      const exColor = isDone ? planInfo.color : '#ffffff'

      rows.push(
        <Text key={`pex-${ex.name}`} position={[-BOARD_W / 2 + 0.05, y, 0.005]}
          fontSize={0.024} color={exColor} anchorX="left" anchorY="top"
          letterSpacing={0.04} maxWidth={BOARD_W - 0.12}>
          {`${isDone ? '✓ ' : ''}${ex.name}`}
        </Text>
      )
      y -= 0.034
      rows.push(
        <Text key={`pex-meta-${ex.name}`} position={[-BOARD_W / 2 + 0.07, y, 0.005]}
          fontSize={0.019} color={isDone ? planInfo.color : 'rgba(255,255,255,0.45)'}
          anchorX="left" anchorY="top">
          {`${ex.sets}×${ex.reps}${weight ? `  ${weight}kg` : ''}`}
        </Text>
      )
      y -= 0.030
    }
    if (exercises.length > 5) {
      rows.push(
        <Text key="pex-more" position={[-BOARD_W / 2 + 0.07, y, 0.005]}
          fontSize={0.02} color="#ffffff" anchorX="left" anchorY="top">
          {`+${exercises.length - 5} more`}
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
    rows.push(
      <Text key="noplan" position={[0, y, 0.005]} fontSize={0.026}
        color="rgba(255,255,255,0.4)" anchorX="center" anchorY="top" maxWidth={BOARD_W - 0.1}>
        SELECT A PLAN IN WORKOUT LOG
      </Text>
    )
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
