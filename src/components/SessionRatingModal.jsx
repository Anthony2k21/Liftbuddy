import { useMemo } from 'react'
import { calculateSessionRating } from '../utils/calculateSessionRating'
import styles from './SessionRatingModal.module.css'

function scoreColor(score) {
  if (score >= 9.0) return '#ffd700'
  if (score >= 7.5) return '#39ff14'
  if (score >= 6.5) return '#00e5ff'
  if (score >= 5.5) return '#f5a623'
  if (score >= 4.0) return '#ff6bae'
  return '#ff3d71'
}

export function SessionRatingModal({ sessionData, history, onClose }) {
  const result = useMemo(
    () => calculateSessionRating(sessionData, history),
    [sessionData, history]
  )

  const { score, label, summary, highlights, lowlights, pr_count } = result
  const color = scoreColor(score)

  return (
    <div className={styles.backdrop} onClick={() => onClose(null)}>
      <div className={styles.card} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className={styles.header}>
          <span className={styles.headerLabel}>SESSION RATING</span>
          <button className={styles.closeBtn} onClick={() => onClose(null)}>✕</button>
        </div>

        {/* Big score */}
        <div className={styles.scoreWrap}>
          <span className={styles.scoreNum} style={{ color }}>
            {score.toFixed(1)}
          </span>
          <span className={styles.scoreLabel} style={{ color }}>
            {label}
          </span>
        </div>

        {/* Score bar */}
        <div className={styles.barTrack}>
          <div
            className={styles.barFill}
            style={{ width: `${(score / 10) * 100}%`, background: color }}
          />
        </div>

        {/* Summary */}
        <p className={styles.summary}>{summary}</p>

        {/* PR badge */}
        {pr_count > 0 && (
          <div className={styles.prBadge}>
            🏆 {pr_count} Personal Record{pr_count > 1 ? 's' : ''} This Session
          </div>
        )}

        {/* Highlights */}
        {highlights.length > 0 && (
          <div className={styles.section}>
            <div className={styles.sectionTitle}>HIGHLIGHTS</div>
            {highlights.map((h, i) => (
              <div key={i} className={styles.highlight}>
                <span className={styles.bullet} style={{ color: '#39ff14' }}>▲</span>
                {h}
              </div>
            ))}
          </div>
        )}

        {/* Lowlights */}
        {lowlights.length > 0 && (
          <div className={styles.section}>
            <div className={styles.sectionTitle}>AREAS TO IMPROVE</div>
            {lowlights.map((l, i) => (
              <div key={i} className={styles.lowlight}>
                <span className={styles.bullet} style={{ color: '#ff6bae' }}>▼</span>
                {l}
              </div>
            ))}
          </div>
        )}

        {/* Score breakdown legend */}
        <div className={styles.scale}>
          {[
            ['10.0', 'Perfect',   '#ffd700'],
            ['9.5+', 'Legendary', '#ffd700'],
            ['8.5+', 'Excellent', '#39ff14'],
            ['7.5+', 'Good',      '#00e5ff'],
            ['6.5+', 'Decent',    '#00e5ff'],
            ['5.5+', 'Average',   '#f5a623'],
            ['4.0+', 'Poor',      '#ff6bae'],
            ['1.0+', 'Disaster',  '#ff3d71'],
          ].map(([range, lbl, c]) => (
            <div
              key={lbl}
              className={`${styles.scaleRow} ${lbl === label ? styles.scaleRowActive : ''}`}
              style={lbl === label ? { borderColor: c + '88' } : {}}
            >
              <span className={styles.scaleScore} style={{ color: c }}>{range}</span>
              <span className={styles.scaleLabel}>{lbl}</span>
            </div>
          ))}
        </div>

        <button className={styles.doneBtn} onClick={() => onClose(score)}>Save &amp; Close</button>
      </div>
    </div>
  )
}
