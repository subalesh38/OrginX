import type { ExercisePlugin } from './types'
import { squat } from './squat'
import { pushup } from './pushup'
import { plank } from './plank'
import { lunge } from './lunge'
import { burpee } from './burpee'

/**
 * The plugin registry — adding a 6th exercise means writing a new file next
 * to these and adding one line here. Nothing in the core loop
 * (`../exerciseLogic.ts`) or the UI needs to change.
 */
export const EXERCISES: ExercisePlugin[] = [squat, pushup, plank, lunge, burpee]

export function getExercise(id: string): ExercisePlugin {
  const found = EXERCISES.find((e) => e.id === id)
  if (!found) throw new Error(`Unknown exercise: ${id}`)
  return found
}
