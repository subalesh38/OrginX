import { Eye, EyeOff } from 'lucide-react'
import { useState } from 'react'

export interface LoginFields {
  name: string
  email: string
  newPassword: string
  confirmPassword: string
}

interface Props {
  fields: LoginFields
  onChange: (fields: LoginFields) => void
  onSubmit: () => void
  busy: boolean
  fieldErrors: Partial<Record<keyof LoginFields, string>>
  /** Seconds left before another signup/confirmation email may be sent; 0 means no cooldown active. */
  cooldownSec: number
}

export default function LoginForm({ fields, onChange, onSubmit, busy, fieldErrors, cooldownSec }: Props) {
  const [showPw, setShowPw] = useState(false)

  function set<K extends keyof LoginFields>(key: K, value: LoginFields[K]) {
    onChange({ ...fields, [key]: value })
  }

  return (
    <form
      className="space-y-3.5 animate-fade-in"
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit()
      }}
    >
      <div>
        <input
          className="input"
          placeholder="Name"
          value={fields.name}
          onChange={(e) => set('name', e.target.value)}
          autoComplete="name"
        />
        {fieldErrors.name && <p className="text-warning text-xs mt-1 ml-1">{fieldErrors.name}</p>}
      </div>
      <div>
        <input
          className="input"
          type="email"
          placeholder="Gmail"
          value={fields.email}
          onChange={(e) => set('email', e.target.value)}
          autoComplete="email"
        />
        {fieldErrors.email && <p className="text-warning text-xs mt-1 ml-1">{fieldErrors.email}</p>}
      </div>
      <div className="relative">
        <input
          className="input pr-11"
          type={showPw ? 'text' : 'password'}
          placeholder="New password"
          value={fields.newPassword}
          onChange={(e) => set('newPassword', e.target.value)}
          autoComplete="new-password"
        />
        <button
          type="button"
          onClick={() => setShowPw((v) => !v)}
          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-mist hover:text-ink"
          tabIndex={-1}
        >
          {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
        {fieldErrors.newPassword && <p className="text-warning text-xs mt-1 ml-1">{fieldErrors.newPassword}</p>}
      </div>
      <div>
        <input
          className="input"
          type={showPw ? 'text' : 'password'}
          placeholder="Confirm password"
          value={fields.confirmPassword}
          onChange={(e) => set('confirmPassword', e.target.value)}
          autoComplete="new-password"
        />
        {fieldErrors.confirmPassword && <p className="text-warning text-xs mt-1 ml-1">{fieldErrors.confirmPassword}</p>}
      </div>

      <button type="submit" className="btn-primary w-full mt-2" disabled={busy || cooldownSec > 0}>
        {busy ? 'Working…' : cooldownSec > 0 ? `Resend in ${cooldownSec}s` : 'Login'}
      </button>
    </form>
  )
}
