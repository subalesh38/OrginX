import type { WorkoutSession } from '../types'
import { getExercise } from './exercises/registry'

export function isToday(ts: number): boolean {
  return new Date(ts).toDateString() === new Date().toDateString()
}

export function avgFormScore(sessions: WorkoutSession[]): number {
  if (!sessions.length) return 0
  return Math.round(sessions.reduce((sum, s) => sum + s.formScore, 0) / sessions.length)
}

export function buildLast7DaysChart(sessions: WorkoutSession[]) {
  const days: { label: string; date: string; reps: number; accuracy: number }[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    days.push({ label: d.toLocaleDateString(undefined, { weekday: 'short' }), date: d.toDateString(), reps: 0, accuracy: 0 })
  }
  for (const s of sessions) {
    const dateStr = new Date(s.startedAt).toDateString()
    const day = days.find((d) => d.date === dateStr)
    if (day) day.reps += s.reps
  }
  for (const day of days) {
    const daySessions = sessions.filter((s) => new Date(s.startedAt).toDateString() === day.date)
    day.accuracy = avgFormScore(daySessions)
  }
  return days
}

export function buildExerciseBreakdown(sessions: WorkoutSession[]) {
  const byExercise = new Map<string, number>()
  for (const s of sessions) {
    byExercise.set(s.exerciseId, (byExercise.get(s.exerciseId) ?? 0) + s.reps)
  }
  return Array.from(byExercise.entries()).map(([id, reps]) => ({
    label: getExercise(id).label,
    reps,
  }))
}
