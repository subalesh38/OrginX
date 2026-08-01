import { useEffect, useMemo, useState } from 'react'
import ProfileHeader from './ProfileHeader'
import WeeklyCalendar from './WeeklyCalendar'
import TodayChallengeCard from './TodayChallengeCard'
import ExerciseCard from './ExerciseCard'
import GoalProgressCard from './GoalProgressCard'
import { EXERCISES } from '../../lib/exercises/registry'
import { getAllSessions, getOrCreateWeeklyGoal } from '../../lib/db'
import { DAILY_TARGET_SESSIONS } from '../../lib/constants'
import type { ExerciseId, WeeklyGoal, WorkoutSession } from '../../types'

interface Props {
  displayName: string
  userId: string | null
  refreshKey: number
  onSelectExercise: (id: ExerciseId) => void
}

function dayOfYear(d: Date): number {
  const start = new Date(d.getFullYear(), 0, 0)
  const diff = d.getTime() - start.getTime()
  return Math.floor(diff / 86400000)
}

export default function PlanPage({ displayName, userId, refreshKey, onSelectExercise }: Props) {
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [sessions, setSessions] = useState<WorkoutSession[]>([])
  const [weeklyGoal, setWeeklyGoal] = useState<WeeklyGoal | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([getAllSessions(userId), getOrCreateWeeklyGoal(userId, 6, 300)]).then(([all, goal]) => {
      if (cancelled) return
      setSessions(all)
      setWeeklyGoal(goal)
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [userId, refreshKey])

  const todayChallenge = useMemo(() => EXERCISES[dayOfYear(new Date()) % EXERCISES.length], [])

  const todaySessions = useMemo(
    () => sessions.filter((s) => new Date(s.startedAt).toDateString() === new Date().toDateString()),
    [sessions],
  )
  const setsDoneTodayForChallenge = todaySessions
    .filter((s) => s.exerciseId === todayChallenge.id)
    .reduce((sum, s) => sum + s.setsCompleted, 0)

  const weekStart = weeklyGoal ? new Date(weeklyGoal.weekStart) : new Date()
  const sessionsThisWeek = sessions.filter((s) => new Date(s.startedAt) >= weekStart)

  return (
    <div className="flex-1 overflow-y-auto px-5 pt-6 pb-6 space-y-6">
      <ProfileHeader name={displayName || 'Athlete'} />

      <WeeklyCalendar selected={selectedDate} onSelect={setSelectedDate} sessions={sessions} />

      {!loading && (
        <TodayChallengeCard
          exercise={todayChallenge}
          setsDoneToday={setsDoneTodayForChallenge}
          onStart={() => onSelectExercise(todayChallenge.id)}
        />
      )}

      <div>
        <h2 className="font-display font-semibold text-ink text-lg mb-3">Exercise Session</h2>
        <div className="grid grid-cols-2 gap-3">
          {EXERCISES.map((ex) => (
            <ExerciseCard key={ex.id} exercise={ex} onSelect={() => onSelectExercise(ex.id)} />
          ))}
        </div>
      </div>

      {!loading && weeklyGoal && (
        <div>
          <h2 className="font-display font-semibold text-ink text-lg mb-3">Goals</h2>
          <div className="grid grid-cols-2 gap-3">
            <GoalProgressCard
              title="Today's Goal"
              completed={todaySessions.length}
              target={DAILY_TARGET_SESSIONS}
              unit="workouts completed"
              color="#5B4FE9"
            />
            <GoalProgressCard
              title="Weekly Goal"
              completed={sessionsThisWeek.length}
              target={weeklyGoal.targetSessions}
              unit="workouts completed"
              color="#22C55E"
            />
          </div>
        </div>
      )}
    </div>
  )
}
