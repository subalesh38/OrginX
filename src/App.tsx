import { useState } from 'react'
import { useAuth } from './lib/AuthContext'
import { signOut, syncPendingSessions } from './lib/supabase'
import AuthPage from './components/auth/AuthPage'
import MobileShell from './components/shared/MobileShell'
import BottomNavigation, { type Tab } from './components/nav/BottomNavigation'
import PlanPage from './components/plan/PlanPage'
import WorkoutPage from './components/workout/WorkoutPage'
import ReportPage from './components/report/ReportPage'
import ProfilePage from './components/me/ProfilePage'
import type { ExerciseId } from './types'

export default function App() {
  const { session, loading, guestMode, displayName, email, signOutLocal } = useAuth()
  const [tab, setTab] = useState<Tab>('plan')
  const [exerciseId, setExerciseId] = useState<ExerciseId>('squat')
  const [refreshKey, setRefreshKey] = useState(0)

  const isAuthed = Boolean(session) || guestMode
  // Local/guest mode has no Supabase session, but different local identities
  // (different names/emails typed into the no-backend Login form) must still
  // be kept apart in local storage — a bare `null` would merge every guest
  // identity that's ever used this browser into one shared history.
  const userId = session?.user?.id ?? (guestMode ? `local:${(email || displayName || 'guest').toLowerCase()}` : null)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!isAuthed) return <AuthPage />

  async function handleLogout() {
    await signOut()
    signOutLocal()
    setTab('plan')
  }

  function handleSelectExercise(id: ExerciseId) {
    setExerciseId(id)
    setTab('workout')
  }

  async function handleWorkoutSaved() {
    // A freshly saved session otherwise stays local-only until the next
    // login/auth-state change — sync it immediately so remoteId (needed
    // for AI reports) and cloud sync happen right after a workout, not
    // just opportunistically on next sign-in.
    if (session?.user) await syncPendingSessions(session.user.id)
    setRefreshKey((k) => k + 1)
    setTab('plan')
  }

  return (
    <MobileShell>
      {tab === 'plan' && (
        <PlanPage displayName={displayName} userId={userId} refreshKey={refreshKey} onSelectExercise={handleSelectExercise} />
      )}
      {tab === 'workout' && (
        <WorkoutPage
          exerciseId={exerciseId}
          onChangeExercise={setExerciseId}
          userId={userId}
          onSaved={handleWorkoutSaved}
        />
      )}
      {tab === 'report' && <ReportPage userId={userId} refreshKey={refreshKey} />}
      {tab === 'me' && <ProfilePage onLogout={handleLogout} />}

      <BottomNavigation active={tab} onChange={setTab} />
    </MobileShell>
  )
}
