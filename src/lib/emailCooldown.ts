import { useEffect, useState } from 'react'

/**
 * Client-side throttle for Supabase auth emails (signup confirmation).
 * Supabase's real rate limit is a project setting we can't change from
 * code — this just stops a user from hammering the button and burning
 * through it, and survives a refresh since the cooldown start time is
 * persisted, not held in component state.
 */
export const SIGNUP_COOLDOWN_MS = 60_000

const STORAGE_PREFIX = 'fitright_signup_cooldown_'

function keyFor(email: string): string {
  return STORAGE_PREFIX + email.trim().toLowerCase()
}

export function getCooldownRemainingMs(email: string): number {
  if (!email.trim()) return 0
  const raw = localStorage.getItem(keyFor(email))
  if (!raw) return 0
  const startedAt = Number(raw)
  if (!Number.isFinite(startedAt)) return 0
  return Math.max(0, startedAt + SIGNUP_COOLDOWN_MS - Date.now())
}

export function startCooldown(email: string): void {
  if (!email.trim()) return
  localStorage.setItem(keyFor(email), String(Date.now()))
}

/** Supabase returns this (lowercase, no error code) when its own project-level email rate limit trips. */
export function isEmailRateLimitError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err)
  return /rate limit/i.test(msg)
}

/** Ticks once a second so the displayed countdown stays live; recomputes from storage on every email change. */
export function useSignupCooldown(email: string): number {
  const [remainingMs, setRemainingMs] = useState(() => getCooldownRemainingMs(email))

  useEffect(() => {
    setRemainingMs(getCooldownRemainingMs(email))
    const id = window.setInterval(() => {
      setRemainingMs(getCooldownRemainingMs(email))
    }, 1000)
    return () => window.clearInterval(id)
  }, [email])

  return Math.ceil(remainingMs / 1000)
}
