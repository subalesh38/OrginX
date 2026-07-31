import { CheckCircle2, ListChecks, TriangleAlert } from 'lucide-react'

interface Props {
  isGood: boolean
  message: string
  tips: string[]
}

export default function PostureFeedbackCard({ isGood, message, tips }: Props) {
  if (isGood) {
    return (
      <div className="card p-4 border-success/30 bg-success/5 flex items-start gap-3">
        <div className="w-9 h-9 rounded-full bg-success/15 flex items-center justify-center shrink-0">
          <CheckCircle2 className="text-success" size={20} />
        </div>
        <div>
          <p className="font-display font-semibold text-success text-sm">Great Form!</p>
          <p className="text-mist text-xs mt-0.5">{message}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="card p-4 border-warning/30 bg-warning/5">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-full bg-warning/15 flex items-center justify-center shrink-0">
          <TriangleAlert className="text-warning" size={20} />
        </div>
        <div>
          <p className="font-display font-semibold text-warning text-sm">Posture Needs Correction</p>
          <p className="text-mist text-xs mt-0.5">{message}</p>
        </div>
      </div>

      <div className="mt-3.5 pt-3.5 border-t border-warning/15">
        <div className="flex items-center gap-1.5 text-ink text-xs font-semibold mb-2">
          <ListChecks size={14} className="text-warning" />
          Improvement Tips
        </div>
        <ul className="space-y-1.5">
          {tips.map((tip) => (
            <li key={tip} className="text-mist text-xs flex gap-2">
              <span className="text-warning">•</span> {tip}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
