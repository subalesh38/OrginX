import { CheckCircle2, Clock } from 'lucide-react'

interface Props {
  title: string
  progressLabel: string
  percent: number
  achieved: boolean
}

export default function GoalCard({ title, progressLabel, percent, achieved }: Props) {
  const clamped = Math.min(100, percent)
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="font-display font-semibold text-ink text-sm">{title}</p>
        <span
          className={`chip text-[11px] ${
            achieved ? 'bg-success/10 text-success' : 'bg-info/10 text-info'
          }`}
        >
          {achieved ? <CheckCircle2 size={12} /> : <Clock size={12} />}
          {achieved ? 'Achieved' : 'In Progress'}
        </span>
      </div>
      <div className="h-2 rounded-full bg-surface2 overflow-hidden mb-1.5">
        <div
          className={`h-full rounded-full transition-all duration-500 ${achieved ? 'bg-success' : 'bg-primary'}`}
          style={{ width: `${clamped}%` }}
        />
      </div>
      <div className="flex items-center justify-between text-xs text-mist">
        <span>{progressLabel}</span>
        <span>{Math.round(clamped)}%</span>
      </div>
    </div>
  )
}
