import type { WorkoutSession } from '../../types'
import { saveSession } from '../db'

/**
 * ============================================================================
 * SECURITY / PRIVACY BOUNDARY — read before editing.
 *
 * This is the ONLY code path allowed to write a workout record to storage.
 * `db.saveSession` must never be called directly from anywhere else in the
 * app (UI components, pose engine, exercise logic) — route through
 * `commitSessionSummary` instead.
 *
 * `commitSessionSummary`'s parameter type is `WorkoutSession`
 * (`src/types/index.ts`): reps, duration, form flags, timestamps — no
 * image/video/blob field exists on that type, so an object carrying a raw
 * camera frame cannot be passed here without failing to compile when
 * constructed as an object literal. (TypeScript's excess-property check
 * only fires on literals, not on values already widened through a loosely
 * typed variable — the discipline of never introducing an `any`/`unknown`
 * hop between the pose loop and this function is what keeps that gap closed
 * in practice, same as everywhere else in this codebase.)
 *
 * PRs that touch this file should get extra review scrutiny.
 * ============================================================================
 */
export async function commitSessionSummary(summary: WorkoutSession): Promise<number> {
  return saveSession(summary)
}
