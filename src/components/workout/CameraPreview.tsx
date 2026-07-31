import { useEffect, useRef, useState, type RefObject } from 'react'
import { AlertTriangle, Loader2 } from 'lucide-react'
import PoseOverlay from './PoseOverlay'
import type { Keypoint } from '../../types'

export type CameraStatus = 'requesting-camera' | 'loading-model' | 'ready' | 'error'

interface Props {
  videoRef: RefObject<HTMLVideoElement>
  poseReady: boolean
  poseError: string | null
  keypoints: Keypoint[] | null
  isAnalyzing: boolean
  onStatusChange: (status: CameraStatus) => void
  onStreamReady: (stream: MediaStream) => void
}

export default function CameraPreview({
  videoRef,
  poseReady,
  poseError,
  keypoints,
  isAnalyzing,
  onStatusChange,
  onStreamReady,
}: Props) {
  const [cameraReady, setCameraReady] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const streamRef = useRef<MediaStream | null>(null)

  const status: CameraStatus = errorMsg
    ? 'error'
    : !cameraReady
      ? 'requesting-camera'
      : !poseReady
        ? 'loading-model'
        : 'ready'

  useEffect(() => {
    onStatusChange(status)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status])

  useEffect(() => {
    if (poseError) setErrorMsg(poseError)
  }, [poseError])

  useEffect(() => {
    let cancelled = false

    async function setupCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 960 }, height: { ideal: 720 } },
          audio: false,
        })
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play()
        }
        setCameraReady(true)
        onStreamReady(stream)
      } catch (err) {
        if (cancelled) return
        setErrorMsg(
          err instanceof Error && err.name === 'NotAllowedError'
            ? 'Camera permission was denied. Allow camera access to start your session.'
            : 'Could not start the camera on this device.',
        )
      }
    }

    setupCamera()
    return () => {
      cancelled = true
      streamRef.current?.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="relative w-full aspect-[3/4] rounded-xl3 overflow-hidden bg-ink border border-border shadow-soft">
      <video ref={videoRef} className="w-full h-full object-cover -scale-x-100" playsInline muted />
      {status === 'ready' && <PoseOverlay videoRef={videoRef} keypoints={keypoints} />}

      {status !== 'ready' && (
        <div className="absolute inset-0 bg-ink/92 flex flex-col items-center justify-center text-center px-6">
          {status === 'error' ? (
            <>
              <AlertTriangle className="text-warning mb-3" size={28} />
              <p className="text-white font-medium mb-1">Camera unavailable</p>
              <p className="text-white/60 text-sm max-w-[240px]">{errorMsg}</p>
            </>
          ) : (
            <>
              <Loader2 className="animate-spin text-lime mb-3" size={28} />
              <p className="text-white/70 text-sm">
                {status === 'requesting-camera' ? 'Waiting for camera permission…' : 'Loading on-device pose model…'}
              </p>
            </>
          )}
        </div>
      )}

      {status === 'ready' && (
        <div className="absolute top-3.5 left-3.5">
          <span
            className={`chip backdrop-blur-md border ${
              isAnalyzing ? 'bg-lime/20 border-lime/40 text-lime' : 'bg-white/15 border-white/30 text-white'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${isAnalyzing ? 'bg-lime animate-pulse' : 'bg-white/70'}`} />
            {isAnalyzing ? 'Analyzing Posture' : 'Camera Ready'}
          </span>
        </div>
      )}

      {status === 'ready' && (
        <div className="absolute bottom-3.5 right-3.5 chip bg-ink/60 backdrop-blur-md text-white/80 text-[10px]">
          on-device · not recorded
        </div>
      )}
    </div>
  )
}
