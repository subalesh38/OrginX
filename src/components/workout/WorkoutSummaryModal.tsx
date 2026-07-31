import { PartyPopper, TriangleAlert, X } from 'lucide-react'
import type { WorkoutSession } from '../../types'
import { getExercise } from '../../lib/exercises/registry'

interface Props {
  session: WorkoutSession
  motivation: string
  onSave: () => void
  onDismiss: () => void
  saving: boolean
}

export default function WorkoutSummaryModal({ session, motivation, onSave, onDismiss, saving }: Props) {
  const exercise = getExercise(session.exerciseId)
  const minutes = Math.floor(session.durationSec / 60)
  const seconds = session.durationSec % 60
  const corrections = session.formFlags.filter((f) => f.severity === 'warning').length

  return (
    <div className="absolute inset-0 z-30 flex items-end justify-center">
      <div className="absolute inset-0 bg-ink/50 backdrop-blur-sm animate-fade-in" onClick={onDismiss} />
      <div className="relative w-full bg-surface rounded-t-[32px] shadow-2xl px-6 pt-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] animate-sheet-up max-h-[88%] overflow-y-auto">
        <div className="w-10 h-1.5 bg-border rounded-full mx-auto mb-4" />
        <button onClick={onDismiss} className="absolute top-5 right-5 text-mist hover:text-ink">
          <X size={20} />
        </button>

        <div className="flex items-center gap-2 mb-1">
          <PartyPopper className="text-primary" size={20} />
          <h2 className="font-display text-xl font-semibold text-ink">Workout complete</h2>
        </div>
        <p className="text-mist text-sm mb-5">
          {exercise.label} · {minutes}m {seconds}s
        </p>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <SummaryStat label={session.exerciseId === 'plank' ? 'Total hold' : 'Total reps'} value={session.reps} accent="text-primary" />
          <SummaryStat label="Sets completed" value={`${session.setsCompleted}/${session.targetSets}`} accent="text-success" />
        </div>
        <div className="grid grid-cols-2 gap-3 mb-5">
          <SummaryStat label="Posture accuracy" value={`${session.formScore}%`} accent="text-info" />
          <SummaryStat label="Corrections" value={corrections} accent="text-warning" />
        </div>

        {session.reps === 0 ? (
          <div className="rounded-2xl bg-warning/10 border border-warning/30 px-4 py-3 mb-5 flex items-start gap-2.5">
            <TriangleAlert className="text-warning shrink-0 mt-0.5" size={16} />
            <p className="text-ink text-sm">
              No reps were detected this session, so there's nothing to score. Make sure your full body is in
              frame and complete a full rep next time.
            </p>
          </div>
        ) : (
          <div className="rounded-2xl bg-primary/5 border border-primary/15 px-4 py-3 mb-5">
            <p className="text-ink text-sm font-medium">{motivation}</p>
          </div>
        )}

        <button onClick={onSave} className="btn-primary w-full" disabled={saving}>
          {saving ? 'Saving…' : 'Save Workout'}
        </button>
      </div>
    </div>
  )
}

function SummaryStat({ label, value, accent }: { label: string; value: string | number; accent: string }) {
  return (
    <div className="card p-3.5">
      <div className={`odometer text-2xl font-bold ${accent}`}>{value}</div>
      <div className="text-mist text-[11px] mt-1 leading-tight">{label}</div>
    </div>
  )
}
