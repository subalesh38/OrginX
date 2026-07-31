import type { ExercisePlugin } from './types'
import { checkBackLean, makeAngleRepCycle } from './angleRepCycle'

// Widened from {100, 160} — see squat.ts for why.
const angleThresholds = { downAngle: 110, upAngle: 150, backLeanMax: 50 }

/**
 * Placeholder: reuses the squat/stand knee-angle cycle rather than a true
 * multi-phase (stand → plank → push-up → jump) state machine. See README's
 * "Known gaps" — swap `detectRepCycle` for a `burpeePhase` enum with its
 * own thresholds when ready; nothing outside this file needs to change.
 */
export const burpee: ExercisePlugin = {
  id: 'burpee',
  label: 'Burpee',
  icon: '🔥',
  description: 'Full-cycle stand→plank→stand',
  isHold: false,
  targetReps: 8,
  targetSets: 3,
  tips: [
    'Keep the movement controlled, not rushed.',
    'Land softly on your feet each rep.',
    'Keep your core tight through the plank phase.',
    'Breathe steadily — exhale on the jump.',
  ],
  angleThresholds,
  detectRepCycle: makeAngleRepCycle(angleThresholds, (m) => m.kneeAngle),
  checkForm(metrics, _state, flag) {
    checkBackLean(metrics, angleThresholds, flag)
  },
}
