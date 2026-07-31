import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase, supabaseEnabled, syncPendingSessions } from './supabase'
import { persistIdentity, readStoredEmail, readStoredName } from './localAuth'

interface AuthState {
  session: Session | null
  loading: boolean
  guestMode: boolean
  displayName: string
  email: string
  enterGuestMode: () => void
  signOutLocal: () => void
  setIdentity: (name: string, email: string) => void
}

const AuthContext = createContext<AuthState | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [guestMode, setGuestMode] = useState(false)
  const [displayName, setDisplayName] = useState(() => readStoredName() ?? '')
  const [email, setEmail] = useState(() => readStoredEmail() ?? '')

  useEffect(() => {
    if (!supabaseEnabled || !supabase) {
      setLoading(false)
      return
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
      if (data.session?.user) syncPendingSessions(data.session.user.id)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
      if (newSession?.user) syncPendingSessions(newSession.user.id)
    })

    return () => sub.subscription.unsubscribe()
  }, [])

  function setIdentity(name: string, userEmail: string) {
    setDisplayName(name)
    setEmail(userEmail)
    persistIdentity(name, userEmail)
  }

  const value: AuthState = {
    session,
    loading,
    guestMode,
    displayName,
    email,
    enterGuestMode: () => setGuestMode(true),
    signOutLocal: () => setGuestMode(false),
    setIdentity,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
