import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { FormFlag, WorkoutReport, WorkoutSession } from '../types'
import { getUnsyncedSessions, markSynced } from './db'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const supabaseEnabled = Boolean(url && anonKey)

/**
 * Cloud sync scope, by design, is limited to account identity + derived
 * workout summaries (reps, sets, duration, form-flag counts, timestamps).
 * No camera frame or pose keypoint ever has a code path into this client —
 * see `toSummaryRow` below, which is the only place a session is translated
 * into a network payload, and picks fields one by one rather than spreading
 * the session object.
 */
export const supabase: SupabaseClient | null = supabaseEnabled
  ? createClient(url as string, anonKey as string)
  : null

export async function signUp(email: string, password: string, name?: string) {
  if (!supabase) throw new Error('Supabase not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env')
  return supabase.auth.signUp({ email, password, options: name ? { data: { name } } : undefined })
}

export async function signIn(email: string, password: string) {
  if (!supabase) throw new Error('Supabase not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env')
  return supabase.auth.signInWithPassword({ email, password })
}

export async function signOut() {
  if (!supabase) return
  await supabase.auth.signOut()
}

export async function getSession() {
  if (!supabase) return null
  const { data } = await supabase.auth.getSession()
  return data.session
}

/**
 * Pushes any locally-saved, not-yet-synced sessions up to Supabase.
 * Called opportunistically: after saving a session, on login, and on
 * regaining connectivity. Silently no-ops if offline or logged out —
 * the local DB remains the source of truth either way.
 */
export async function syncPendingSessions(userId: string): Promise<{ synced: number; failed: number }> {
  if (!supabase || !navigator.onLine) return { synced: 0, failed: 0 }

  const pending = await getUnsyncedSessions(userId)
  let synced = 0
  let failed = 0

  for (const session of pending) {
    const { data, error } = await supabase
      .from('workout_summaries')
      .insert(toSummaryRow(session, userId))
      .select('id')
      .single()
    if (error || !data) {
      failed += 1
      continue
    }
    if (session.id) await markSynced(session.id, data.id as string)
    synced += 1
  }

  return { synced, failed }
}

/**
 * Aggregates raw per-rep form flags into per-rule-code counts. This is the
 * ONLY form of "detail" that ever leaves the device for a session — a
 * static rule code + human-readable label + how many times it fired. No
 * per-rep timestamp, no positional/pose data, ever leaves this function.
 */
function aggregateFormFlags(flags: FormFlag[]): { code: string; label: string; severity: FormFlag['severity']; count: number }[] {
  const byCode = new Map<string, { label: string; severity: FormFlag['severity']; count: number }>()
  for (const f of flags) {
    const entry = byCode.get(f.code) ?? { label: f.message, severity: f.severity, count: 0 }
    entry.count += 1
    byCode.set(f.code, entry)
  }
  return Array.from(byCode.entries()).map(([code, entry]) => ({ code, ...entry }))
}

function toSummaryRow(session: WorkoutSession, userId: string) {
  return {
    user_id: userId,
    exercise_id: session.exerciseId,
    started_at: new Date(session.startedAt).toISOString(),
    ended_at: new Date(session.endedAt).toISOString(),
    duration_sec: session.durationSec,
    reps: session.reps,
    sets_completed: session.setsCompleted,
    target_reps: session.targetReps,
    target_sets: session.targetSets,
    form_score: session.formScore,
    flag_count: session.formFlags.length,
    form_flag_breakdown: aggregateFormFlags(session.formFlags),
  }
}

/**
 * Requests (or fetches the cached) AI-generated post-workout report for a
 * synced session. Calls the `generate-workout-report` Edge Function, which
 * holds the Gemini API key server-side and enforces the same
 * whitelist-only payload discipline as `toSummaryRow` above — see
 * `supabase/functions/generate-workout-report/privacyGuard.ts`.
 */
export async function fetchWorkoutReport(
  remoteSessionId: string,
  weeklyTarget?: { targetSessions: number; targetReps: number },
  options?: { force?: boolean },
): Promise<WorkoutReport> {
  if (!supabase) throw new Error('Supabase not configured — AI reports require cloud sync to be enabled.')
  const { data, error } = await supabase.functions.invoke('generate-workout-report', {
    body: { sessionId: remoteSessionId, weeklyTarget, force: options?.force ?? false },
  })
  if (error) throw error
  return data as WorkoutReport
}

/*
 * Supabase schema: see `supabase/migrations/` for the full, current SQL
 * (workout_summaries columns + the workout_reports cache table + RLS).
 */
