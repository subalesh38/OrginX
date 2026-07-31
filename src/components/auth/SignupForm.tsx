import { Eye, EyeOff } from 'lucide-react'
import { useState } from 'react'

export interface SignupFields {
  email: string
  password: string
}

interface Props {
  fields: SignupFields
  onChange: (fields: SignupFields) => void
  onSubmit: () => void
  busy: boolean
  fieldErrors: Partial<Record<keyof SignupFields, string>>
}

export default function SignupForm({ fields, onChange, onSubmit, busy, fieldErrors }: Props) {
  const [showPw, setShowPw] = useState(false)

  function set<K extends keyof SignupFields>(key: K, value: SignupFields[K]) {
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
          placeholder="Password"
          value={fields.password}
          onChange={(e) => set('password', e.target.value)}
          autoComplete="current-password"
        />
        <button
          type="button"
          onClick={() => setShowPw((v) => !v)}
          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-mist hover:text-ink"
          tabIndex={-1}
        >
          {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
        {fieldErrors.password && <p className="text-warning text-xs mt-1 ml-1">{fieldErrors.password}</p>}
      </div>

      <button type="submit" className="btn-primary w-full mt-2" disabled={busy}>
        {busy ? 'Working…' : 'Sign Up'}
      </button>
    </form>
  )
}
