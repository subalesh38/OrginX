import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from 'recharts'
import type { WeeklyGoal, WorkoutSession } from '../../types'
import { avgFormScore, buildLast7DaysChart } from '../../lib/reportUtils'

interface Props {
  sessions: WorkoutSession[]
  sessionsThisWeek: WorkoutSession[]
  weeklyGoal: WeeklyGoal
}

export default function WeeklyAnalytics({ sessions, sessionsThisWeek, weeklyGoal }: Props) {
  const chartData = buildLast7DaysChart(sessions)
  const weeklyReps = sessionsThisWeek.reduce((sum, s) => sum + s.reps, 0)
  const consistency = Math.round((sessionsThisWeek.length / weeklyGoal.targetSessions) * 100)
  const accuracy = avgFormScore(sessionsThisWeek)

  return (
    <div className="card p-4">
      <h3 className="font-display font-semibold text-ink mb-3">Weekly Progress</h3>

      <div className="grid grid-cols-4 gap-2 mb-4">
        <Stat label="Workouts" value={sessionsThisWeek.length} />
        <Stat label="Reps" value={weeklyReps} />
        <Stat label="Consistency" value={`${Math.min(100, consistency)}%`} />
        <Stat label="Accuracy" value={sessionsThisWeek.length ? `${accuracy}%` : '—'} />
      </div>

      <ResponsiveContainer width="100%" height={150}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#EAEBF5" vertical={false} />
          <XAxis dataKey="label" stroke="#8A8FA6" fontSize={11} tickLine={false} axisLine={false} />
          <YAxis stroke="#8A8FA6" fontSize={11} tickLine={false} axisLine={false} width={24} />
          <Tooltip
            contentStyle={{ background: '#FFFFFF', border: '1px solid #EAEBF5', borderRadius: 10, fontSize: 12 }}
            cursor={{ stroke: '#5B4FE9', strokeWidth: 1 }}
          />
          <Line type="monotone" dataKey="reps" stroke="#5B4FE9" strokeWidth={2.5} dot={{ r: 3, fill: '#5B4FE9' }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl bg-surface2 px-2 py-2.5 text-center">
      <div className="odometer text-ink font-bold text-base">{value}</div>
      <div className="text-mist text-[10px] mt-0.5 leading-tight">{label}</div>
    </div>
  )
}
