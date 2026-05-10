import { useEffect, useRef } from 'react'
import { AreaChart, Area, ResponsiveContainer, Tooltip } from 'recharts'
import { useExerciseInsights } from '../../hooks/useExerciseInsights'
import styles from './InsightsSheet.module.css'

function DeltaCard({ label, value, unit, delta }) {
  const up = delta > 0
  const down = delta < 0
  return (
    <div className={styles.deltaCard}>
      <span className={styles.deltaLabel}>{label}</span>
      <div className={styles.deltaValue}>
        {value ?? '—'}
        {unit && <span className={styles.deltaUnit}>{unit}</span>}
      </div>
      {delta !== null && delta !== 0 && (
        <span className={`${styles.deltaChange} ${up ? styles.up : down ? styles.down : ''}`}>
          {up ? '↑' : '↓'} {up ? '+' : ''}{delta} vs last
        </span>
      )}
      {(delta === null || delta === 0) && <span className={styles.deltaChange}>—</span>}
    </div>
  )
}

export function InsightsSheet({ userId, exerciseName, currentSets, onClose }) {
  const {
    loading, insights, sparkData, isPB,
    est1RM, oneRMDelta, currentTopReps, repsDelta, slope, showingCurrent,
  } = useExerciseInsights(userId, exerciseName, currentSets)

  const sheetRef = useRef(null)

  useEffect(() => {
    const el = sheetRef.current
    if (!el) return
    requestAnimationFrame(() => { el.style.transform = 'translateY(0)' })
  }, [])

  const handleClose = () => {
    const el = sheetRef.current
    if (el) {
      el.style.transform = 'translateY(100%)'
      setTimeout(onClose, 280)
    } else {
      onClose()
    }
  }

  const trendLabel = slope > 0 ? '↑ TRENDING UP' : slope < 0 ? '↓ TRENDING DOWN' : '→ STABLE'
  const trendClass = slope > 0 ? styles.trendUp : slope < 0 ? styles.trendDown : styles.trendFlat

  return (
    <div className={styles.backdrop} onClick={handleClose}>
      <div
        ref={sheetRef}
        className={styles.sheet}
        onClick={e => e.stopPropagation()}
        style={{ transform: 'translateY(100%)' }}
      >
        <div className={styles.handle} />

        <div className={styles.header}>
          <div>
            <h2 className={styles.title}>{exerciseName.toUpperCase()} · INSIGHTS</h2>
            <p className={styles.sub}>LAST 5 SESSIONS</p>
          </div>
          {isPB && <div className={styles.pbBadge}>🏆 NEW PB</div>}
        </div>

        {loading ? (
          <div className={styles.loading}>LOADING…</div>
        ) : (
          <>
            {!showingCurrent && (
              <div className={styles.historyNote}>SHOWING LAST SESSION · LOG A SET FOR LIVE DELTA</div>
            )}
            <div className={styles.deltaGrid}>
              <DeltaCard
                label="TOP REPS"
                value={currentTopReps ?? '—'}
                unit="reps"
                delta={repsDelta}
              />
              <DeltaCard
                label="EST. 1RM"
                value={est1RM ?? '—'}
                unit="kg"
                delta={oneRMDelta}
              />
            </div>

            {sparkData.length >= 2 && (
              <div className={styles.sparkCard}>
                <div className={styles.sparkHeader}>
                  <span className={styles.sparkLabel}>VOLUME PROGRESSION</span>
                  <span className={`${styles.trend} ${trendClass}`}>{trendLabel}</span>
                </div>
                <div className={styles.sparkWrap}>
                  <ResponsiveContainer width="100%" height={60}>
                    <AreaChart data={sparkData} margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
                      <defs>
                        <linearGradient id="volGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#b8ff3a" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#b8ff3a" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <Area
                        type="monotone"
                        dataKey="volume"
                        stroke="#b8ff3a"
                        strokeWidth={2}
                        fill="url(#volGrad)"
                        dot={({ cx, cy, index }) =>
                          index === sparkData.length - 1 ? (
                            <circle key={`dot-${index}`} cx={cx} cy={cy} r={4} fill="#b8ff3a" />
                          ) : (
                            <circle key={`dot-${index}`} cx={cx} cy={cy} r={2.5} fill="#4a4a52" />
                          )
                        }
                        activeDot={false}
                      />
                      <Tooltip
                        content={({ active, payload }) =>
                          active && payload?.length ? (
                            <div className={styles.tooltip}>{Math.round(payload[0].value)}kg vol</div>
                          ) : null
                        }
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {sparkData.length < 2 && (
              <div className={styles.noData}>
                LOG MORE SESSIONS TO SEE PROGRESSION
              </div>
            )}

            {insights.length > 0 && (
              <div className={styles.insightsList}>
                {insights.map((ins, i) => (
                  <div key={i} className={styles.insightRow}>
                    <span className={styles.insightIcon}>{ins.icon}</span>
                    <div className={styles.insightText}>
                      <div className={styles.insightTitle}>{ins.title}</div>
                      <div className={styles.insightSub}>{ins.sub}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        <button className={styles.closeBtn} onClick={handleClose}>CLOSE</button>
      </div>
    </div>
  )
}
