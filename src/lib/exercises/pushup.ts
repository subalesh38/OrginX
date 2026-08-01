import type { ExercisePlugin } from './types'
import { checkBackLean, makeAngleRepCycle } from './angleRepCycle'

// Widened from {95, 155} — see squat.ts for why; same frontal-projection
// issue applies to elbow extension at the top of a push-up.
const angleThresholds = { downAngle: 105, upAngle: 145, backLeanMax: 30 }

export const pushup: ExercisePlugin = {
  id: 'pushup',
  label: 'Push-up',
  icon: '💪',
  description: 'Elbow angle rep counter',
  isHold: false,
  targetReps: 10,
  targetSets: 3,
  tips: [
    'Keep your body in a straight line from head to heels.',
    'Tuck your elbows in rather than flaring them out.',
    'Lower your chest close to the floor each rep.',
    'Keep your core braced throughout the movement.',
  ],
  angleThresholds,
  detectRepCycle: makeAngleRepCycle(angleThresholds, (m) => m.elbowAngle),
  checkForm(metrics, state, flag) {
    checkBackLean(metrics, angleThresholds, flag)
    if (metrics.elbowAngle !== undefined && state.phase === 'down' && metrics.elbowAngle < 70) {
      flag('deep-pushup-elbow', 'Elbows flaring — tuck them closer to your body', 'tip')
    }
  },
}
