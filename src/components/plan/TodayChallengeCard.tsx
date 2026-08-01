import { ChevronRight, Sparkles } from 'lucide-react'
import type { ExercisePlugin } from '../../lib/exercises/types'
import { EXERCISE_ICONS } from '../../lib/exerciseIcons'

interface Props {
  exercise: ExercisePlugin
  setsDoneToday: number
  onStart: () => void
}

export default function TodayChallengeCard({ exercise, setsDoneToday, onStart }: Props) {
  const Icon = EXERCISE_ICONS[exercise.id]
  const progress = Math.min(100, (setsDoneToday / exercise.targetSets) * 100)
  const done = setsDoneToday >= exercise.targetSets
  const unit = exercise.isHold ? `${exercise.targetReps}s hold` : `${exercise.targetReps} reps`

  return (
    <button
      onClick={onStart}
      className="w-full text-left rounded-xl3 p-5 bg-primary-gradient shadow-glow relative overflow-hidden group"
    >
      <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-white/10" />
      <div className="absolute right-10 bottom-0 w-20 h-20 rounded-full bg-white/10" />

      <div className="relative flex items-start justify-between">
        <div className="flex items-center gap-1.5 text-white/80 text-xs font-medium uppercase tracking-wide">
          <Sparkles size={13} />
          Today's Challenge
        </div>
        <ChevronRight className="text-white/70 group-hover:translate-x-0.5 transition-transform" size={20} />
      </div>

      <div className="relative flex items-center gap-3 mt-3">
        <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
          <Icon className="text-white" size={22} />
        </div>
        <div className="min-w-0">
          <p className="font-display font-semibold text-white text-lg leading-tight">
            Complete {exercise.targetSets} sets of {unit}
          </p>
          <p className="text-white/75 text-xs mt-0.5">{exercise.label} · stay consistent, you've got this</p>
        </div>
      </div>

      <div className="relative mt-4">
        <div className="flex items-center justify-between text-white/80 text-xs mb-1.5">
          <span>{done ? 'Challenge complete' : `${setsDoneToday} of ${exercise.targetSets} sets`}</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="h-2 rounded-full bg-white/25 overflow-hidden">
          <div className="h-full bg-white rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
      </div>
    </button>
  )
}
