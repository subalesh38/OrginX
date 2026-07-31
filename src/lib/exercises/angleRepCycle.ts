import type { AngleThresholds, FlagFn, FrameMetrics, RepCounterState } from './types'

/** Shared hysteresis state machine (down-angle vs up-angle) used by every non-hold exercise. */
export function makeAngleRepCycle(
  thresholds: AngleThresholds,
  getAngle: (metrics: FrameMetrics) => number | undefined,
) {
  return function detectRepCycle(metrics: FrameMetrics, state: RepCounterState): boolean {
    const angle = getAngle(metrics)
    if (angle === undefined) return false
    if (state.phase !== 'down' && angle <= thresholds.downAngle) {
      state.phase = 'down'
    } else if (state.phase === 'down' && angle >= thresholds.upAngle) {
      state.phase = 'up'
      state.reps += 1
      return true
    }
    return false
  }
}

/** Shared back-lean check used by every non-hold exercise. */
export function checkBackLean(metrics: FrameMetrics, thresholds: AngleThresholds, flag: FlagFn) {
  if (metrics.torsoTiltDeg !== undefined && metrics.torsoTiltDeg > thresholds.backLeanMax) {
    flag('back-lean', 'Keep your chest up — avoid leaning too far forward', 'warning')
  }
}
