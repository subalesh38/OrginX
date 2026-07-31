/**
 * ============================================================================
 * PRIVACY BOUNDARY — read before editing.
 *
 * This is the ONLY place a raw `workout_summaries` row is translated into
 * data that reaches the AI provider (via `openrouter.ts`'s prompt
 * builder). Every field is picked individually below — never spread (`...row`) — so an
 * accidental future column added to `workout_summaries` (or a `select('*')`
 * elsewhere) can't silently widen what gets sent to a third-party API.
 *
 * This is defense in depth, not the only guard: the `workout_summaries`
 * table itself structurally never has a pose/landmark/video column (see
 * the migration in `supabase/migrations/`), and the frontend's
 * `toSummaryRow` (src/lib/supabase.ts) applies the same picked-fields
 * discipline before a session ever leaves the browser. Raw camera frames
 * and per-frame pose keypoints never have a code path into Postgres at
 * all, so there is nothing for this function to accidentally query even
 * if someone tried.
 * ============================================================================
 */

export interface SanitizedSessionStats {
  exerciseId: string
  startedAt: string
  durationSec: number
  reps: number
  setsCompleted: number
  targetReps: number
  targetSets: number
  formScore: number
  flagBreakdown: { code: string; label: string; severity: string; count: number }[]
}

interface RawFlagBreakdownEntry {
  code?: unknown
  label?: unknown
  severity?: unknown
  count?: unknown
}

export interface RawSessionRow {
  exercise_id: string
  started_at: string
  duration_sec: number
  reps: number
  sets_completed: number
  target_reps?: number
  target_sets?: number
  form_score: number
  form_flag_breakdown: RawFlagBreakdownEntry[] | null
}

function sanitizeFlagBreakdown(raw: RawFlagBreakdownEntry[] | null): SanitizedSessionStats['flagBreakdown'] {
  if (!Array.isArray(raw)) return []
  return raw.map((f) => ({
    code: String(f.code ?? 'unknown'),
    label: String(f.label ?? ''),
    severity: String(f.severity ?? 'tip'),
    count: Number(f.count ?? 0),
  }))
}

/** The single allowed conversion from a DB row to prompt-eligible data. */
export function sanitizeSession(row: RawSessionRow): SanitizedSessionStats {
  return {
    exerciseId: row.exercise_id,
    startedAt: row.started_at,
    durationSec: row.duration_sec,
    reps: row.reps,
    setsCompleted: row.sets_completed,
    targetReps: row.target_reps ?? 0,
    targetSets: row.target_sets ?? 0,
    formScore: row.form_score,
    flagBreakdown: sanitizeFlagBreakdown(row.form_flag_breakdown),
  }
}

export function sanitizePriorSessions(rows: RawSessionRow[]): SanitizedSessionStats[] {
  return rows.map(sanitizeSession)
}
