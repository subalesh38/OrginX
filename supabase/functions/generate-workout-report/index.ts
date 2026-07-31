import { createClient } from 'npm:@supabase/supabase-js@2'
import { sanitizePriorSessions, sanitizeSession, type RawSessionRow } from './privacyGuard.ts'
import { generateReport } from './openrouter.ts'
import type { WorkoutReport } from './types.ts'

/**
 * POST /functions/v1/generate-workout-report
 * body: { sessionId: string (workout_summaries.id), weeklyTarget?: { targetSessions, targetReps }, force?: boolean }
 *
 * Auth: the caller's Supabase JWT (forwarded by supabase.functions.invoke
 * from a logged-in client) is verified below and is the ONLY source of
 * truth for `userId` — a userId in the request body is never trusted, so
 * one user can never request another user's report or session data.
 *
 * See privacyGuard.ts for the data-boundary enforcement point; this file
 * only ever selects the named, non-pose columns below (never `select('*')`).
 */

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000
const RATE_LIMIT_MAX_GENERATIONS = 5
const PRIOR_SESSIONS_LIMIT = 7

const SESSION_COLUMNS =
  'id, exercise_id, started_at, ended_at, duration_sec, reps, sets_completed, target_reps, target_sets, form_score, form_flag_breakdown'
const PRIOR_SESSION_COLUMNS = 'exercise_id, started_at, duration_sec, reps, sets_completed, form_score, form_flag_breakdown'

interface RequestBody {
  sessionId?: string
  weeklyTarget?: { targetSessions: number; targetReps: number }
  force?: boolean
}

// supabase.functions.invoke sends a CORS preflight (OPTIONS) before the
// real POST from a browser — without these headers the browser blocks the
// request before it ever reaches this function.
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return json({ error: 'Missing Authorization header' }, 401)

  // Verify the caller's identity from their JWT before touching anything.
  const authedClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  })
  const { data: userData, error: authError } = await authedClient.auth.getUser()
  if (authError || !userData.user) return json({ error: 'Unauthorized' }, 401)
  const userId = userData.user.id

  let body: RequestBody
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Invalid JSON body' }, 400)
  }
  const { sessionId, weeklyTarget, force } = body
  if (!sessionId) return json({ error: 'sessionId is required' }, 400)

  // Service-role client for the actual reads/writes — every query below is
  // still explicitly scoped to the verified `userId`, so RLS bypass here
  // never means "any user's data," only "this function's own writes."
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  // --- Cache check. This IS the rate limit for a given session: the AI
  // provider is called at most once per session unless the caller
  // explicitly asks to regenerate. ---
  if (!force) {
    const { data: cached } = await admin
      .from('workout_reports')
      .select('report, source')
      .eq('session_id', sessionId)
      .eq('user_id', userId)
      .maybeSingle()
    if (cached) {
      return json({ ...(cached.report as WorkoutReport), cached: true })
    }
  }

  // --- Basic abuse guard on top of the cache: cap fresh generations per
  // user per hour, independent of which session they're for. ---
  const since = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString()
  const { count: recentCount } = await admin
    .from('workout_reports')
    .select('session_id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', since)
  if ((recentCount ?? 0) >= RATE_LIMIT_MAX_GENERATIONS) {
    return json({ error: 'Rate limit exceeded — try again later.' }, 429)
  }

  // --- Fetch the target session, scoped to this user. ---
  const { data: sessionRow, error: sessionError } = await admin
    .from('workout_summaries')
    .select(SESSION_COLUMNS)
    .eq('id', sessionId)
    .eq('user_id', userId)
    .single()
  if (sessionError || !sessionRow) return json({ error: 'Session not found' }, 404)

  // --- Last 5-7 prior sessions for context, same user only. ---
  const { data: priorRows } = await admin
    .from('workout_summaries')
    .select(PRIOR_SESSION_COLUMNS)
    .eq('user_id', userId)
    .lt('started_at', sessionRow.started_at)
    .order('started_at', { ascending: false })
    .limit(PRIOR_SESSIONS_LIMIT)

  // --- Weekly goal progress, computed from summaries already fetched
  // under this user's scope — no separate raw-data query needed. ---
  const weekStart = startOfWeek(new Date(sessionRow.started_at))
  const { data: weekRows } = await admin
    .from('workout_summaries')
    .select('reps')
    .eq('user_id', userId)
    .gte('started_at', weekStart.toISOString())
  const sessionsThisWeek = weekRows?.length ?? 0
  const repsThisWeek = (weekRows ?? []).reduce((sum, r) => sum + (r.reps ?? 0), 0)

  // --- The privacy boundary: everything past this point only ever touches
  // the whitelisted, already-aggregated shape `privacyGuard.ts` produces. ---
  const currentStats = sanitizeSession(sessionRow as RawSessionRow)
  const priorStats = sanitizePriorSessions((priorRows ?? []) as RawSessionRow[])
  const goalContext = {
    targetSessions: weeklyTarget?.targetSessions ?? 0,
    targetReps: weeklyTarget?.targetReps ?? 0,
    sessionsThisWeek,
    repsThisWeek,
  }

  const report = await generateReport(currentStats, priorStats, goalContext)

  const { error: insertError } = await admin.from('workout_reports').upsert({
    session_id: sessionId,
    user_id: userId,
    report,
    source: report.source,
  })
  if (insertError) console.error('Failed to cache workout report:', insertError.message)

  return json({ ...report, cached: false })
})

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  })
}

function startOfWeek(d: Date): Date {
  const day = d.getUTCDay() || 7 // Sunday -> 7
  const monday = new Date(d)
  monday.setUTCDate(d.getUTCDate() - day + 1)
  monday.setUTCHours(0, 0, 0, 0)
  return monday
}
