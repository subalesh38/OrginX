import type { ExercisePlugin } from './types'

const angleThresholds = { downAngle: 0, upAngle: 0, backLeanMax: 0 }
const ALIGN_THRESHOLD_DEG = 12

function isAligned(hipLineDeg: number | undefined): boolean {
  return hipLineDeg !== undefined && Math.abs(hipLineDeg) < ALIGN_THRESHOLD_DEG
}

export const plank: ExercisePlugin = {
  id: 'plank',
  label: 'Plank',
  icon: '🧘',
  description: 'Hip alignment hold timer',
  isHold: true,
  targetReps: 30,
  targetSets: 3,
  tips: [
    'Keep your hips level with your shoulders.',
    'Brace your core — don’t let your hips sag.',
    'Keep your neck neutral, eyes toward the floor.',
    'Squeeze your glutes to help stabilize your line.',
  ],
  angleThresholds,
  detectRepCycle(metrics, state, nowMs) {
    if (isAligned(metrics.hipLineDeg)) {
      if (state.holdStartMs === null) state.holdStartMs = nowMs
      state.holdTotalMs = nowMs - state.holdStartMs
    } else {
      state.holdStartMs = null
    }
    return false
  },
  checkForm(metrics, _state, flag) {
    if (metrics.hipLineDeg !== undefined && !isAligned(metrics.hipLineDeg)) {
      flag('plank-sag', metrics.hipLineDeg > 0 ? 'Hips sagging — brace your core' : 'Hips too high — flatten your line', 'warning')
    }
  },
}
