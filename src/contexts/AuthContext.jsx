import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

// ── Keys that get synced between localStorage and Supabase ────
const STATIC_SYNC_KEYS = [
  'muscleCalendar',
  'workoutHistory',
  'workoutBoards',
  'workoutPlans',
  'selectedPlanId',
  'completedBoards',
  'dailyTracker',
  'aiChatHistory',
]

function getAllSyncKeys() {
  const keys = [...STATIC_SYNC_KEYS]
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    if (k?.startsWith('sessionData_')) keys.push(k)
  }
  return keys
}

// ── Cloud helpers ─────────────────────────────────────────────

async function loadFromCloud(userId) {
  const { data, error } = await supabase
    .from('user_data')
    .select('key, value')
    .eq('user_id', userId)

  if (error) {
    console.error('[No1Assist] Supabase load error:', error.message)
    return
  }

  for (const row of data) {
    if (row.value !== null && row.value !== undefined) {
      localStorage.setItem(row.key, JSON.stringify(row.value))
    }
  }
}

async function syncToCloud(userId) {
  const keys = getAllSyncKeys()
  const rows = []

  for (const key of keys) {
    const raw = localStorage.getItem(key)
    if (raw === null) continue
    try {
      rows.push({
        user_id:    userId,
        key,
        value:      JSON.parse(raw),
        updated_at: new Date().toISOString(),
      })
    } catch {
      rows.push({
        user_id:    userId,
        key,
        value:      raw,
        updated_at: new Date().toISOString(),
      })
    }
  }

  if (rows.length === 0) return

  const { error } = await supabase
    .from('user_data')
    .upsert(rows, { onConflict: 'user_id,key' })

  if (error) console.error('[No1Assist] Supabase sync error:', error.message)
}

// ── Context ───────────────────────────────────────────────────

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [loading, setLoading] = useState(true)

  // Initialise session on mount
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        loadFromCloud(session.user.id)
          .then(() => window.dispatchEvent(new Event('storage')))
          .catch(console.error)
      }
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        const nextUser = session?.user ?? null
        setUser(nextUser)
        if (event === 'SIGNED_IN' && nextUser) {
          await loadFromCloud(nextUser.id).catch(console.error)
          window.dispatchEvent(new Event('storage'))
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  // Auto-sync localStorage → Supabase whenever storage events fire
  useEffect(() => {
    if (!user) return

    let timeout
    const handleSync = () => {
      clearTimeout(timeout)
      timeout = setTimeout(() => syncToCloud(user.id), 800)
    }

    window.addEventListener('storage', handleSync)
    window.addEventListener('workoutHistoryUpdated', handleSync)

    // Periodic heartbeat sync every 30 s
    const interval = setInterval(() => syncToCloud(user.id), 30_000)

    // Final sync before tab closes
    const handleUnload = () => syncToCloud(user.id)
    window.addEventListener('beforeunload', handleUnload)

    return () => {
      clearTimeout(timeout)
      clearInterval(interval)
      window.removeEventListener('storage', handleSync)
      window.removeEventListener('workoutHistoryUpdated', handleSync)
      window.removeEventListener('beforeunload', handleUnload)
    }
  }, [user])

  // ── Auth actions ──────────────────────────────────────────

  async function signIn(email, password) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  async function signUp(email, password) {
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) throw error
  }

  async function signOut() {
    if (user) await syncToCloud(user.id).catch(() => {})
    await supabase.auth.signOut()
    // Clear user data from localStorage so the next login loads fresh from cloud
    getAllSyncKeys().forEach(k => localStorage.removeItem(k))
    window.dispatchEvent(new Event('storage'))
  }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext)
}
