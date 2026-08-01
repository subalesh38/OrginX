import { LogOut } from 'lucide-react'

interface Props {
  onConfirm: () => void
  onCancel: () => void
}

export default function LogoutDialog({ onConfirm, onCancel }: Props) {
  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center px-6">
      <div className="absolute inset-0 bg-ink/50 backdrop-blur-sm animate-fade-in" onClick={onCancel} />
      <div className="relative w-full max-w-xs bg-surface rounded-xl3 shadow-2xl p-5 animate-scale-in text-center">
        <div className="w-12 h-12 rounded-full bg-warning/10 flex items-center justify-center mx-auto mb-3">
          <LogOut className="text-warning" size={22} />
        </div>
        <h2 className="font-display font-semibold text-ink text-lg mb-1">Log out?</h2>
        <p className="text-mist text-sm mb-5">Are you sure you want to log out?</p>
        <div className="flex gap-2.5">
          <button onClick={onCancel} className="btn-secondary flex-1 py-2.5">
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 rounded-2xl bg-warning text-white font-display font-semibold text-sm hover:brightness-95 active:scale-[0.98] transition"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  )
}
