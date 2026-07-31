// Kept structurally identical to `src/types/index.ts`'s `WorkoutReport` by
// hand — there's no shared package between this Deno function and the Vite
// app, so update both sides together if this shape changes.

export interface WorkoutReport {
  generatedAt: string
  source: 'ai' | 'fallback'
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

export interface GoalContext {
  targetSessions: number
  targetReps: number
  sessionsThisWeek: number
  repsThisWeek: number
}
