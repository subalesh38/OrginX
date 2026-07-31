import Dexie, { type Table } from 'dexie'
import type { WorkoutSession, WeeklyGoal } from '../types'

/**
 * Local-first storage layer.
 *
 * Privacy note: only derived workout data (reps, duration, form flags,
 * timestamps) is ever written here. Raw camera frames and pose keypoints
 * are processed in-memory only and never touch this table or any other
 * persistence layer. See lib/poseEngine.ts + lib/exerciseLogic.ts.
 *
 * Encryption at rest: browsers don't expose raw disk encryption to IndexedDB,
 * so for the hackathon build this relies on OS-level disk encryption.
 * For a native shell (Capacitor/Expo), swap this module for SQLCipher /
 * Keychain-backed storage per the architecture doc without touching callers.
 */
class FitFormDB extends Dexie {
  sessions!: Table<WorkoutSession, number>
  goals!: Table<WeeklyGoal, number>

  constructor() {
    super('fitright_local_db')
    this.version(1).stores({
      sessions: '++id, exerciseId, startedAt, synced, userId',
      goals: '++id, weekStart',
    })
  }
}

export const db = new FitFormDB()

// Called only from lib/privacy/enforcementPoint.ts — that module is the
// sanctioned write path; don't call this directly from UI or logic code.
export async function saveSession(session: WorkoutSession): Promise<number> {
  return db.sessions.add(session)
}

// Every read below is scoped to `userId` — the local Dexie DB is shared by
// every account that has ever used this browser (guest identities included),
// so an unscoped query would mix one account's history into another's. See
// README "Known gaps" for the incident this fixes.
export async function getRecentSessions(userId: string | null, limit = 20): Promise<WorkoutSession[]> {
  return db.sessions
    .orderBy('startedAt')
    .reverse()
    .filter((s) => (s.userId ?? null) === userId)
    .limit(limit)
    .toArray()
}

export async function getAllSessions(userId: string | null): Promise<WorkoutSession[]> {
  return db.sessions
    .orderBy('startedAt')
    .filter((s) => (s.userId ?? null) === userId)
    .toArray()
}

export async function getUnsyncedSessions(userId: string | null): Promise<WorkoutSession[]> {
  return db.sessions.filter((s) => !s.synced && (s.userId ?? null) === userId).toArray()
}

export async function markSynced(id: number, remoteId?: string): Promise<void> {
  await db.sessions.update(id, remoteId ? { synced: true, remoteId } : { synced: true })
}

export function currentWeekStartISO(): string {
  const now = new Date()
  const day = now.getDay() || 7 // Sunday -> 7
  const monday = new Date(now)
  monday.setDate(now.getDate() - day + 1)
  monday.setHours(0, 0, 0, 0)
  return monday.toISOString().slice(0, 10)
}

export async function getOrCreateWeeklyGoal(
  userId: string | null,
  defaultTargetSessions = 6,
  defaultTargetReps = 300,
): Promise<WeeklyGoal> {
  const weekStart = currentWeekStartISO()
  const existing = await db.goals
    .where('weekStart')
    .equals(weekStart)
    .filter((g) => (g.userId ?? null) === userId)
    .first()
  if (existing) return existing
  const goal: WeeklyGoal = { userId, weekStart, targetSessions: defaultTargetSessions, targetReps: defaultTargetReps }
  const id = await db.goals.add(goal)
  return { ...goal, id }
}

export async function eraseAllLocalData(): Promise<void> {
  await db.sessions.clear()
  await db.goals.clear()
}
