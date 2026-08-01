export type ExerciseId = 'squat' | 'pushup' | 'plank' | 'lunge' | 'burpee'

export interface ExerciseDef {
  id: ExerciseId
  label: string
  icon: string
  description: string
  /** true if this is a hold-based exercise (measured by duration, not reps) */
  isHold: boolean
}

export interface Keypoint {
  x: number
  y: number
  score?: number
  name?: string
}

export interface PoseFrame {
  keypoints: Keypoint[]
  timestampMs: number
}

export type RepPhase = 'up' | 'down' | 'transition'

export interface FormFlag {
  code: string
  message: string
  severity: 'tip' | 'warning'
  timestampMs: number
}

export interface WorkoutSession {
  id?: number
  /** Supabase `workout_summaries.id` once synced — required to request an AI report. */
  remoteId?: string
  exerciseId: ExerciseId
  startedAt: number
  endedAt: number
  durationSec: number
  reps: number
  setsCompleted: number
  targetReps: number
  targetSets: number
  formFlags: FormFlag[]
  formScore: number // 0-100, derived from flag frequency
  synced: boolean
  userId?: string | null
}

/**
 * Response shape from the `generate-workout-report` Supabase Edge Function.
 * Kept structurally identical to `supabase/functions/generate-workout-report/types.ts`
 * by hand — there's no shared package between the Deno function and this
 * Vite app, so update both sides together if this changes.
 */
export interface WorkoutReport {
  generatedAt: string
  source: 'ai' | 'fallback'
  cached?: boolean
  summary: string
  formCorrections: {
    exercise: string
    issue: string
    occurrence: string
    suggestion: string
  }[]
  progressComparison: string[]
  nextSessionTips: string[]
}

export interface WeeklyGoal {
  id?: number
  userId?: string | null
  weekStart: string // ISO date (Monday)
  targetSessions: number
  targetReps: number
}

export interface ReminderSettings {
  enabled: boolean
  time: string // "HH:MM"
  days: number[] // 0 = Sunday ... 6 = Saturday
}
