import type { ExercisePlugin } from './types'
import { checkBackLean, makeAngleRepCycle } from './angleRepCycle'

// Widened from {100, 160} — a frontal 2D webcam view rarely projects a
// standing leg to a full 160° extension, which was stalling the state
// machine in 'down' after the first rep. First-pass number, not tuned
// against real capture data.
const angleThresholds = { downAngle: 110, upAngle: 150, backLeanMax: 45 }

export const squat: ExercisePlugin = {
  id: 'squat',
  label: 'Squat',
  icon: '🏋️',
  description: 'Hip & knee angle rep counter',
  isHold: false,
  targetReps: 12,
  targetSets: 3,
  tips: [
    'Keep your back straight and chest up.',
    'Align your knees with your toes.',
    'Push through your heels on the way up.',
    'Lower until thighs are roughly parallel to the floor.',
  ],
  angleThresholds,
  detectRepCycle: makeAngleRepCycle(angleThresholds, (m) => m.kneeAngle),
  checkForm(metrics, state, flag) {
    checkBackLean(metrics, angleThresholds, flag)
    if (metrics.kneeAngle !== undefined && state.phase === 'down' && metrics.kneeAngle < 70) {
      flag('deep-squat-knee', 'Ease up slightly — watch knee strain at the bottom', 'tip')
    }
  },
}
