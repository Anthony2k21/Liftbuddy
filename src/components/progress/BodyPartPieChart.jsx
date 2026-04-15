import { useMemo, useState } from 'react'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Sector,
} from 'recharts'
import { computeBodyPartVolume } from '../../utils/progressUtils'
import styles from './BodyPartPieChart.module.css'

function ActiveShape({ cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload }) {
  return (
    <g>
      <Sector
        cx={cx} cy={cy}
        innerRadius={innerRadius - 4}
        outerRadius={outerRadius + 8}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />
      <text x={cx} y={cy - 10} textAnchor="middle" fill="#fff" fontSize={22} fontFamily="'Bebas Neue', sans-serif" letterSpacing={1}>
        {payload.pct}%
      </text>
      <text x={cx} y={cy + 12} textAnchor="middle" fill="rgba(255,255,255,0.55)" fontSize={11}>
        {payload.name}
      </text>
      <text x={cx} y={cy + 28} textAnchor="middle" fill="rgba(255,255,255,0.35)" fontSize={10}>
        {payload.totalSets} sets
      </text>
    </g>
  )
}

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className={styles.tooltip}>
      <span className={styles.tooltipDot} style={{ background: d.color }} />
      <span className={styles.tooltipName}>{d.name}</span>
      <span className={styles.tooltipPct}>{d.pct}%</span>
      <span className={styles.tooltipSub}>{d.sessions} sessions · {d.totalSets} sets</span>
    </div>
  )
}

export function BodyPartPieChart({ history }) {
  const data = useMemo(() => computeBodyPartVolume(history), [history])
  const [activeIdx, setActiveIdx] = useState(0)

  if (!data.length) {
    return (
      <div className={styles.wrap}>
        <div className={styles.heading}>Volume Distribution</div>
        <div className={styles.empty}>No data yet — start logging workouts!</div>
      </div>
    )
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.heading}>Volume Distribution</div>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={88}
            dataKey="totalSets"
            activeIndex={activeIdx}
            activeShape={<ActiveShape />}
            onMouseEnter={(_, idx) => setActiveIdx(idx)}
            onClick={(_, idx) => setActiveIdx(idx)}
            paddingAngle={2}
          >
            {data.map((entry, i) => (
              <Cell key={entry.key} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>

      <div className={styles.legend}>
        {data.map((d, i) => (
          <button
            key={d.key}
            className={`${styles.legendItem} ${activeIdx === i ? styles.legendActive : ''}`}
            onClick={() => setActiveIdx(i)}
          >
            <span className={styles.legendDot} style={{ background: d.color }} />
            <span className={styles.legendName}>{d.name}</span>
            <span className={styles.legendPct} style={{ color: d.color }}>{d.pct}%</span>
          </button>
        ))}
      </div>
    </div>
  )
}
