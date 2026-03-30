import { Text } from '@react-three/drei'
import * as THREE from 'three'

const LEVEL_COLOR = { high: '#39ff14', med: '#00e5ff', low: '#ff3d71', rest: '#555555' }
const BORDER_COLOR = '#00e5ff'
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

export function InfoBoard({ sessionData, muscleData }) {
  const logged = Object.entries(sessionData).filter(([, sets]) => sets?.length)

  const rows = []
  let y = BOARD_H / 2 - 0.1

  // Title
  rows.push(
    <Text key="title" position={[0, y, 0.005]} fontSize={0.038} color={BORDER_COLOR}
      anchorX="center" anchorY="top" letterSpacing={0.15} font={undefined}>
      SESSION LOG
    </Text>
  )
  y -= 0.07

  // Divider
  rows.push(
    <mesh key="div" position={[0, y, 0.003]}>
      <planeGeometry args={[BOARD_W - 0.06, 0.005]} />
      <meshBasicMaterial color={BORDER_COLOR} opacity={0.2} transparent />
    </mesh>
  )
  y -= 0.045

  if (logged.length === 0) {
    rows.push(
      <Text key="empty" position={[0, y, 0.005]} fontSize={0.03} color="#444444"
        anchorX="center" anchorY="top">
        No exercises logged
      </Text>
    )
  } else {
    for (const [group, sets] of logged) {
      const col = LEVEL_COLOR[muscleData[group]] ?? '#aaaaaa'
      rows.push(
        <Text key={`g-${group}`} position={[-BOARD_W / 2 + 0.05, y, 0.005]}
          fontSize={0.033} color={col} anchorX="left" anchorY="top" letterSpacing={0.08}>
          {group.toUpperCase()}
        </Text>
      )
      y -= 0.055
      for (const s of sets) {
        const label = `${s.exercise}   ${s.sets}×${s.reps}${s.weight ? `   ${s.weight}kg` : ''}`
        rows.push(
          <Text key={`${group}-${s.exercise}`} position={[-BOARD_W / 2 + 0.07, y, 0.005]}
            fontSize={0.024} color="#7a8a98" anchorX="left" anchorY="top" maxWidth={BOARD_W - 0.1}>
            {label}
          </Text>
        )
        y -= 0.042
      }
      y -= 0.01
    }
  }

  return (
    <group position={[0.35, -0.1, -1.2]} rotation={[0, -0.25, 0]}>
      {/* Board backing */}
      <mesh>
        <planeGeometry args={[BOARD_W, BOARD_H]} />
        <meshStandardMaterial color="#06101e" opacity={0.88} transparent />
      </mesh>

      <BoardBorder w={BOARD_W} h={BOARD_H} />

      {rows}
    </group>
  )
}
