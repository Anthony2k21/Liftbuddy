import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import styles from './AuthScreen.module.css'
import progressShot from './landing-progress.png'
import plansShot from './landing-plans.png'

function Barbell() {
  const plates = ['small', 'mid', 'green', 'big']
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

function Phone({ src, alt, className }) {
  return (
    <div className={`${styles.phone} ${className}`}>
      <div className={styles.screen}>
        <img src={src} alt={alt} />
      </div>
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
            <i className={styles.markPlate} /><i className={styles.markGreen} /><i className={styles.markBar} /><i className={styles.markGreen} /><i className={styles.markPlate} />
          </span>
          LiftBuddy
        </div>
      </nav>

      <main className={styles.hero}>
        <div className={styles.copy}>
          <h1 className={styles.headline}>Every rep.<br />Every set.<br />Logged.</h1>
          <p className={styles.lede}>
            Plan your workouts, log every set, and watch your numbers climb, with AI that analyses your progress and shows you how to improve.
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
          <Phone src={plansShot} alt="" className={styles.phoneBack} />
          <Phone src={progressShot} alt="LiftBuddy progress screen with session ratings and strength charts" className={styles.phoneFront} />
          <div className={styles.proof}><b>41</b><span>workouts logged</span></div>
        </div>
      </main>
    </div>
  )
}
