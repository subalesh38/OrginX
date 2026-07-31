import { useEffect, useMemo, useState } from 'react'
import { Lightbulb, Sparkles } from 'lucide-react'
import DailyAnalytics from './DailyAnalytics'
import WeeklyAnalytics from './WeeklyAnalytics'
import GoalCard from './GoalCard'
import { getAllSessions, getOrCreateWeeklyGoal } from '../../lib/db'
import { DAILY_TARGET_SESSIONS } from '../../lib/constants'
import { avgFormScore, isToday } from '../../lib/reportUtils'
import { fetchWorkoutReport, supabaseEnabled } from '../../lib/supabase'
import type { WeeklyGoal, WorkoutReport, WorkoutSession } from '../../types'

interface Props {
  userId: string | null
  refreshKey: number
}

export default function ReportPage({ userId, refreshKey }: Props) {
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

  const todaySessions = useMemo(() => sessions.filter((s) => isToday(s.startedAt)), [sessions])

  const weekStart = weeklyGoal ? new Date(weeklyGoal.weekStart) : new Date()
  const sessionsThisWeek = sessions.filter((s) => new Date(s.startedAt) >= weekStart)
  const prevWeekStart = new Date(weekStart)
  prevWeekStart.setDate(prevWeekStart.getDate() - 7)
  const prevWeekSessions = sessions.filter((s) => new Date(s.startedAt) >= prevWeekStart && new Date(s.startedAt) < weekStart)

  const weeklyAccuracy = avgFormScore(sessionsThisWeek)
  const prevWeeklyAccuracy = avgFormScore(prevWeekSessions)

  const insight = useMemo(() => {
    if (prevWeekSessions.length && sessionsThisWeek.length) {
      const diff = weeklyAccuracy - prevWeeklyAccuracy
      if (diff > 0) return `Your posture accuracy improved by ${diff}% compared to last week. Keep it up!`
      if (diff < 0) return `Posture accuracy dipped ${Math.abs(diff)}% vs last week — slow down and focus on form.`
      return 'Your posture accuracy is holding steady week over week.'
    }
    if (weeklyGoal && sessionsThisWeek.length > 0 && sessionsThisWeek.length < weeklyGoal.targetSessions) {
      const remaining = weeklyGoal.targetSessions - sessionsThisWeek.length
      return `You're ${remaining} workout${remaining === 1 ? '' : 's'} away from completing your weekly goal.`
    }
    if (weeklyGoal && sessionsThisWeek.length >= weeklyGoal.targetSessions) {
      return "You've hit your weekly goal already — fantastic consistency!"
    }
    return 'Complete your first workout to start unlocking personalized insights.'
  }, [prevWeekSessions.length, sessionsThisWeek.length, weeklyAccuracy, prevWeeklyAccuracy, weeklyGoal])

  const goals = weeklyGoal
    ? [
        {
          title: 'Weekly Sessions',
          progressLabel: `${sessionsThisWeek.length} of ${weeklyGoal.targetSessions} workouts`,
          percent: (sessionsThisWeek.length / weeklyGoal.targetSessions) * 100,
          achieved: sessionsThisWeek.length >= weeklyGoal.targetSessions,
        },
        {
          title: "Today's Sessions",
          progressLabel: `${todaySessions.length} of ${DAILY_TARGET_SESSIONS} workouts`,
          percent: (todaySessions.length / DAILY_TARGET_SESSIONS) * 100,
          achieved: todaySessions.length >= DAILY_TARGET_SESSIONS,
        },
        {
          title: 'Consistency Streak',
          progressLabel: `${sessionsThisWeek.length} of 3 sessions this week`,
          percent: (sessionsThisWeek.length / 3) * 100,
          achieved: sessionsThisWeek.length >= 3,
        },
        {
          title: 'Posture Pro',
          progressLabel: sessionsThisWeek.length ? `${weeklyAccuracy}% average accuracy` : 'Log a workout to unlock',
          percent: weeklyAccuracy,
          achieved: sessionsThisWeek.length > 0 && weeklyAccuracy >= 90,
        },
      ]
    : []

  const achievedGoals = goals.filter((g) => g.achieved)
  const inProgressGoals = goals.filter((g) => !g.achieved)

  // --- AI post-workout report: wiring only (see task note) — this fetches
  // the real Edge Function response and shows its exact shape; the
  // polished per-section UI (formCorrections/progressComparison cards etc.)
  // is intentionally not built yet.
  const latestSyncedSession = [...sessions].reverse().find((s) => s.remoteId)
  const [aiReport, setAiReport] = useState<WorkoutReport | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)

  async function handleGenerateAiReport() {
    if (!latestSyncedSession?.remoteId || !weeklyGoal) return
    setAiLoading(true)
    setAiError(null)
    try {
      const report = await fetchWorkoutReport(latestSyncedSession.remoteId, {
        targetSessions: weeklyGoal.targetSessions,
        targetReps: weeklyGoal.targetReps,
      })
      setAiReport(report)
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'Failed to generate report')
    } finally {
      setAiLoading(false)
    }
  }

  return (
    <div className="flex-1 overflow-y-auto px-5 pt-6 pb-6 space-y-5">
      <h1 className="font-display font-semibold text-ink text-xl">Report</h1>

      {!loading && weeklyGoal && (
        <>
          <div className="rounded-xl3 bg-primary/8 border border-primary/15 p-4 flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
              <Lightbulb className="text-primary" size={16} />
            </div>
            <p className="text-ink text-sm leading-snug">{insight}</p>
          </div>

          <DailyAnalytics todaySessions={todaySessions} />
          <WeeklyAnalytics sessions={sessions} sessionsThisWeek={sessionsThisWeek} weeklyGoal={weeklyGoal} />

          <div>
            <h2 className="font-display font-semibold text-ink text-lg mb-3">Goals</h2>

            {inProgressGoals.length > 0 && (
              <div className="mb-4">
                <p className="text-mist text-xs font-medium uppercase tracking-wide mb-2">Goals in Progress</p>
                <div className="space-y-2.5">
                  {inProgressGoals.map((g) => (
                    <GoalCard key={g.title} {...g} />
                  ))}
                </div>
              </div>
            )}

            {achievedGoals.length > 0 && (
              <div>
                <p className="text-mist text-xs font-medium uppercase tracking-wide mb-2">Achieved Goals</p>
                <div className="space-y-2.5">
                  {achievedGoals.map((g) => (
                    <GoalCard key={g.title} {...g} />
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="card p-4">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="text-primary" size={16} />
              <h2 className="font-display font-semibold text-ink text-sm">AI Post-Workout Report (dev preview)</h2>
            </div>
            <p className="text-mist text-xs mb-3">
              Wiring only — calls the real <code>generate-workout-report</code> Edge Function and shows its response
              shape. Only aggregated stats (reps/sets/duration/form-flag counts) are sent; no pose data.
            </p>

            {!supabaseEnabled ? (
              <p className="text-mist text-xs">Cloud sync is disabled — configure Supabase to enable AI reports.</p>
            ) : !latestSyncedSession ? (
              <p className="text-mist text-xs">Finish and save a workout while signed in to Supabase to try this.</p>
            ) : (
              <button onClick={handleGenerateAiReport} disabled={aiLoading} className="btn-secondary text-xs py-2 px-3.5">
                {aiLoading ? 'Generating…' : 'Generate AI Report'}
              </button>
            )}

            {aiError && <p className="text-warning text-xs mt-3">{aiError}</p>}

            {aiReport && (
              <pre className="mt-3 text-[11px] leading-relaxed bg-surface2 rounded-xl p-3 overflow-x-auto whitespace-pre-wrap">
                {JSON.stringify(aiReport, null, 2)}
              </pre>
            )}
          </div>
        </>
      )}
    </div>
  )
}
