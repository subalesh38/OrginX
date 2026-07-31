import type { ExercisePlugin } from './types'
import { checkBackLean, makeAngleRepCycle } from './angleRepCycle'

// Widened from {100, 160} — see squat.ts for why.
const angleThresholds = { downAngle: 110, upAngle: 150, backLeanMax: 35 }

export const lunge: ExercisePlugin = {
  id: 'lunge',
  label: 'Lunge',
  icon: '🦵',
  description: 'Front-knee angle rep counter',
  isHold: false,
  targetReps: 12,
  targetSets: 3,
  tips: [
    'Step far enough forward for a 90° front knee.',
    'Keep your front knee behind your toes.',
    'Keep your torso upright, don’t lean forward.',
    'Lower your back knee straight down, not forward.',
  ],
  angleThresholds,
  detectRepCycle: makeAngleRepCycle(angleThresholds, (m) => m.kneeAngle),
  checkForm(metrics, _state, flag) {
    checkBackLean(metrics, angleThresholds, flag)
  },
}
