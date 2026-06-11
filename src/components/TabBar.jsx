import styles from './TabBar.module.css'

const TABS = [
  {
    id: 'workout',
    label: 'WORKOUT',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="8.5" width="3.5" height="7" rx="1"/>
        <rect x="19.5" y="8.5" width="3.5" height="7" rx="1"/>
        <rect x="4.5" y="10" width="2.5" height="4" rx="0.6"/>
        <rect x="17" y="10" width="2.5" height="4" rx="0.6"/>
        <line x1="7" y1="12" x2="17" y2="12"/>
      </svg>
    ),
  },
  {
    id: 'log',
    label: 'PLANS',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="16" y1="13" x2="8" y2="13"/>
        <line x1="16" y1="17" x2="8" y2="17"/>
        <polyline points="10 9 9 9 8 9"/>
      </svg>
    ),
  },
  {
    id: 'progress',
    label: 'PROGRESS',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/>
        <polyline points="16 7 22 7 22 13"/>
      </svg>
    ),
  },
]

export function TabBar({ activeTab, onChange }) {
  return (
    <nav className={styles.tabBar}>
      {TABS.map(({ id, label, icon }) => (
        <button
          key={id}
          className={`${styles.tab} ${activeTab === id ? styles.active : ''}`}
          onClick={() => onChange(id)}
        >
          <span className={styles.tabIcon}>{icon}</span>
          <span className={styles.tabLabel}>{label}</span>
        </button>
      ))}
    </nav>
  )
}
