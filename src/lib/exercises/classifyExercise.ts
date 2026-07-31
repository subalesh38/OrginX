import type { ExerciseId, Keypoint } from '../../types'
import { KP, findKp, kpVisible } from '../poseEngine'
import { angleAt } from './angles'
import { computeMetrics } from '../exerciseLogic'

/**
 * Rule-based exercise auto-detection — geometry only, no ML/training.
 *
 * Runs entirely on the same in-memory `Keypoint[]` the rep-counting loop
 * already discards every frame; this module never reads storage or the
 * network and produces nothing that gets persisted.
 *
 * Every threshold below is a first-pass estimate, not fit to real capture
 * data. The single biggest source of error: this app assumes a roughly
 * frontal camera (see README's "Known gaps"), but plank/push-up are only
 * cleanly readable from a side-on angle — filmed frontally they mostly
 * collapse toward the vanishing point, which is what `verticalSpreadRatio`
 * below is trying to exploit, but it's the shakiest signal here and the
 * first thing worth tuning against real footage.
 */

export type ExerciseGuess = ExerciseId | 'unknown'

export interface FrameClassification {
  label: ExerciseGuess
  confidence: number // 0..1
}

const STANDING_SPREAD_MIN = 2.5 // |ankleY-shoulderY|/torsoLen above this reads as standing
const GROUND_SPREAD_MAX = 1.5 // ...below this reads as horizontal/ground
const LUNGE_ASYMMETRY_MIN = 35 // deg, knee-angle L/R difference
const SQUAT_ASYMMETRY_MAX = 20
const PUSHUP_ELBOW_MAX = 130 // deg, below this a ground-pose frame reads as push-up-bottom

function avgY(keypoints: Keypoint[], names: string[]): number | undefined {
  const pts = names.map((n) => findKp(keypoints, n)).filter(kpVisible)
  if (!pts.length) return undefined
  return pts.reduce((sum, p) => sum + p.y, 0) / pts.length
}

function sideKneeAngle(keypoints: Keypoint[], side: 'left' | 'right'): number | undefined {
  const hip = findKp(keypoints, side === 'left' ? KP.L_HIP : KP.R_HIP)
  const knee = findKp(keypoints, side === 'left' ? KP.L_KNEE : KP.R_KNEE)
  const ankle = findKp(keypoints, side === 'left' ? KP.L_ANKLE : KP.R_ANKLE)
  if (!kpVisible(hip) || !kpVisible(knee) || !kpVisible(ankle)) return undefined
  return angleAt(hip, knee, ankle)
}

/** Distance of `value` outside the ambiguous [lowBound, highBound] band, as a 0..1 score. */
function margin(value: number, lowBound: number, highBound: number, scale: number): number {
  if (value >= lowBound && value <= highBound) return 0
  const dist = value < lowBound ? lowBound - value : value - highBound
  return clamp01(dist / scale)
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n))
}

/**
 * Single-frame guess. Deliberately conservative near band edges — an
 * ambiguous frame should score low confidence rather than commit to a
 * label. Use `createExerciseDetector` for anything user-facing.
 */
export function classifyFrame(keypoints: Keypoint[]): FrameClassification {
  const shoulderY = avgY(keypoints, [KP.L_SHOULDER, KP.R_SHOULDER])
  const hipY = avgY(keypoints, [KP.L_HIP, KP.R_HIP])
  const ankleY = avgY(keypoints, [KP.L_ANKLE, KP.R_ANKLE])
  if (shoulderY === undefined || hipY === undefined || ankleY === undefined) {
    return { label: 'unknown', confidence: 0 }
  }

  const torsoLen = Math.abs(hipY - shoulderY) || 1
  const verticalSpreadRatio = Math.abs(ankleY - shoulderY) / torsoLen
  const visibleCount = keypoints.filter(kpVisible).length
  const visibilityFactor = Math.min(1, visibleCount / 12) // most checks need ~12 of the 17 points
  const gateMargin = margin(verticalSpreadRatio, GROUND_SPREAD_MAX, STANDING_SPREAD_MIN, 1.5)

  if (verticalSpreadRatio >= STANDING_SPREAD_MIN) {
    // Standing cluster: squat / lunge. Burpee's stand phase looks
    // identical to a squat by this rule set — see module comment; a
    // single frame genuinely can't tell them apart.
    const leftKnee = sideKneeAngle(keypoints, 'left')
    const rightKnee = sideKneeAngle(keypoints, 'right')
    if (leftKnee === undefined || rightKnee === undefined) return { label: 'unknown', confidence: 0 }

    const asymmetry = Math.abs(leftKnee - rightKnee)
    if (asymmetry >= LUNGE_ASYMMETRY_MIN) {
      return { label: 'lunge', confidence: clamp01(gateMargin * margin(asymmetry, 0, LUNGE_ASYMMETRY_MIN, 20) * visibilityFactor) }
    }
    if (asymmetry <= SQUAT_ASYMMETRY_MAX) {
      return {
        label: 'squat',
        confidence: clamp01(gateMargin * margin(asymmetry, SQUAT_ASYMMETRY_MAX, Infinity, 20) * visibilityFactor),
      }
    }
    return { label: 'squat', confidence: clamp01(0.2 * gateMargin * visibilityFactor) }
  }

  if (verticalSpreadRatio <= GROUND_SPREAD_MAX) {
    // Ground cluster: plank / push-up.
    const metrics = computeMetrics(keypoints)
    if (metrics.elbowAngle === undefined) return { label: 'unknown', confidence: 0 }

    if (metrics.elbowAngle < PUSHUP_ELBOW_MAX) {
      return {
        label: 'pushup',
        confidence: clamp01(gateMargin * margin(metrics.elbowAngle, 0, PUSHUP_ELBOW_MAX, 40) * visibilityFactor),
      }
    }
    // Extended arms while horizontal — plank, or push-up top-of-rep. A
    // single frame can't distinguish those; capped confidence, real
    // separation happens via elbow-angle variance in the rolling window.
    return { label: 'plank', confidence: clamp01(0.5 * gateMargin * visibilityFactor) }
  }

  // Between the two bands: transitional (bending down/up) — this is where
  // a real burpee's stand<->plank transition actually lives, which is why
  // burpee detection below leans on oscillation across the window instead.
  return { label: 'unknown', confidence: 0 }
}

export interface DetectionResult {
  label: ExerciseGuess
  confidence: number // 0..1 — voteShare * avgConfidence of the winning label
  windowFilled: boolean
}

const DEFAULT_WINDOW_SIZE = 18 // ~0.6s at 30fps; spec's suggested 15-20 frame range
export const AUTO_SELECT_CONFIDENCE = 0.75

/**
 * Rolling-window classifier: majority vote across the last `windowSize`
 * frames, weighted by each vote's own confidence. `voteShare` is computed
 * against the full window size (not just the non-"unknown" frames), so a
 * mostly-empty or noisy window can't accidentally read as confident.
 */
export function createExerciseDetector(windowSize = DEFAULT_WINDOW_SIZE) {
  const buffer: FrameClassification[] = []

  return {
    push(keypoints: Keypoint[]): DetectionResult {
      buffer.push(classifyFrame(keypoints))
      if (buffer.length > windowSize) buffer.shift()

      const votes = new Map<ExerciseId, { count: number; confidenceSum: number }>()
      for (const f of buffer) {
        if (f.label === 'unknown') continue
        const entry = votes.get(f.label) ?? { count: 0, confidenceSum: 0 }
        entry.count += 1
        entry.confidenceSum += f.confidence
        votes.set(f.label, entry)
      }

      let topLabel: ExerciseGuess = 'unknown'
      let topEntry: { count: number; confidenceSum: number } | undefined
      for (const [label, entry] of votes) {
        if (!topEntry || entry.count > topEntry.count) {
          topLabel = label
          topEntry = entry
        }
      }

      const windowFilled = buffer.length >= windowSize
      if (!topEntry) return { label: 'unknown', confidence: 0, windowFilled }

      const voteShare = topEntry.count / windowSize
      const avgConfidence = topEntry.confidenceSum / topEntry.count
      return { label: topLabel, confidence: clamp01(voteShare * avgConfidence), windowFilled }
    },
    reset() {
      buffer.length = 0
    },
  }
}

export type ExerciseDetector = ReturnType<typeof createExerciseDetector>
