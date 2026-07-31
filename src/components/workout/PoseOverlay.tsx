import { useEffect, useRef, type RefObject } from 'react'
import type { Keypoint } from '../../types'

interface Props {
  videoRef: RefObject<HTMLVideoElement>
  keypoints: Keypoint[] | null
}

// MoveNet skeleton connections, used purely to draw the live overlay — the
// frame itself is discarded the instant this draw call finishes.
const SKELETON: [string, string][] = [
  ['left_shoulder', 'right_shoulder'],
  ['left_shoulder', 'left_elbow'],
  ['left_elbow', 'left_wrist'],
  ['right_shoulder', 'right_elbow'],
  ['right_elbow', 'right_wrist'],
  ['left_shoulder', 'left_hip'],
  ['right_shoulder', 'right_hip'],
  ['left_hip', 'right_hip'],
  ['left_hip', 'left_knee'],
  ['left_knee', 'left_ankle'],
  ['right_hip', 'right_knee'],
  ['right_knee', 'right_ankle'],
]

export default function PoseOverlay({ videoRef, keypoints }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    if (keypoints) drawSkeleton(ctx, keypoints)
  }, [keypoints, videoRef])

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full -scale-x-100 pointer-events-none" />
}

function drawSkeleton(ctx: CanvasRenderingContext2D, keypoints: Keypoint[]) {
  const byName = new Map(keypoints.map((k) => [k.name, k]))
  ctx.lineWidth = 3
  ctx.strokeStyle = 'rgba(185, 255, 102, 0.9)'
  for (const [a, b] of SKELETON) {
    const ka = byName.get(a)
    const kb = byName.get(b)
    if (ka && kb && (ka.score ?? 0) > 0.3 && (kb.score ?? 0) > 0.3) {
      ctx.beginPath()
      ctx.moveTo(ka.x, ka.y)
      ctx.lineTo(kb.x, kb.y)
      ctx.stroke()
    }
  }
  ctx.fillStyle = '#B9FF66'
  for (const k of keypoints) {
    if ((k.score ?? 0) > 0.3) {
      ctx.beginPath()
      ctx.arc(k.x, k.y, 4, 0, 2 * Math.PI)
      ctx.fill()
    }
  }
}
