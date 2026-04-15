import { useMemo } from 'react'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend,
} from 'recharts'
import { computeWeeklyVolume, MUSCLE_COLORS } from '../../utils/progressUtils'
import styles from './VolumeBarChart.module.css'

const PARTS = ['chest', 'back', 'shoulders', 'arms', 'legs', 'abs']

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const total = payload.reduce((s, p) => s + (p.value || 0), 0)
  return (
    <div className={styles.tooltip}>
      <div className={styles.tooltipDate}>w/c {label}</div>
      {payload.filter(p => p.value > 0).map(p => (
        <div key={p.dataKey} className={styles.tooltipRow}>
          <span className={styles.tooltipDot} style={{ background: p.fill }} />
          <span className={styles.tooltipName}>{p.dataKey}</span>
          <span className={styles.tooltipVal}>{p.value}s</span>
        </div>
      ))}
      <div className={styles.tooltipTotal}>{total} sets total</div>
    </div>
  )
}

export function VolumeBarChart({ history }) {
  const data = useMemo(() => computeWeeklyVolume(history), [history])

  // Show last 12 weeks max
  const visible = data.slice(-12)

  if (!visible.length) {
    return (
      <div className={styles.wrap}>
        <div className={styles.heading}>Weekly Volume</div>
        <div className={styles.empty}>No data yet — start logging workouts!</div>
      </div>
    )
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.heading}>Weekly Volume</div>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={visible} margin={{ top: 6, right: 8, left: -10, bottom: 0 }} barSize={14}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            unit="s"
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
          <Legend
            wrapperStyle={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', paddingTop: 6 }}
            iconType="circle"
            iconSize={7}
          />
          {PARTS.map(part => (
            <Bar
              key={part}
              dataKey={part}
              stackId="vol"
              fill={MUSCLE_COLORS[part]}
              radius={part === 'chest' ? [3, 3, 0, 0] : [0, 0, 0, 0]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
