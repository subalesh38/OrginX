import { BarChart, Bar, XAxis, ResponsiveContainer, Tooltip } from 'recharts'
import type { WorkoutSession } from '../../types'
import { avgFormScore, buildExerciseBreakdown } from '../../lib/reportUtils'

interface Props {
  todaySessions: WorkoutSession[]
}

export default function DailyAnalytics({ todaySessions }: Props) {
  const totalReps = todaySessions.reduce((sum, s) => sum + s.reps, 0)
  const totalSets = todaySessions.reduce((sum, s) => sum + s.setsCompleted, 0)
  const accuracy = avgFormScore(todaySessions)
  const breakdown = buildExerciseBreakdown(todaySessions)

  return (
    <div className="card p-4">
      <h3 className="font-display font-semibold text-ink mb-3">Daily Progress</h3>

      <div className="grid grid-cols-4 gap-2 mb-4">
        <Stat label="Workouts" value={todaySessions.length} />
        <Stat label="Reps" value={totalReps} />
        <Stat label="Sets" value={totalSets} />
        <Stat label="Accuracy" value={todaySessions.length ? `${accuracy}%` : '—'} />
      </div>

      {breakdown.length > 0 ? (
        <ResponsiveContainer width="100%" height={140}>
          <BarChart data={breakdown}>
            <XAxis dataKey="label" stroke="#8A8FA6" fontSize={11} tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={{ background: '#FFFFFF', border: '1px solid #EAEBF5', borderRadius: 10, fontSize: 12 }}
              cursor={{ fill: 'rgba(91,79,233,0.06)' }}
            />
            <Bar dataKey="reps" fill="#5B4FE9" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <p className="text-mist text-xs text-center py-6">No workouts logged yet today.</p>
      )}
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
