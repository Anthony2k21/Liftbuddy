import styles from './TabBar.module.css'

const TABS = [
  { id: 'workout',  label: '3D View'  },
  { id: 'log',      label: 'Plans'    },
  { id: 'tracker',  label: 'Today'    },
  { id: 'progress', label: 'Progress' },
]

export function TabBar({ activeTab, onChange }) {
  return (
    <nav className={styles.tabBar}>
      {TABS.map(({ id, label }) => (
        <button
          key={id}
          className={`${styles.tab} ${activeTab === id ? styles.active : ''}`}
          onClick={() => onChange(id)}
        >
          {label}
        </button>
      ))}
    </nav>
  )
}
