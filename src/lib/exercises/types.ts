import type { ExerciseId, FormFlag, RepPhase } from '../../types'

export interface FrameMetrics {
  kneeAngle?: number
  hipAngle?: number
  elbowAngle?: number
  torsoTiltDeg?: number // deviation from vertical, for lunge/squat back-lean check
  hipLineDeg?: number // deviation from horizontal, for plank sag/pike check
}

export interface RepCounterState {
  phase: RepPhase
  reps: number
  lastFlagAt: number
  holdStartMs: number | null
  holdTotalMs: number
  /** EMA-smoothed metrics, persisted frame-to-frame — see `advanceRepState`. */
  smoothed: FrameMetrics
}

export function initRepState(): RepCounterState {
  return { phase: 'up', reps: 0, lastFlagAt: 0, holdStartMs: null, holdTotalMs: 0, smoothed: {} }
}

export interface AngleThresholds {
  downAngle: number
  upAngle: number
  backLeanMax: number
}

/** Appends a form flag if the shared cross-exercise cooldown allows it; owned by the core loop. */
export type FlagFn = (code: string, message: string, severity?: FormFlag['severity']) => void

export interface ExercisePlugin {
  id: ExerciseId
  label: string
  icon: string
  description: string
  isHold: boolean
  /** target reps per set (or target hold-seconds per set, when isHold) */
  targetReps: number
  targetSets: number
  /** short, static improvement tips shown in the workout posture-feedback card */
  tips: string[]
  angleThresholds: AngleThresholds
  /** Advances state by one frame's metrics; returns true exactly on the frame a rep completes. */
  detectRepCycle(metrics: FrameMetrics, state: RepCounterState, nowMs: number): boolean
  /** Pure per-frame form check; reports via `flag` rather than returning an array so cooldown bookkeeping stays centralized in the core loop. */
  checkForm(metrics: FrameMetrics, state: RepCounterState, flag: FlagFn): void
}
