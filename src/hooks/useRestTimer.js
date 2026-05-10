import { useState, useEffect, useRef, useCallback } from 'react'

function playChime() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.value = 880
    gain.gain.setValueAtTime(0.25, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.9)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.9)
    // second tone
    const osc2 = ctx.createOscillator()
    const gain2 = ctx.createGain()
    osc2.connect(gain2)
    gain2.connect(ctx.destination)
    osc2.frequency.value = 660
    gain2.gain.setValueAtTime(0.2, ctx.currentTime + 0.15)
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8)
    osc2.start(ctx.currentTime + 0.15)
    osc2.stop(ctx.currentTime + 0.8)
  } catch (_) {}
}

export function useRestTimer() {
  const [seconds, setSeconds] = useState(0)
  const [isActive, setIsActive] = useState(false)
  const [initialSeconds, setInitialSeconds] = useState(90)
  const intervalRef = useRef(null)
  const didChime = useRef(false)
  const secondsRef = useRef(0)

  const clear = () => {
    clearInterval(intervalRef.current)
    intervalRef.current = null
  }

  useEffect(() => {
    secondsRef.current = seconds
  }, [seconds])

  useEffect(() => {
    if (!isActive) { clear(); return }

    intervalRef.current = setInterval(() => {
      setSeconds(prev => {
        if (prev <= 1) {
          clear()
          setIsActive(false)
          if (!didChime.current) {
            didChime.current = true
            playChime()
            navigator.vibrate?.([200, 100, 200])
          }
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return clear
  }, [isActive])

  const start = useCallback((duration) => {
    didChime.current = false
    const dur = duration ?? 90
    setInitialSeconds(dur)
    setSeconds(dur)
    setIsActive(true)
  }, [])

  const skip = useCallback(() => {
    clear()
    setIsActive(false)
    setSeconds(0)
  }, [])

  const addTime = useCallback((extra) => {
    setSeconds(prev => prev + extra)
  }, [])

  const reset = useCallback(() => {
    clear()
    setIsActive(false)
    setSeconds(0)
    didChime.current = false
  }, [])

  const mm = String(Math.floor(seconds / 60)).padStart(2, '0')
  const ss = String(seconds % 60).padStart(2, '0')
  const mmss = `${mm}:${ss}`
  const progress = initialSeconds > 0 ? seconds / initialSeconds : 0

  return { seconds, isActive, mmss, progress, start, skip, addTime, reset }
}
