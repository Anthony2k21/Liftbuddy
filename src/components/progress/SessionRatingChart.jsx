import { useMemo } from 'react'
import {
  ResponsiveContainer, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine,
} from 'recharts'
import styles from './SessionRatingChart.module.css'

const LABEL_COLORS = {
  Perfect:   '#ffd700',
  Legendary: '#ffd700',
  Excellent: '#39ff14',
  Good:      '#39ff14',
  Decent:    '#00e5ff',
  Average:   '#f5a623',
  Poor:      '#ff6bae',
  Disaster:  '#ff3d71',
}

function getLabel(score) {
  if (score >= 10.0) return 'Perfect'
  if (score >= 9.5)  return 'Legendary'
  if (score >= 8.5)  return 'Excellent'
  if (score >= 7.5)  return 'Good'
  if (score >= 6.5)  return 'Decent'
  if (score >= 5.5)  return 'Average'
  if (score >= 4.0)  return 'Poor'
  return 'Disaster'
}

function getBiggestWeightChange(date, history) {
  const todaySessions = history.filter(s => s.date === date)
  const priorHistory  = history.filter(s => s.date < date)
  if (!priorHistory.length) return null

  let biggestChange = null
  let biggestAbs    = 0

  for (const session of todaySessions) {
    for (const set of (session.sets || [])) {
      const weight = parseFloat(set.weight)
      if (!weight) continue

      // Most recent prior session containing the same exercise
      const priorSession = [...priorHistory]
        .reverse()
        .find(s => s.sets?.some(e => e.exercise === set.exercise))
      if (!priorSession) continue

      const priorSet    = priorSession.sets.find(e => e.exercise === set.exercise)
      const priorWeight = parseFloat(priorSet?.weight)
      if (!priorWeight) continue

      const change = weight - priorWeight
      if (Math.abs(change) > biggestAbs) {
        biggestAbs    = Math.abs(change)
        biggestChange = change
      }
    }
  }

  return biggestAbs > 0 ? biggestChange : null
}

function CustomDot({ cx, cy, payload }) {
  if (payload.score == null) return null
  const color = LABEL_COLORS[getLabel(payload.score)] ?? '#00e5ff'
  return <circle cx={cx} cy={cy} r={4} fill={color} stroke="none" />
}

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const { date, score, weightChange } = payload[0].payload
  if (score == null) return null
  const label = getLabel(score)
  const color = LABEL_COLORS[label]
  const isUp  = weightChange > 0
  return (
    <div className={styles.tooltip}>
      <div className={styles.tooltipDate}>{date}</div>
      <div className={styles.tooltipScore} style={{ color }}>
        {score.toFixed(1)} — {label}
      </div>
      {weightChange != null && (
        <div className={styles.tooltipWeight} style={{ color: isUp ? '#39ff14' : '#ff3d71' }}>
          {isUp ? '▲' : '▼'} {Math.abs(weightChange)}kg
        </div>
      )}
    </div>
  )
}

export function SessionRatingChart({ history }) {
  const data = useMemo(() => {
    const byDate = {}
    for (const session of history) {
      if (session.rating != null && !byDate[session.date]) {
        byDate[session.date] = session.rating
      }
    }
    const sorted = Object.entries(byDate)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-30)
    return sorted.map(([date, score]) => ({
      date:         date.slice(5),
      fullDate:     date,
      score,
      weightChange: getBiggestWeightChange(date, history),
    }))
  }, [history])

  if (data.length === 0) {
    return (
      <div className={styles.wrap}>
        <div className={styles.heading}>Session Ratings</div>
        <div className={styles.empty}>No rated sessions yet — log a workout to get your first score.</div>
      </div>
    )
  }

  const avg = data.reduce((s, d) => s + d.score, 0) / data.length

  return (
    <div className={styles.wrap}>
      <div className={styles.headingRow}>
        <span className={styles.heading}>Session Ratings</span>
        <span className={styles.avgBadge}>avg {avg.toFixed(1)}</span>
      </div>
      <ResponsiveContainer width="100%" height={160}>
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis
            dataKey="date"
            tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 9 }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            domain={[1, 10]}
            ticks={[1, 4, 5.5, 6.5, 7.5, 8.5, 10]}
            tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 9 }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine y={7.5} stroke="rgba(57,255,20,0.2)" strokeDasharray="4 4" />
          <Line
            type="monotone"
            dataKey="score"
            stroke="#00e5ff"
            strokeWidth={2}
            dot={<CustomDot />}
            activeDot={{ r: 6, fill: '#00e5ff' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
