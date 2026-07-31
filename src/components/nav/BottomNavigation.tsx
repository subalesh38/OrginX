import { CalendarCheck2, Dumbbell, BarChart3, UserRound } from 'lucide-react'

export type Tab = 'plan' | 'workout' | 'report' | 'me'

interface Props {
  active: Tab
  onChange: (tab: Tab) => void
}

const ITEMS: { id: Tab; label: string; icon: typeof CalendarCheck2 }[] = [
  { id: 'plan', label: 'Plan', icon: CalendarCheck2 },
  { id: 'workout', label: 'Workout', icon: Dumbbell },
  { id: 'report', label: 'Report', icon: BarChart3 },
  { id: 'me', label: 'Me', icon: UserRound },
]

export default function BottomNavigation({ active, onChange }: Props) {
  return (
    <nav className="shrink-0 bg-surface/95 backdrop-blur-xl border-t border-border shadow-nav px-3 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
      <div className="flex items-stretch justify-between">
        {ITEMS.map(({ id, label, icon: Icon }) => {
          const isActive = active === id
          return (
            <button
              key={id}
              onClick={() => onChange(id)}
              className="relative flex-1 flex flex-col items-center gap-1 py-1.5 group"
            >
              <span
                className={`flex items-center justify-center w-11 h-8 rounded-full transition-all duration-200 ${
                  isActive ? 'bg-primary/10' : 'group-active:bg-surface2'
                }`}
              >
                <Icon
                  size={20}
                  strokeWidth={isActive ? 2.4 : 2}
                  className={isActive ? 'text-primary' : 'text-mist'}
                />
              </span>
              <span className={`text-[11px] font-medium transition-colors ${isActive ? 'text-primary' : 'text-mist'}`}>
                {label}
              </span>
              {isActive && <span className="absolute -top-2 w-1.5 h-1.5 rounded-full bg-primary" />}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
