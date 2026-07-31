import { useEffect, useState } from 'react'
import { Bell } from 'lucide-react'
import { REMINDER_SETTINGS_KEY } from '../../lib/constants'
import type { ReminderSettings as ReminderSettingsType } from '../../types'

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
const DEFAULT_SETTINGS: ReminderSettingsType = { enabled: true, time: '18:00', days: [1, 2, 3, 4, 5] }

function load(): ReminderSettingsType {
  try {
    const raw = localStorage.getItem(REMINDER_SETTINGS_KEY)
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS
  } catch {
    return DEFAULT_SETTINGS
  }
}

export default function ReminderSettings() {
  const [settings, setSettings] = useState<ReminderSettingsType>(load)

  useEffect(() => {
    localStorage.setItem(REMINDER_SETTINGS_KEY, JSON.stringify(settings))
  }, [settings])

  function toggleDay(day: number) {
    setSettings((s) => ({
      ...s,
      days: s.days.includes(day) ? s.days.filter((d) => d !== day) : [...s.days, day].sort(),
    }))
  }

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <Bell className="text-primary" size={15} />
          </div>
          <span className="font-display font-semibold text-ink text-sm">Workout Reminder</span>
        </div>
        <button
          onClick={() => setSettings((s) => ({ ...s, enabled: !s.enabled }))}
          className={`w-11 h-6 rounded-full transition-colors relative shrink-0 ${settings.enabled ? 'bg-primary' : 'bg-border'}`}
        >
          <span
            className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-card transition-transform ${
              settings.enabled ? 'translate-x-[22px]' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>
      <p className="text-mist text-xs mb-4 ml-10">Receive a notification to complete your daily workout.</p>

      <div className={`space-y-3 transition-opacity ${settings.enabled ? '' : 'opacity-40 pointer-events-none'}`}>
        <div>
          <label className="text-mist text-xs font-medium">Reminder time</label>
          <input
            type="time"
            className="input mt-1.5"
            value={settings.time}
            onChange={(e) => setSettings((s) => ({ ...s, time: e.target.value }))}
          />
        </div>
        <div>
          <label className="text-mist text-xs font-medium">Workout days</label>
          <div className="flex gap-1.5 mt-1.5">
            {DAY_LABELS.map((label, i) => (
              <button
                key={i}
                onClick={() => toggleDay(i)}
                className={`w-9 h-9 rounded-full text-xs font-semibold transition-colors ${
                  settings.days.includes(i) ? 'bg-primary text-white' : 'bg-surface2 text-mist'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
