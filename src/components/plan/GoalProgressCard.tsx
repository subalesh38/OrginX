import ProgressRing from '../shared/ProgressRing'

interface Props {
  title: string
  completed: number
  target: number
  unit: string
  color?: string
}

export default function GoalProgressCard({ title, completed, target, unit, color = '#5B4FE9' }: Props) {
  const percent = target > 0 ? Math.min(100, (completed / target) * 100) : 0

  return (
    <div className="card p-4 flex flex-col items-start gap-3">
      <span className="text-mist text-xs font-medium uppercase tracking-wide">{title}</span>
      <div className="flex items-center gap-3 w-full">
        <ProgressRing percent={percent} size={54} strokeWidth={6} color={color}>
          <span className="odometer text-xs font-bold text-ink">{Math.round(percent)}%</span>
        </ProgressRing>
        <div className="min-w-0">
          <p className="font-display font-semibold text-ink text-base leading-tight">
            {completed} <span className="text-mist font-normal">/ {target}</span>
          </p>
          <p className="text-mist text-xs mt-0.5">{unit}</p>
        </div>
      </div>
    </div>
  )
}
