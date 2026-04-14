import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import styles from './AuthScreen.module.css'

export function AuthScreen() {
  const { signIn, signUp } = useAuth()
  const [mode, setMode]       = useState('login')
  const [email, setEmail]     = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]     = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)
    try {
      if (mode === 'login') {
        await signIn(email, password)
      } else {
        await signUp(email, password)
        setSuccess('Account created! Check your email to confirm, then sign in.')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function switchMode(next) {
    setMode(next)
    setError('')
    setSuccess('')
  }

  return (
    <div className={styles.screen}>
      <div className={styles.card}>
        <div className={styles.logo}>No1Assist</div>
        <p className={styles.subtitle}>
          {mode === 'login'
            ? 'Sign in to sync your training data'
            : 'Create an account to get started'}
        </p>

        <form className={styles.form} onSubmit={handleSubmit}>
          <label className={styles.label}>Email</label>
          <input
            className={styles.input}
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            autoComplete="email"
          />

          <label className={styles.label}>Password</label>
          <input
            className={styles.input}
            type="password"
            placeholder={mode === 'signup' ? 'Min. 6 characters' : '••••••••'}
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          />

          {error   && <p className={styles.error}>{error}</p>}
          {success && <p className={styles.successMsg}>{success}</p>}

          <button className={styles.btn} type="submit" disabled={loading}>
            {loading ? '...' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <p className={styles.toggle}>
          {mode === 'login' ? (
            <>No account?{' '}
              <button className={styles.toggleBtn} onClick={() => switchMode('signup')}>
                Sign up
              </button>
            </>
          ) : (
            <>Already have an account?{' '}
              <button className={styles.toggleBtn} onClick={() => switchMode('login')}>
                Sign in
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  )
}
