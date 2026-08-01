import type { WorkoutSession } from '../../types'

interface Props {
  selected: Date
  onSelect: (date: Date) => void
  sessions?: WorkoutSession[]
}

function startOfWeek(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay() || 7
  d.setDate(d.getDate() - day + 1)
  d.setHours(0, 0, 0, 0)
  return d
}

function sameDay(a: Date, b: Date): boolean {
  return a.toDateString() === b.toDateString()
}

export default function WeeklyCalendar({ selected, onSelect, sessions = [] }: Props) {
  const today = new Date()
  const weekStart = startOfWeek(today)
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart)
    d.setDate(weekStart.getDate() + i)
    return d
  })

  const activeDays = new Set(sessions.map((s) => new Date(s.startedAt).toDateString()))

  return (
    <div className="flex justify-between gap-1.5">
      {days.map((d) => {
        const isToday = sameDay(d, today)
        const isSelected = sameDay(d, selected)
        const hasActivity = activeDays.has(d.toDateString())
        return (
          <button
            key={d.toISOString()}
            onClick={() => onSelect(d)}
            className={`flex-1 flex flex-col items-center gap-1.5 rounded-2xl py-2.5 transition-all ${
              isSelected ? 'bg-primary-gradient shadow-glow' : 'bg-transparent hover:bg-surface2'
            }`}
          >
            <span className={`text-[11px] font-medium ${isSelected ? 'text-white/80' : 'text-mist'}`}>
              {d.toLocaleDateString(undefined, { weekday: 'narrow' })}
            </span>
            <span
              className={`text-sm font-display font-semibold ${
                isSelected ? 'text-white' : isToday ? 'text-primary' : 'text-ink'
              }`}
            >
              {d.getDate()}
            </span>
            <span
              className={`w-1 h-1 rounded-full ${
                hasActivity ? (isSelected ? 'bg-white' : 'bg-success') : 'bg-transparent'
              }`}
            />
          </button>
        )
      })}
    </div>
  )
}
