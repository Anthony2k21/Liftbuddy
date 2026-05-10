import { useRef, useState } from 'react'
import styles from './RestTimer.module.css'

export function RestTimer({ mmss, seconds, progress, isActive, onSkip, onAddTime }) {
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const dragging = useRef(false)
  const origin = useRef({ mx: 0, my: 0, px: 0, py: 0 })

  const isUrgent = seconds > 0 && seconds <= 10

  if (!isActive && seconds === 0) return null

  const onPointerDown = (e) => {
    if (e.target.closest('button')) return
    dragging.current = true
    const clientX = e.clientX ?? e.touches?.[0]?.clientX ?? 0
    const clientY = e.clientY ?? e.touches?.[0]?.clientY ?? 0
    origin.current = { mx: clientX, my: clientY, px: pos.x, py: pos.y }
    e.currentTarget.setPointerCapture?.(e.pointerId)
  }

  const onPointerMove = (e) => {
    if (!dragging.current) return
    const clientX = e.clientX ?? e.touches?.[0]?.clientX ?? 0
    const clientY = e.clientY ?? e.touches?.[0]?.clientY ?? 0
    setPos({
      x: origin.current.px + (clientX - origin.current.mx),
      y: origin.current.py + (clientY - origin.current.my),
    })
  }

  const onPointerUp = () => { dragging.current = false }

  const circumference = 2 * Math.PI * 28
  const dashOffset = circumference * (1 - progress)

  return (
    <div
      className={`${styles.timer} ${isUrgent ? styles.urgent : ''}`}
      style={{ transform: `translate(${pos.x}px, ${pos.y}px)` }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onTouchStart={onPointerDown}
      onTouchMove={onPointerMove}
      onTouchEnd={onPointerUp}
    >
      <div className={styles.ring}>
        <svg width="68" height="68" viewBox="0 0 68 68">
          <circle cx="34" cy="34" r="28" fill="none" stroke="#2a2a32" strokeWidth="3" />
          <circle
            cx="34" cy="34" r="28"
            fill="none"
            stroke={isUrgent ? '#ff3a6b' : '#b8ff3a'}
            strokeWidth="3"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            transform="rotate(-90 34 34)"
            style={{ transition: 'stroke-dashoffset 1s linear' }}
          />
        </svg>
        <span className={`${styles.display} ${isUrgent ? styles.urgent : ''}`}>{mmss}</span>
      </div>

      <div className={styles.controls}>
        <button className={styles.addBtn} onClick={() => onAddTime(30)}>+30</button>
        <button className={styles.skipBtn} onClick={onSkip}>SKIP</button>
      </div>
    </div>
  )
}
