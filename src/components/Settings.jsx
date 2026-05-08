import { useState } from 'react'
import { saveMuscleDay } from '../lib/db'
import styles from './Settings.module.css'

const INITIAL_MUSCLE_DATA = {
  chest: 'rest', shoulders: 'rest', abs: 'rest',
  arms: 'rest', back: 'rest', legs: 'rest',
}

function todayKey() {
  return new Date().toISOString().slice(0, 10)
}

export function Settings({
  open,
  onClose,
  userName,
  displayName,
  onUpdateName,
  userEmail,
  userId,
  playing,
  onToggleMusic,
  showModel,
  onToggleModel,
  onResetToday,
  signOut,
}) {
  const [confirmReset, setConfirmReset]   = useState(false)
  const [confirmSignOut, setConfirmSignOut] = useState(false)
  const [editingName, setEditingName]     = useState(false)
  const [nameValue, setNameValue]         = useState('')

  if (!open) return null

  const shownName = displayName || userName || '?'
  const initials  = shownName.slice(0, 2).toUpperCase()

  async function handleResetToday() {
    if (!confirmReset) { setConfirmReset(true); return }
    await saveMuscleDay(userId, todayKey(), INITIAL_MUSCLE_DATA)
    onResetToday()
    setConfirmReset(false)
    onClose()
  }

  function handleSignOut() {
    if (!confirmSignOut) { setConfirmSignOut(true); return }
    signOut()
  }

  function startEditName() {
    setNameValue(shownName)
    setEditingName(true)
  }

  function saveName() {
    const trimmed = nameValue.trim()
    if (trimmed) onUpdateName(trimmed)
    setEditingName(false)
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.drawer} onClick={e => e.stopPropagation()}>
        <div className={styles.handle} />

        {/* Account */}
        <section className={styles.section}>
          <div className={styles.profile}>
            <div className={styles.avatar}>{initials}</div>
            <div className={styles.profileInfo}>
              {editingName ? (
                <div className={styles.nameEdit}>
                  <input
                    className={styles.nameInput}
                    value={nameValue}
                    onChange={e => setNameValue(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && saveName()}
                    autoFocus
                    maxLength={30}
                  />
                  <button className={styles.nameSaveBtn} onClick={saveName}>Save</button>
                </div>
              ) : (
                <div className={styles.nameRow}>
                  <div className={styles.profileName}>{shownName}</div>
                  <button className={styles.editNameBtn} onClick={startEditName}>Edit</button>
                </div>
              )}
              {userEmail && <div className={styles.profileEmail}>{userEmail}</div>}
            </div>
          </div>
        </section>

        <div className={styles.divider} />

        {/* 3D View */}
        <section className={styles.section}>
          <div className={styles.sectionLabel}>3D VIEW</div>

          <div className={styles.row}>
            <span className={styles.rowLabel}>Show 3D model</span>
            <button
              className={`${styles.toggle} ${showModel ? styles.toggleOn : ''}`}
              onClick={onToggleModel}
            >
              <span className={styles.toggleKnob} />
            </button>
          </div>


        </section>

        <div className={styles.divider} />

        {/* Sound */}
        <section className={styles.section}>
          <div className={styles.sectionLabel}>SOUND</div>
          <div className={styles.row}>
            <span className={styles.rowLabel}>Background music</span>
            <button
              className={`${styles.toggle} ${playing ? styles.toggleOn : ''}`}
              onClick={onToggleMusic}
            >
              <span className={styles.toggleKnob} />
            </button>
          </div>
        </section>

        <div className={styles.divider} />

        {/* Data */}
        <section className={styles.section}>
          <div className={styles.sectionLabel}>DATA</div>
          <button
            className={`${styles.dangerBtn} ${confirmReset ? styles.dangerConfirm : ''}`}
            onClick={handleResetToday}
          >
            {confirmReset ? 'Tap again to confirm' : "Reset today's session"}
          </button>
        </section>

        <div className={styles.divider} />

        {/* Sign out */}
        <section className={styles.section}>
          <button
            className={`${styles.signOutBtn} ${confirmSignOut ? styles.dangerConfirm : ''}`}
            onClick={handleSignOut}
          >
            {confirmSignOut ? 'Tap again to sign out' : 'Sign out'}
          </button>
        </section>
      </div>
    </div>
  )
}
