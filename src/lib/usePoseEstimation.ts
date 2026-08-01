import { useEffect, useRef, useState, type RefObject } from 'react'
import { loadPoseModel, estimatePose } from './poseEngine'
import type { Keypoint } from '../types'

export interface UsePoseEstimationResult {
  keypoints: Keypoint[] | null
  isReady: boolean
  error: string | null
}

export function usePoseEstimation(videoRef: RefObject<HTMLVideoElement | null>): UsePoseEstimationResult {
  const [keypoints, setKeypoints] = useState<Keypoint[] | null>(null)
  const [isReady, setIsReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    let cancelled = false

    function loop() {
      rafRef.current = requestAnimationFrame(async () => {
        const video = videoRef.current
        if (video && video.readyState >= 2) {
          const frame = await estimatePose(video)
          if (!cancelled) setKeypoints(frame)
        }
        if (!cancelled) loop()
      })
    }

    loadPoseModel()
      .then(() => {
        if (cancelled) return
        setIsReady(true)
        loop()
      })
      .catch(() => {
        if (!cancelled) setError('Could not load the on-device pose model.')
      })

    return () => {
      cancelled = true
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [videoRef])

  return { keypoints, isReady, error }
}
