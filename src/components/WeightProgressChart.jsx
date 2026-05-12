import { useState, useMemo, useEffect, useCallback } from 'react'
import { fetchProgressHistory } from '../lib/supabase/progress'
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ReferenceDot,
} from 'recharts'
import styles from './WeightProgressChart.module.css'

const LINE_COLORS = [
  '#00e5ff', '#a56bff', '#39ff14', '#ff3d71',
  '#ffd166', '#ff9f40', '#ff6b6b', '#43e97b',
]

// Build { exerciseName: [{date, weight}] } from progress history
function buildExerciseData(history, filterExercises, maxSessions) {
  const map = {}
  for (const session of history) {
    const date = session.date ? session.date.slice(0, 10) : null
    if (!date) continue
    for (const s of session.sets || []) {
      const name = s.exercise
      if (!name || s.weight === undefined || s.weight === null || s.weight === '') continue
      const w = parseFloat(s.weight)
      if (isNaN(w) || w <= 0) continue
      if (!map[name]) map[name] = []
      map[name].push({ date, weight: w })
    }
  }
  // Sort each exercise by date, deduplicate same date (take max weight)
  const result = {}
  for (const [name, entries] of Object.entries(map)) {
    if (filterExercises && filterExercises.length > 0 && !filterExercises.includes(name)) continue
    const byDate = {}
    for (const e of entries) {
      byDate[e.date] = byDate[e.date] ? Math.max(byDate[e.date], e.weight) : e.weight
    }
    let sorted = Object.entries(byDate)
      .map(([date, weight]) => ({ date, weight }))
      .sort((a, b) => a.date.localeCompare(b.date))
    if (maxSessions) sorted = sorted.slice(-maxSessions)
    if (sorted.length > 0) result[name] = sorted
  }
  return result
}

// Merge all exercise data into rows for the chart
function buildChartData(exerciseData) {
  const dateSet = new Set()
  for (const entries of Object.values(exerciseData)) {
    for (const e of entries) dateSet.add(e.date)
  }
  const dates = [...dateSet].sort()
  return dates.map(date => {
    const row = { date }
    for (const [name, entries] of Object.entries(exerciseData)) {
      const found = entries.find(e => e.date === date)
      if (found) row[name] = found.weight
    }
    return row
  })
}

function findPeak(exerciseData, name) {
  const entries = exerciseData[name]
  if (!entries || entries.length === 0) return null
  return entries.reduce((max, e) => e.weight > max.weight ? e : max, entries[0])
}

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

function CustomTooltip({ active, payload, label, exerciseData }) {
  if (!active || !payload || !payload.length) return null
  return (
    <div className={styles.tooltip}>
      <div className={styles.tooltipDate}>{formatDate(label)}</div>
      {payload.map(p => {
        const entries = exerciseData[p.name] || []
        const idx = entries.findIndex(e => e.date === label)
        const prev = idx > 0 ? entries[idx - 1].weight : null
        const delta = prev !== null ? p.value - prev : null
        return (
          <div key={p.name} className={styles.tooltipRow}>
            <span className={styles.tooltipDot} style={{ background: p.color }} />
            <span className={styles.tooltipName}>{p.name}</span>
            <span className={styles.tooltipWeight}>{p.value}kg</span>
            {delta !== null && (
              <span className={delta >= 0 ? styles.deltaUp : styles.deltaDown}>
                {delta >= 0 ? '▲' : '▼'} {Math.abs(delta).toFixed(1)}kg
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}

export function WeightProgressChart({ userId, compact = false, filterExercises = null }) {
  const [history, setHistory] = useState([])
  const [selectedEx, setSelectedEx] = useState('all')

  const refresh = useCallback(() => {
    if (!userId) return
    fetchProgressHistory(userId).then(setHistory)
  }, [userId])

  useEffect(() => { refresh() }, [refresh])

  useEffect(() => {
    window.addEventListener('workoutHistoryUpdated', refresh)
    return () => window.removeEventListener('workoutHistoryUpdated', refresh)
  }, [refresh])
  const [open, setOpen] = useState(true)

  const exerciseData = useMemo(
    () => buildExerciseData(history, filterExercises, compact ? 6 : null),
    [history, filterExercises, compact]
  )

  const exerciseNames = Object.keys(exerciseData)

  const filteredData = useMemo(() => {
    if (selectedEx === 'all') return exerciseData
    return exerciseData[selectedEx] ? { [selectedEx]: exerciseData[selectedEx] } : {}
  }, [exerciseData, selectedEx])

  const chartData = useMemo(() => buildChartData(filteredData), [filteredData])
  const displayNames = Object.keys(filteredData)

  if (exerciseNames.length === 0) {
    if (compact) return null
    return (
      <div className={styles.wrap}>
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>📈</div>
          <div className={styles.emptyTitle}>No progress data yet</div>
          <div className={styles.emptyMsg}>Log workouts with weights and your progress chart will appear here.</div>
        </div>
      </div>
    )
  }

  const height = compact ? 200 : 350

  return (
    <div className={styles.wrap}>
      {!compact && (
        <button className={styles.toggle} onClick={() => setOpen(v => !v)}>
          📈 {open ? 'Hide Progress' : 'Show Progress'}
        </button>
      )}

      {compact && (
        <div className={styles.compactHeading}>Your recent progress for today's exercises</div>
      )}

      {open && (
        <div className={styles.chartWrap}>
          {!compact && exerciseNames.length > 1 && (
            <select
              className={styles.exSelect}
              value={selectedEx}
              onChange={e => setSelectedEx(e.target.value)}
            >
              <option value="all">All exercises</option>
              {exerciseNames.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          )}

          <ResponsiveContainer width="100%" height={height}>
            <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis
                dataKey="date"
                tickFormatter={formatDate}
                tick={{ fill: '#ffffff', fontSize: 11 }}
                axisLine={{ stroke: 'rgba(255,255,255,0.15)' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: '#ffffff', fontSize: 11 }}
                axisLine={{ stroke: 'rgba(255,255,255,0.15)' }}
                tickLine={false}
                unit="kg"
                width={45}
              />
              <Tooltip content={<CustomTooltip exerciseData={filteredData} />} />
              <Legend
                wrapperStyle={{ color: '#ffffff', fontSize: 12, paddingTop: 8 }}
              />
              {displayNames.map((name, i) => {
                const peak = findPeak(filteredData, name)
                const color = LINE_COLORS[i % LINE_COLORS.length]
                return (
                  <Line
                    key={name}
                    type="monotone"
                    dataKey={name}
                    stroke={color}
                    strokeWidth={2}
                    dot={{ r: 3, fill: color, strokeWidth: 0 }}
                    activeDot={{ r: 5, fill: color }}
                    connectNulls
                    isAnimationActive
                    animationDuration={800}
                  >
                    {peak && (
                      <ReferenceDot
                        x={peak.date}
                        y={peak.weight}
                        r={6}
                        fill={color}
                        stroke="#ffffff"
                        strokeWidth={1.5}
                        label={{ value: '★', position: 'top', fill: color, fontSize: 12 }}
                      />
                    )}
                  </Line>
                )
              })}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
