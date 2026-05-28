import { useState, useEffect, useRef } from 'react'

const MAX_ATTEMPTS = 3
const COOLDOWN_SECONDS = 30

export function useLoginThrottle() {
  const [attempts, setAttempts] = useState(0)
  const [cooldownLeft, setCooldownLeft] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  function startCooldown() {
    setCooldownLeft(COOLDOWN_SECONDS)
    timerRef.current = setInterval(() => {
      setCooldownLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!)
          timerRef.current = null
          setAttempts(0)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  function recordFailure() {
    const next = attempts + 1
    setAttempts(next)
    if (next >= MAX_ATTEMPTS) startCooldown()
  }

  function reset() {
    setAttempts(0)
    setCooldownLeft(0)
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }

  const isThrottled = cooldownLeft > 0

  return { recordFailure, reset, isThrottled, cooldownLeft, attempts, maxAttempts: MAX_ATTEMPTS }
}
