import { useState } from 'react'
import { ChevronRight, LogOut, Pencil, User } from 'lucide-react'
import Avatar from '../shared/Avatar'
import ReminderSettings from './ReminderSettings'
import LogoutDialog from './LogoutDialog'
import { useAuth } from '../../lib/AuthContext'
import { isValidEmail } from '../../lib/validation'
import { supabase, supabaseEnabled } from '../../lib/supabase'

interface Props {
  onLogout: () => void
}

export default function ProfilePage({ onLogout }: Props) {
  const { displayName, email, setIdentity } = useAuth()
  const [editing, setEditing] = useState(false)
  const [showLogoutDialog, setShowLogoutDialog] = useState(false)
  const [fields, setFields] = useState({ name: displayName, email, currentPassword: '', newPassword: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  function startEditing() {
    setFields({ name: displayName, email, currentPassword: '', newPassword: '' })
    setErrors({})
    setSaved(false)
    setEditing(true)
  }

  const changingCredentials = supabaseEnabled && (Boolean(fields.newPassword) || fields.email.trim() !== email)

  async function handleSaveChanges() {
    const nextErrors: Record<string, string> = {}
    if (!fields.name.trim()) nextErrors.name = 'Enter your name'
    if (!fields.email.trim()) nextErrors.email = 'Enter your email'
    else if (!isValidEmail(fields.email)) nextErrors.email = 'Enter a valid email address'
    if (fields.newPassword && fields.newPassword.length < 6) nextErrors.newPassword = 'At least 6 characters'
    // Changing the login email or password is account-security-sensitive —
    // require proof of the current password rather than letting anyone
    // with an open session silently take over the account's credentials.
    if (changingCredentials && !fields.currentPassword) nextErrors.currentPassword = 'Enter your current password'
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) return

    setSaving(true)
    if (supabaseEnabled && supabase) {
      if (changingCredentials) {
        const { error: verifyError } = await supabase.auth.signInWithPassword({
          email,
          password: fields.currentPassword,
        })
        if (verifyError) {
          setErrors({ currentPassword: 'Current password is incorrect' })
          setSaving(false)
          return
        }
      }
      try {
        await supabase.auth.updateUser({
          email: fields.email !== email ? fields.email : undefined,
          password: fields.newPassword || undefined,
          data: { name: fields.name },
        })
      } catch {
        // best-effort; local identity still updates below
      }
    }
    setIdentity(fields.name.trim(), fields.email.trim())
    setSaving(false)
    setSaved(true)
    setEditing(false)
  }

  return (
    <div className="flex-1 overflow-y-auto px-5 pt-6 pb-6 space-y-5 relative">
      <div className="flex items-center gap-3.5">
        <Avatar name={displayName || 'Athlete'} size={58} />
        <div className="min-w-0">
          <h1 className="font-display font-semibold text-ink text-lg truncate">Welcome back, {displayName || 'Athlete'}</h1>
          <p className="text-mist text-sm truncate">{email || 'guest@local'}</p>
        </div>
      </div>

      {saved && (
        <div className="rounded-xl border border-success/30 bg-success/10 px-3 py-2 text-xs text-success">
          Profile updated.
        </div>
      )}

      <div className="card p-4">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="text-primary" size={15} />
            </div>
            <span className="font-display font-semibold text-ink text-sm">Profile</span>
          </div>
          {!editing && (
            <button onClick={startEditing} className="flex items-center gap-1 text-primary text-xs font-medium">
              <Pencil size={13} /> Edit Profile
            </button>
          )}
        </div>

        {editing ? (
          <div className="space-y-3 mt-3">
            <div>
              <input
                className="input"
                placeholder="Name"
                value={fields.name}
                onChange={(e) => setFields((f) => ({ ...f, name: e.target.value }))}
              />
              {errors.name && <p className="text-warning text-xs mt-1 ml-1">{errors.name}</p>}
            </div>
            <div>
              <input
                className="input"
                type="email"
                placeholder="Email"
                value={fields.email}
                onChange={(e) => setFields((f) => ({ ...f, email: e.target.value }))}
              />
              {errors.email && <p className="text-warning text-xs mt-1 ml-1">{errors.email}</p>}
            </div>
            {supabaseEnabled && (
              <div>
                <input
                  className="input"
                  type="password"
                  placeholder="Current password"
                  value={fields.currentPassword}
                  onChange={(e) => setFields((f) => ({ ...f, currentPassword: e.target.value }))}
                  autoComplete="current-password"
                />
                {errors.currentPassword && <p className="text-warning text-xs mt-1 ml-1">{errors.currentPassword}</p>}
                <p className="text-mist text-[11px] mt-1 ml-1">Required to change your email or password.</p>
              </div>
            )}
            <div>
              <input
                className="input"
                type="password"
                placeholder="New password (optional)"
                value={fields.newPassword}
                onChange={(e) => setFields((f) => ({ ...f, newPassword: e.target.value }))}
                autoComplete="new-password"
              />
              {errors.newPassword && <p className="text-warning text-xs mt-1 ml-1">{errors.newPassword}</p>}
            </div>
            <div className="flex gap-2.5 pt-1">
              <button onClick={() => setEditing(false)} className="btn-secondary flex-1 py-2.5 text-sm">
                Cancel
              </button>
              <button onClick={handleSaveChanges} disabled={saving} className="btn-primary flex-1 py-2.5 text-sm">
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        ) : (
          <p className="text-mist text-xs mt-2 ml-10">Manage your name, email and password.</p>
        )}
      </div>

      <ReminderSettings />

      <button
        onClick={() => setShowLogoutDialog(true)}
        className="card p-4 w-full flex items-center justify-between text-left hover:border-warning/30 transition"
      >
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-warning/10 flex items-center justify-center">
            <LogOut className="text-warning" size={15} />
          </div>
          <span className="font-display font-semibold text-warning text-sm">Log Out</span>
        </div>
        <ChevronRight className="text-mist" size={17} />
      </button>

      {showLogoutDialog && (
        <LogoutDialog
          onCancel={() => setShowLogoutDialog(false)}
          onConfirm={() => {
            setShowLogoutDialog(false)
            onLogout()
          }}
        />
      )}
    </div>
  )
}
