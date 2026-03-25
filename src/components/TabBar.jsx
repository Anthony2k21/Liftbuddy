import styles from './TabBar.module.css'

export function TabBar({ activeTab, onChange }) {
  return (
    <nav className={styles.tabBar}>
      <button
        className={`${styles.tab} ${activeTab === 'workout' ? styles.active : ''}`}
        onClick={() => onChange('workout')}
      >
        3D View
      </button>
      <button
        className={`${styles.tab} ${activeTab === 'assistant' ? styles.active : ''}`}
        onClick={() => onChange('assistant')}
      >
        AI Assistant
      </button>
      <button
        className={`${styles.tab} ${activeTab === 'log' ? styles.active : ''}`}
        onClick={() => onChange('log')}
      >
        Workout Log
      </button>
    </nav>
  )
}
