import { useState } from 'react'
import { Activity } from 'lucide-react'
import { signIn, signUp, supabaseEnabled } from '../../lib/supabase'
import { useAuth } from '../../lib/AuthContext'
import { isValidEmail } from '../../lib/validation'
import { lookupLocalAccountName, nameFromEmail, rememberLocalAccount } from '../../lib/localAuth'
import { isEmailRateLimitError, startCooldown, useSignupCooldown } from '../../lib/emailCooldown'
import LoginForm, { type LoginFields } from './LoginForm'
import SignupForm, { type SignupFields } from './SignupForm'

type TabKey = 'login' | 'signup'

export default function AuthPage() {
  const { enterGuestMode, setIdentity } = useAuth()
  const [tab, setTab] = useState<TabKey>('login')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  const [loginFields, setLoginFields] = useState<LoginFields>({
    name: '',
    email: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [loginErrors, setLoginErrors] = useState<Partial<Record<keyof LoginFields, string>>>({})

  const [signupFields, setSignupFields] = useState<SignupFields>({ email: '', password: '' })
  const [signupErrors, setSignupErrors] = useState<Partial<Record<keyof SignupFields, string>>>({})

  const signupCooldownSec = useSignupCooldown(loginFields.email)

  function switchTab(next: TabKey) {
    setTab(next)
    setNotice(null)
    setFormError(null)
  }

  async function handleLoginSubmit() {
    if (signupCooldownSec > 0) return

    const errors: Partial<Record<keyof LoginFields, string>> = {}
    if (!loginFields.name.trim()) errors.name = 'Enter your name'
    if (!loginFields.email.trim()) errors.email = 'Enter your Gmail'
    else if (!isValidEmail(loginFields.email)) errors.email = 'Enter a valid email address'
    if (!loginFields.newPassword) errors.newPassword = 'Enter a password'
    else if (loginFields.newPassword.length < 6) errors.newPassword = 'At least 6 characters'
    if (!loginFields.confirmPassword) errors.confirmPassword = 'Confirm your password'
    else if (loginFields.newPassword && loginFields.confirmPassword !== loginFields.newPassword) {
      errors.confirmPassword = 'Passwords do not match'
    }
    setLoginErrors(errors)
    if (Object.keys(errors).length) return

    setFormError(null)
    setBusy(true)
    try {
      const { name, email, newPassword } = loginFields
      if (supabaseEnabled) {
        const { data, error } = await signUp(email, newPassword, name)
        // Start the cooldown as soon as the request reaches Supabase —
        // on success (confirmation email sent) and on error alike (a
        // rate-limit error means Supabase is already refusing to send;
        // an immediate retry would just trip it again).
        startCooldown(email)
        if (error) throw error
        rememberLocalAccount(email, name)
        if (data.session) {
          setIdentity(name, email)
        } else {
          setNotice('Account created — check your email to confirm, then log in from the Sign Up tab.')
          setSignupFields({ email, password: '' })
          switchTab('signup')
        }
      } else {
        rememberLocalAccount(email, name)
        setIdentity(name, email)
        enterGuestMode()
      }
    } catch (err) {
      if (isEmailRateLimitError(err)) {
        setFormError('Too many attempts — please wait a few minutes before trying again.')
      } else {
        setFormError(err instanceof Error ? err.message : 'Something went wrong')
      }
    } finally {
      setBusy(false)
    }
  }

  async function handleSignupSubmit() {
    const errors: Partial<Record<keyof SignupFields, string>> = {}
    if (!signupFields.email.trim()) errors.email = 'Enter your Gmail'
    else if (!isValidEmail(signupFields.email)) errors.email = 'Enter a valid email address'
    if (!signupFields.password) errors.password = 'Enter your password'
    setSignupErrors(errors)
    if (Object.keys(errors).length) return

    setFormError(null)
    setBusy(true)
    try {
      const { email, password } = signupFields
      if (supabaseEnabled) {
        const { data, error } = await signIn(email, password)
        if (error) throw error
        const name =
          (data.user?.user_metadata?.name as string | undefined) ?? lookupLocalAccountName(email) ?? nameFromEmail(email)
        setIdentity(name, email)
      } else {
        const name = lookupLocalAccountName(email) ?? nameFromEmail(email)
        setIdentity(name, email)
        enterGuestMode()
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center px-5 py-10 bg-auth-gradient relative overflow-hidden">
      <div className="absolute -top-24 -left-16 w-72 h-72 rounded-full bg-white/10 blur-3xl" />
      <div className="absolute bottom-0 -right-10 w-80 h-80 rounded-full bg-white/10 blur-3xl" />

      <div className="w-full max-w-sm relative animate-slide-up">
        <div className="flex items-center gap-2.5 mb-8 justify-center">
          <div className="w-11 h-11 rounded-2xl bg-white/25 backdrop-blur-md border border-white/40 flex items-center justify-center">
            <Activity className="text-white" size={22} strokeWidth={2.5} />
          </div>
          <span className="font-display font-bold text-2xl tracking-tight text-white">FitRight</span>
        </div>

        <div className="glass-card p-6 sm:p-7">
          <h1 className="font-display text-2xl font-semibold mb-1 text-ink">
            {tab === 'login' ? 'Create your account' : 'Welcome back'}
          </h1>
          <p className="text-mist text-sm mb-5">
            {tab === 'login' ? 'Set up FitRight to start tracking real reps.' : 'Sign in to continue your streak.'}
          </p>

          <div className="relative flex bg-surface2 rounded-2xl p-1 mb-5">
            <div
              className="absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-xl bg-white shadow-card transition-transform duration-300 ease-out"
              style={{ transform: tab === 'login' ? 'translateX(0%)' : 'translateX(calc(100% + 8px))' }}
            />
            <button className="tab-pill relative z-10" onClick={() => switchTab('login')}>
              <span className={tab === 'login' ? 'text-primary' : 'text-mist'}>Login</span>
            </button>
            <button className="tab-pill relative z-10" onClick={() => switchTab('signup')}>
              <span className={tab === 'signup' ? 'text-primary' : 'text-mist'}>Sign Up</span>
            </button>
          </div>

          {notice && (
            <div className="mb-4 rounded-xl border border-success/30 bg-success/10 px-3 py-2 text-xs text-success">
              {notice}
            </div>
          )}
          {formError && (
            <div className="mb-4 rounded-xl border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning">
              {formError}
            </div>
          )}

          {tab === 'login' ? (
            <LoginForm
              fields={loginFields}
              onChange={setLoginFields}
              onSubmit={handleLoginSubmit}
              busy={busy}
              fieldErrors={loginErrors}
              cooldownSec={signupCooldownSec}
            />
          ) : (
            <SignupForm
              fields={signupFields}
              onChange={setSignupFields}
              onSubmit={handleSignupSubmit}
              busy={busy}
              fieldErrors={signupErrors}
            />
          )}

          <button
            className="text-mist text-sm mt-4 w-full text-center hover:text-ink transition"
            onClick={() => switchTab(tab === 'login' ? 'signup' : 'login')}
          >
            {tab === 'login' ? 'Already have an account? Sign Up' : "Don't have an account? Login"}
          </button>
        </div>

        <p className="text-white/80 text-xs mt-5 text-center">
          Your camera never leaves this device — only workout summaries are saved.
        </p>
      </div>
    </div>
  )
}
