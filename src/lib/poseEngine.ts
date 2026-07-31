import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision'
import type { Keypoint } from '../types'

/**
 * Thin wrapper around MediaPipe Tasks Vision PoseLandmarker (BlazePose,
 * "full" variant) — 33 landmarks with x/y/z/visibility, run in VIDEO mode.
 *
 * Everything here runs entirely in the browser tab, on-device via WASM/GPU.
 * No frame, image, or keypoint is ever sent over the network — this module
 * has zero fetch/XHR calls after the one-time WASM + model-file download
 * from Google's CDN on first load (cached by the browser afterward), same
 * as the MoveNet setup this replaces.
 *
 * Landmarks are re-mapped below to the same named `Keypoint[]` shape the
 * old MoveNet output used, so downstream code — `computeMetrics`,
 * `classifyExercise`, the exercise plugins, `PoseOverlay` — is unaffected
 * by this model swap and needed no changes.
 */

const WASM_BASE = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task'

// BlazePose landmark index -> MoveNet-style name (index position in this
// array is the landmark index MediaPipe returns).
const LANDMARK_NAMES = [
  'nose',
  'left_eye_inner',
  'left_eye',
  'left_eye_outer',
  'right_eye_inner',
  'right_eye',
  'right_eye_outer',
  'left_ear',
  'right_ear',
  'mouth_left',
  'mouth_right',
  'left_shoulder',
  'right_shoulder',
  'left_elbow',
  'right_elbow',
  'left_wrist',
  'right_wrist',
  'left_pinky',
  'right_pinky',
  'left_index',
  'right_index',
  'left_thumb',
  'right_thumb',
  'left_hip',
  'right_hip',
  'left_knee',
  'right_knee',
  'left_ankle',
  'right_ankle',
  'left_heel',
  'right_heel',
  'left_foot_index',
  'right_foot_index',
] as const

let landmarker: PoseLandmarker | null = null
let loadingPromise: Promise<PoseLandmarker> | null = null

export async function loadPoseModel(): Promise<PoseLandmarker> {
  if (landmarker) return landmarker
  if (loadingPromise) return loadingPromise

  loadingPromise = (async () => {
    const vision = await FilesetResolver.forVisionTasks(WASM_BASE)
    const baseOptions = { modelAssetPath: MODEL_URL }
    try {
      landmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: { ...baseOptions, delegate: 'GPU' },
        runningMode: 'VIDEO',
        numPoses: 1,
      })
    } catch {
      // GPU delegate isn't supported on every device/browser — fall back
      // to CPU rather than leaving the user stuck on a load error.
      landmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: { ...baseOptions, delegate: 'CPU' },
        runningMode: 'VIDEO',
        numPoses: 1,
      })
    }
    return landmarker
  })()

  return loadingPromise
}

export async function estimatePose(video: HTMLVideoElement): Promise<Keypoint[] | null> {
  if (!landmarker) return null
  const result = landmarker.detectForVideo(video, performance.now())
  const landmarks = result.landmarks[0]
  if (!landmarks) return null
  return landmarks.map((lm, i) => ({
    x: lm.x * video.videoWidth,
    y: lm.y * video.videoHeight,
    score: lm.visibility,
    name: LANDMARK_NAMES[i],
  }))
}

export function disposePoseModel() {
  landmarker?.close()
  landmarker = null
  loadingPromise = null
}

// Kept as string-name constants (not BlazePose indices) so every existing
// consumer keeps working unchanged across this model swap.
export const KP = {
  NOSE: 'nose',
  L_SHOULDER: 'left_shoulder',
  R_SHOULDER: 'right_shoulder',
  L_ELBOW: 'left_elbow',
  R_ELBOW: 'right_elbow',
  L_WRIST: 'left_wrist',
  R_WRIST: 'right_wrist',
  L_HIP: 'left_hip',
  R_HIP: 'right_hip',
  L_KNEE: 'left_knee',
  R_KNEE: 'right_knee',
  L_ANKLE: 'left_ankle',
  R_ANKLE: 'right_ankle',
} as const

export function findKp(keypoints: Keypoint[], name: string): Keypoint | undefined {
  return keypoints.find((k) => k.name === name)
}

// Lowered from 0.3 — Lightning/Thunder confidence on knee/ankle joints
// legitimately dips below that in typical webcam framing, and the old
// threshold was silently dropping too many frames from the rep-counting
// pipeline. BlazePose's `visibility` may run at a different scale than
// MoveNet's `score` did — this is a first-pass number, not re-tuned for
// BlazePose specifically yet.
const MIN_SCORE = 0.25

export function kpVisible(kp: Keypoint | undefined): kp is Keypoint {
  return Boolean(kp && (kp.score ?? 0) >= MIN_SCORE)
}
