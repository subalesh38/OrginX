import type { ExerciseId, FormFlag, Keypoint } from '../types'
import { KP, findKp, kpVisible } from './poseEngine'
import { angleAt } from './exercises/angles'
import { getExercise } from './exercises/registry'
import type { FlagFn, FrameMetrics, RepCounterState } from './exercises/types'

export type { FrameMetrics, RepCounterState } from './exercises/types'
export { initRepState } from './exercises/types'

export function computeMetrics(keypoints: Keypoint[]): FrameMetrics {
  const get = (name: string) => findKp(keypoints, name)
  const metrics: FrameMetrics = {}

  // Prefer whichever side (left/right) is more visible to the camera.
  const side = (l: string, r: string) => {
    const lk = get(l)
    const rk = get(r)
    if (kpVisible(lk) && kpVisible(rk)) return (lk!.score ?? 0) >= (rk!.score ?? 0) ? 'left' : 'right'
    if (kpVisible(lk)) return 'left'
    if (kpVisible(rk)) return 'right'
    return null
  }

  const kneeSide = side(KP.L_KNEE, KP.R_KNEE)
  if (kneeSide) {
    const hip = get(kneeSide === 'left' ? KP.L_HIP : KP.R_HIP)
    const knee = get(kneeSide === 'left' ? KP.L_KNEE : KP.R_KNEE)
    const ankle = get(kneeSide === 'left' ? KP.L_ANKLE : KP.R_ANKLE)
    if (kpVisible(hip) && kpVisible(knee) && kpVisible(ankle)) {
      metrics.kneeAngle = angleAt(hip, knee, ankle)
    }
    const shoulder = get(kneeSide === 'left' ? KP.L_SHOULDER : KP.R_SHOULDER)
    if (kpVisible(shoulder) && kpVisible(hip) && kpVisible(knee)) {
      metrics.hipAngle = angleAt(shoulder, hip, knee)
    }
  }

  const elbowSide = side(KP.L_ELBOW, KP.R_ELBOW)
  if (elbowSide) {
    const shoulder = get(elbowSide === 'left' ? KP.L_SHOULDER : KP.R_SHOULDER)
    const elbow = get(elbowSide === 'left' ? KP.L_ELBOW : KP.R_ELBOW)
    const wrist = get(elbowSide === 'left' ? KP.L_WRIST : KP.R_WRIST)
    if (kpVisible(shoulder) && kpVisible(elbow) && kpVisible(wrist)) {
      metrics.elbowAngle = angleAt(shoulder, elbow, wrist)
    }
  }

  const lSh = get(KP.L_SHOULDER)
  const rSh = get(KP.R_SHOULDER)
  const lHip = get(KP.L_HIP)
  const rHip = get(KP.R_HIP)
  if (kpVisible(lSh) && kpVisible(rSh) && kpVisible(lHip) && kpVisible(rHip)) {
    const shMid = { x: (lSh.x + rSh.x) / 2, y: (lSh.y + rSh.y) / 2 }
    const hipMid = { x: (lHip.x + rHip.x) / 2, y: (lHip.y + rHip.y) / 2 }
    const dx = shMid.x - hipMid.x
    const dy = shMid.y - hipMid.y
    metrics.torsoTiltDeg = Math.abs(90 - (Math.atan2(Math.abs(dy), Math.abs(dx)) * 180) / Math.PI)
    metrics.hipLineDeg = (Math.atan2(dy, dx) * 180) / Math.PI
  }

  return metrics
}

const FLAG_COOLDOWN_MS = 1500

// New reading contributes 35% of the smoothed value each frame — enough to
// stay responsive to a real rep, but enough to absorb single-frame MoveNet
// jitter that used to prevent clean threshold crossings. First-pass number,
// not tuned against real capture data.
const SMOOTHING_ALPHA = 0.35

/**
 * Blends this frame's raw metrics into the running smoothed value per
 * field. A field missing this frame (occluded/low-confidence joint) holds
 * its last smoothed value instead of going undefined, so a couple of bad
 * frames don't stall the rep-cycle state machine.
 */
function smoothMetrics(prev: FrameMetrics, next: FrameMetrics): FrameMetrics {
  const blend = (p?: number, n?: number) =>
    n === undefined ? p : p === undefined ? n : p + SMOOTHING_ALPHA * (n - p)
  return {
    kneeAngle: blend(prev.kneeAngle, next.kneeAngle),
    hipAngle: blend(prev.hipAngle, next.hipAngle),
    elbowAngle: blend(prev.elbowAngle, next.elbowAngle),
    torsoTiltDeg: blend(prev.torsoTiltDeg, next.torsoTiltDeg),
    hipLineDeg: blend(prev.hipLineDeg, next.hipLineDeg),
  }
}

export interface RepUpdateResult {
  state: RepCounterState
  repJustCompleted: boolean
  newFlags: FormFlag[]
}

/**
 * Advances the rep-cycle state machine by one frame's worth of metrics,
 * dispatching to the matching exercise plugin (`./exercises/registry.ts`).
 * Metrics are EMA-smoothed against the persisted state before the plugin
 * ever sees them — see `smoothMetrics`. A shared hysteresis cooldown keeps
 * noisy readings from spamming flags; adding a new exercise means adding a
 * plugin file + registry entry — nothing in this core loop changes.
 */
export function advanceRepState(
  exerciseId: ExerciseId,
  rawMetrics: FrameMetrics,
  state: RepCounterState,
  nowMs: number,
): RepUpdateResult {
  const plugin = getExercise(exerciseId)
  const metrics = smoothMetrics(state.smoothed, rawMetrics)
  state.smoothed = metrics

  const newFlags: FormFlag[] = []
  const canFlag = nowMs - state.lastFlagAt > FLAG_COOLDOWN_MS

  const flag: FlagFn = (code, message, severity = 'tip') => {
    if (!canFlag) return
    newFlags.push({ code, message, severity, timestampMs: nowMs })
    state.lastFlagAt = nowMs
  }

  const repJustCompleted = plugin.detectRepCycle(metrics, state, nowMs)
  plugin.checkForm(metrics, state, flag)

  return { state, repJustCompleted, newFlags }
}

/**
 * `progressUnits` is reps completed (or hold-seconds accumulated, for hold
 * exercises) — the same value the Workout page tracks as `progress`. Zero
 * flags with zero progress isn't "clean form," it's "no exercise was ever
 * detected" (e.g. sitting still in frame, or the camera never picked up a
 * valid pose) — the rep-cycle state machine only raises flags on threshold
 * crossings it never saw, so silence alone must not read as a perfect score.
 */
export function formScoreFromFlags(flagCount: number, durationSec: number, progressUnits: number): number {
  if (progressUnits <= 0) return 0
  if (durationSec <= 0) return 100
  const flagsPerMinute = (flagCount / durationSec) * 60
  const score = 100 - flagsPerMinute * 8
  return Math.max(0, Math.min(100, Math.round(score)))
}
