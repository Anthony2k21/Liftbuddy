import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import styles from './AuthScreen.module.css'

// ── Sample data shown in the phone mockups (marketing only, not real user data) ──
const TODAY = [
  { name: 'Bench Press',      detail: '4 × 8 at 82.5 kg', done: 4, total: 4 },
  { name: 'Overhead Press',   detail: '3 × 10 at 45 kg',  done: 2, total: 3 },
  { name: 'Incline DB Press', detail: '3 × 12 at 26 kg',  done: 0, total: 3 },
  { name: 'Cable Fly',        detail: '3 × 15 at 15 kg',  done: 0, total: 3 },
  { name: 'Lateral Raise',    detail: '3 × 15 at 10 kg',  done: 0, total: 3 },
]

function StatusBar() {
  return <div className={styles.statusBar}><span>9:41</span><span>●●● ▮</span></div>
}

function TabBar({ active }) {
  return (
    <div className={styles.tabBar}>
      {['Today', 'Plans', 'Progress', 'Settings'].map(t => (
        <span key={t} className={t === active ? styles.tabOn : undefined}>{t}</span>
      ))}
    </div>
  )
}

function TodayScreen() {
  return (
    <div className={styles.screen}>
      <StatusBar />
      <div className={styles.app}>
        <div className={styles.appTop}><span>Wednesday, week 6</span><span className={styles.avatar}>LB</span></div>
        <h4 className={styles.appTitle}>PUSH DAY</h4>
        <div className={styles.stats}>
          <div className={`${styles.stat} ${styles.statHot}`}><b>12 days</b><span>Current streak</span></div>
          <div className={styles.stat}><b>4 of 5</b><span>Sessions this week</span></div>
        </div>
        <div className={styles.exList}>
          {TODAY.map(ex => (
            <div key={ex.name} className={styles.exRow}>
              <b>{ex.name}</b>
              <span className={styles.sets}>
                {Array.from({ length: ex.total }, (_, i) => (
                  <i key={i} className={i < ex.done ? styles.setDone : undefined} />
                ))}
              </span>
              <small>{ex.detail}</small>
            </div>
          ))}
        </div>
        <div className={styles.appBtn}>Log set</div>
      </div>
      <TabBar active="Today" />
    </div>
  )
}

function ProgressScreen() {
  return (
    <div className={styles.screen}>
      <StatusBar />
      <div className={styles.app}>
        <div className={styles.appTop}><span>Progress</span><span className={styles.avatar}>LB</span></div>
        <h4 className={styles.appTitle}>BENCH PRESS</h4>
        <div className={styles.pb}><b>92.5 <small>kg best</small></b><em>New top set</em></div>
        <div className={styles.chart}>
          <svg viewBox="0 0 220 110" aria-hidden="true">
            <g stroke="#26272b" strokeWidth="1">
              <line x1="0" y1="20" x2="220" y2="20" /><line x1="0" y1="55" x2="220" y2="55" /><line x1="0" y1="90" x2="220" y2="90" />
            </g>
            <path d="M5 92 L35 86 L65 80 L95 78 L125 66 L155 58 L185 44 L215 26 L215 110 L5 110 Z" fill="#f3c316" opacity=".14" />
            <polyline points="5,92 35,86 65,80 95,78 125,66 155,58 185,44 215,26" fill="none" stroke="#f3c316" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
            <circle cx="215" cy="26" r="4.5" fill="#f3c316" />
          </svg>
        </div>
        <div className={styles.sess}><b>Mon</b><span>4 × 8 at 82.5 kg</span></div>
        <div className={styles.sess}><b>Thu</b><span>5 × 5 at 90 kg</span></div>
      </div>
      <TabBar active="Progress" />
    </div>
  )
}

function Barbell() {
  const plates = ['g', 'y', 'b', 'r']
  return (
    <div className={styles.barbell} aria-hidden="true">
      <div className={styles.sleeve} />
      <div className={styles.plates}>{plates.map(p => <i key={p} className={styles['p_' + p]} />)}</div>
      <div className={styles.collar} /><div className={styles.shaft} /><div className={styles.collar} />
      <div className={styles.plates}>{[...plates].reverse().map(p => <i key={p} className={styles['p_' + p]} />)}</div>
      <div className={styles.sleeve} />
    </div>
  )
}

export function AuthScreen({ loading: sessionLoading = false }) {
  const { signIn, signUp } = useAuth()
  const [mode, setMode]         = useState('login') // 'login' | 'signup'
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [success, setSuccess]   = useState('')

  if (sessionLoading) return (
    <div className={styles.loadingScreen}>Loading…</div>
  )

  function switchMode(next) {
    setMode(next)
    setError('')
    setSuccess('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    if (mode === 'login') {
      const { error } = await signIn(email, password)
      if (error) setError(error.message)
    } else {
      const { error } = await signUp(email, password)
      if (error) {
        setError(error.message)
      } else {
        setSuccess('Check your email to confirm your account.')
      }
    }

    setLoading(false)
  }

  return (
    <div className={styles.page}>
      <nav className={styles.nav}>
        <div className={styles.logo}>
          <span className={styles.mark} aria-hidden="true">
            <i className={styles.markRed} /><i className={styles.markBlue} /><i className={styles.markBar} /><i className={styles.markBlue} /><i className={styles.markRed} />
          </span>
          LiftBuddy
        </div>
      </nav>

      <main className={styles.hero}>
        <div className={styles.copy}>
          <h1 className={styles.headline}>Every rep.<br />Every set.<br />Logged.</h1>
          <p className={styles.lede}>
            Plan your training with AI, log each set as you lift, and watch your numbers climb week after week.
          </p>

          <div className={styles.card}>
            <div className={styles.tabs} role="tablist">
              <button type="button" role="tab" aria-selected={mode === 'login'}
                className={`${styles.tab} ${mode === 'login' ? styles.tabActive : ''}`}
                onClick={() => switchMode('login')}>
                Log in
              </button>
              <button type="button" role="tab" aria-selected={mode === 'signup'}
                className={`${styles.tab} ${mode === 'signup' ? styles.tabActive : ''}`}
                onClick={() => switchMode('signup')}>
                Sign up
              </button>
            </div>

            <form className={styles.form} onSubmit={handleSubmit}>
              <label className={styles.label} htmlFor="auth-email">Email</label>
              <input
                id="auth-email"
                className={styles.input}
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoComplete="email"
              />

              <label className={styles.label} htmlFor="auth-password">Password</label>
              <input
                id="auth-password"
                className={styles.input}
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                minLength={6}
              />
              {mode === 'signup' && <p className={styles.hint}>At least 6 characters.</p>}

              {error && <div className={styles.error} role="alert">{error}</div>}
              {success && <div className={styles.successMsg} role="status">{success}</div>}

              <button className={styles.submitBtn} type="submit" disabled={loading}>
                {loading ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Create account'}
              </button>
            </form>
          </div>
        </div>

        <div className={styles.stage}>
          <Barbell />
          <div className={`${styles.phone} ${styles.phoneBack}`} aria-hidden="true"><ProgressScreen /></div>
          <div className={`${styles.phone} ${styles.phoneFront}`} role="img" aria-label="LiftBuddy showing today's push day workout">
            <TodayScreen />
          </div>
          <div className={styles.proof}><b>+12.5 kg</b><span>on bench in 8 weeks</span></div>
        </div>
      </main>
    </div>
  )
}
