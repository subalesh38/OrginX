import type { ExercisePlugin } from '../../lib/exercises/types'
import { EXERCISE_ICONS } from '../../lib/exerciseIcons'

interface Props {
  exercise: ExercisePlugin
  onSelect: () => void
}

export default function ExerciseCard({ exercise, onSelect }: Props) {
  const Icon = EXERCISE_ICONS[exercise.id]
  const unit = exercise.isHold ? `${exercise.targetReps}s` : `${exercise.targetReps} reps`

  return (
    <button
      onClick={onSelect}
      className="card p-4 text-left hover:shadow-glow hover:border-primary/30 active:scale-[0.98] transition-all group"
    >
      <div className="w-11 h-11 rounded-2xl bg-primary/10 flex items-center justify-center mb-3 group-hover:bg-primary/15 transition-colors">
        <Icon className="text-primary" size={22} />
      </div>
      <div className="font-display font-semibold text-ink">{exercise.label}</div>
      <div className="text-mist text-xs mt-1">
        {unit} · {exercise.targetSets} sets
      </div>
    </button>
  )
}
