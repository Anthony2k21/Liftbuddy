import { Text } from '@react-three/drei'
import * as THREE from 'three'

const BORDER_COLOR = '#a56bff'
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

export function WorkoutLogBoard() {
  const boards    = loadBoards()
  const completed = loadCompleted()

  const rows = []
  let y = BOARD_H / 2 - 0.1

  rows.push(
    <Text key="title" position={[0, y, 0.005]} fontSize={0.038} color={BORDER_COLOR}
      anchorX="center" anchorY="top" letterSpacing={0.15}>
      WORKOUT LOG
    </Text>
  )
  y -= 0.07

  rows.push(
    <mesh key="div" position={[0, y, 0.003]}>
      <planeGeometry args={[BOARD_W - 0.06, 0.005]} />
      <meshBasicMaterial color={BORDER_COLOR} opacity={0.2} transparent />
    </mesh>
  )
  y -= 0.05

  if (boards.length === 0) {
    rows.push(
      <Text key="empty" position={[0, y, 0.005]} fontSize={0.03} color="#444444"
        anchorX="center" anchorY="top">
        No boards yet
      </Text>
    )
  } else {
    for (const b of boards.slice(0, 4)) {
      rows.push(
        <Text key={`b-${b.id}`} position={[-BOARD_W / 2 + 0.05, y, 0.005]}
          fontSize={0.032} color={b.color} anchorX="left" anchorY="top" letterSpacing={0.06}>
          {`${completed.has(b.id) ? '✓' : b.emoji}  ${b.name.toUpperCase()}`}
        </Text>
      )
      y -= 0.052

      for (const ex of b.exercises.slice(0, 3)) {
        const label = `${ex.name}   ${ex.sets}×${ex.reps}${ex.weight ? `   ${ex.weight}kg` : ''}`
        rows.push(
          <Text key={`${b.id}-${ex.id}`} position={[-BOARD_W / 2 + 0.07, y, 0.005]}
            fontSize={0.022} color="#7a8a98" anchorX="left" anchorY="top" maxWidth={BOARD_W - 0.1}>
            {label}
          </Text>
        )
        y -= 0.038
      }

      if (b.exercises.length > 3) {
        rows.push(
          <Text key={`${b.id}-more`} position={[-BOARD_W / 2 + 0.07, y, 0.005]}
            fontSize={0.02} color="#444" anchorX="left" anchorY="top">
            {`+${b.exercises.length - 3} more`}
          </Text>
        )
        y -= 0.032
      }

      y -= 0.018
    }
  }

  return (
    <group position={[-0.6, -0.1, -1.2]} rotation={[0, 0.45, 0]}>
      <mesh>
        <planeGeometry args={[BOARD_W, BOARD_H]} />
        <meshStandardMaterial color="#06101e" opacity={0.88} transparent />
      </mesh>
      <BoardBorder w={BOARD_W} h={BOARD_H} />
      {rows}
    </group>
  )
}
