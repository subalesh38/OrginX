import { Dumbbell, Flame, Footprints, PersonStanding, Timer, type LucideIcon } from 'lucide-react'
import type { ExerciseId } from '../types'

export const EXERCISE_ICONS: Record<ExerciseId, LucideIcon> = {
  squat: PersonStanding,
  pushup: Dumbbell,
  plank: Timer,
  lunge: Footprints,
  burpee: Flame,
}
