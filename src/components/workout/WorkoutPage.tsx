import { useEffect, useMemo, useRef, useState } from 'react'
import { Eye, Pause, Play, Sparkles } from 'lucide-react'
import CameraPreview, { type CameraStatus } from './CameraPreview'
import RepCounter from './RepCounter'
import SetCounter from './SetCounter'
import PostureFeedbackCard from './PostureFeedbackCard'
import WorkoutSummaryModal from './WorkoutSummaryModal'
import { usePoseEstimation } from '../../lib/usePoseEstimation'
import { computeMetrics, initRepState, advanceRepState, formScoreFromFlags, type RepCounterState } from '../../lib/exerciseLogic'
import { commitSessionSummary } from '../../lib/privacy/enforcementPoint'
import { EXERCISES, getExercise } from '../../lib/exercises/registry'
import { createExerciseDetector, AUTO_SELECT_CONFIDENCE, type DetectionResult } from '../../lib/exercises/classifyExercise'
import { EXERCISE_ICONS } from '../../lib/exerciseIcons'
import { MOTIVATIONAL_MESSAGES } from '../../lib/constants'
import type { ExerciseId, FormFlag, WorkoutSession as WorkoutSessionType } from '../../types'

interface Props {
  exerciseId: ExerciseId
  onChangeExercise: (id: ExerciseId) => void
  userId: string | null
  onSaved: () => void
}

type WorkoutState = 'idle' | 'active' | 'paused' | 'summary'

const DEFAULT_FEEDBACK = { isGood: true, message: 'Your posture is correct. Keep going!' }

export default function WorkoutPage({ exerciseId, onChangeExercise, userId, onSaved }: Props) {
  const exercise = getExercise(exerciseId)
  const Icon = EXERCISE_ICONS[exercise.id]

  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const repStateRef = useRef<RepCounterState>(initRepState())
  const flagsRef = useRef<FormFlag[]>([])
  const startedAtRef = useRef<number>(0)
  const detectorRef = useRef(createExerciseDetector())
  const autoSelectedForRef = useRef<ExerciseId | null>(null)

  const [cameraStatus, setCameraStatus] = useState<CameraStatus>('requesting-camera')
  const [workoutState, setWorkoutState] = useState<WorkoutState>('idle')
  const [progress, setProgress] = useState(0)
  const [elapsedSec, setElapsedSec] = useState(0)
  const [feedback, setFeedback] = useState(DEFAULT_FEEDBACK)
  const [pendingSession, setPendingSession] = useState<WorkoutSessionType | null>(null)
  const [saving, setSaving] = useState(false)
  const [detected, setDetected] = useState<DetectionResult | null>(null)

  const { keypoints, isReady: poseReady, error: poseError } = usePoseEstimation(videoRef)

  // Reset session state whenever the selected exercise changes.
  useEffect(() => {
    repStateRef.current = initRepState()
    flagsRef.current = []
    setProgress(0)
    setElapsedSec(0)
    setFeedback(DEFAULT_FEEDBACK)
    setWorkoutState('idle')
    detectorRef.current.reset()
    autoSelectedForRef.current = null
    setDetected(null)
  }, [exerciseId])

  // Rule-based exercise auto-detection, only while waiting to start — never
  // during an active/paused set. Runs on the same in-memory keypoints the
  // rep-counting effect below uses; nothing here is stored or sent anywhere.
  useEffect(() => {
    if (workoutState !== 'idle' || cameraStatus !== 'ready' || !keypoints) return

    const result = detectorRef.current.push(keypoints)
    setDetected(result)

    if (
      result.windowFilled &&
      result.label !== 'unknown' &&
      result.confidence >= AUTO_SELECT_CONFIDENCE &&
      result.label !== exerciseId &&
      autoSelectedForRef.current !== result.label
    ) {
      autoSelectedForRef.current = result.label
      onChangeExercise(result.label)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keypoints, workoutState, cameraStatus])

  // Active-only ticking clock so paused time never counts toward duration.
  useEffect(() => {
    if (workoutState !== 'active') return
    const id = window.setInterval(() => setElapsedSec((s) => s + 1), 1000)
    return () => window.clearInterval(id)
  }, [workoutState])

  // Runs once per pose frame while actively analyzing: advance the rep-cycle
  // state machine, then discard the frame's keypoints immediately after.
  useEffect(() => {
    if (workoutState !== 'active' || cameraStatus !== 'ready' || !keypoints) return

    const metrics = computeMetrics(keypoints)
    const nowMs = Date.now()
    const result = advanceRepState(exerciseId, metrics, repStateRef.current, nowMs)
    repStateRef.current = result.state

    const newProgress = exercise.isHold ? Math.floor(result.state.holdTotalMs / 1000) : result.state.reps
    setProgress(newProgress)

    const warnings = result.newFlags.filter((f) => f.severity === 'warning')
    if (result.newFlags.length) flagsRef.current = [...flagsRef.current, ...result.newFlags].slice(-50)
    if (warnings.length) {
      const msg = warnings[warnings.length - 1].message
      setFeedback({ isGood: false, message: msg })
      window.setTimeout(() => {
        setFeedback((cur) => (cur.message === msg ? DEFAULT_FEEDBACK : cur))
      }, 4000)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keypoints])

  const setsCompleted = Math.min(exercise.targetSets, Math.floor(progress / exercise.targetReps))
  const repsInSet =
    setsCompleted >= exercise.targetSets ? exercise.targetReps : Math.max(0, progress - setsCompleted * exercise.targetReps)

  const motivation = useMemo(
    () => MOTIVATIONAL_MESSAGES[Math.floor(Math.random() * MOTIVATIONAL_MESSAGES.length)],
    [pendingSession],
  )

  function handleStart() {
    if (cameraStatus !== 'ready') return
    if (startedAtRef.current === 0) startedAtRef.current = Date.now()
    setWorkoutState('active')
  }

  function handlePauseResume() {
    setWorkoutState((cur) => (cur === 'active' ? 'paused' : 'active'))
  }

  function handleFinish() {
    const durationSec = Math.max(1, elapsedSec)
    const session: WorkoutSessionType = {
      exerciseId,
      startedAt: startedAtRef.current || Date.now() - durationSec * 1000,
      endedAt: Date.now(),
      durationSec,
      reps: progress,
      setsCompleted,
      targetReps: exercise.targetReps,
      targetSets: exercise.targetSets,
      formFlags: flagsRef.current,
      formScore: formScoreFromFlags(flagsRef.current.length, durationSec, progress),
      synced: false,
      userId,
    }
    setPendingSession(session)
    setWorkoutState('summary')
  }

  async function handleSave() {
    if (!pendingSession) return
    setSaving(true)
    await commitSessionSummary(pendingSession)
    setSaving(false)
    startedAtRef.current = 0
    setPendingSession(null)
    onSaved()
  }

  function handleDismissSummary() {
    startedAtRef.current = 0
    repStateRef.current = initRepState()
    flagsRef.current = []
    setProgress(0)
    setElapsedSec(0)
    setPendingSession(null)
    setWorkoutState('idle')
  }

  const isAnalyzing = workoutState === 'active'
  const isRunning = workoutState === 'active' || workoutState === 'paused'

  return (
    <div className="flex-1 overflow-y-auto px-5 pt-6 pb-6 space-y-4 relative">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Icon className="text-primary" size={18} />
          </div>
          <div className="min-w-0">
            <h1 className="font-display font-semibold text-ink text-lg leading-tight truncate">{exercise.label}</h1>
            {isRunning && <span className="odometer text-mist text-xs">{formatTime(elapsedSec)}</span>}
          </div>
        </div>

        {!isRunning ? (
          <button onClick={handleStart} disabled={cameraStatus !== 'ready'} className="btn-primary py-2.5 px-4 text-sm flex items-center gap-1.5">
            <Play size={15} fill="currentColor" /> Start Workout
          </button>
        ) : (
          <button onClick={handlePauseResume} className="btn-secondary py-2.5 px-4 text-sm flex items-center gap-1.5">
            {workoutState === 'active' ? (
              <>
                <Pause size={15} /> Pause
              </>
            ) : (
              <>
                <Play size={15} fill="currentColor" /> Resume
              </>
            )}
          </button>
        )}
      </div>

      {workoutState === 'idle' && detected && detected.label !== 'unknown' && detected.confidence >= 0.3 && (
        <div
          className={`card p-3 flex items-center gap-2 text-xs ${
            detected.confidence >= AUTO_SELECT_CONFIDENCE ? 'border-lime/40 bg-lime/5' : ''
          }`}
        >
          <Sparkles size={15} className={detected.confidence >= AUTO_SELECT_CONFIDENCE ? 'text-lime' : 'text-mist'} />
          <span className="text-mist">
            {detected.confidence >= AUTO_SELECT_CONFIDENCE ? (
              <>
                Detected: <span className="text-ink font-medium">{getExercise(detected.label).label}</span> (
                {Math.round(detected.confidence * 100)}%)
              </>
            ) : (
              <>
                Looks like <span className="text-ink font-medium">{getExercise(detected.label).label}</span> — keep going
                ({Math.round(detected.confidence * 100)}%)
              </>
            )}
          </span>
        </div>
      )}

      {workoutState === 'idle' && (
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {EXERCISES.map((ex) => {
            const ExIcon = EXERCISE_ICONS[ex.id]
            const active = ex.id === exerciseId
            return (
              <button
                key={ex.id}
                onClick={() => onChangeExercise(ex.id)}
                className={`shrink-0 flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-medium border transition ${
                  active ? 'bg-primary text-white border-primary' : 'bg-surface text-mist border-border'
                }`}
              >
                <ExIcon size={13} /> {ex.label}
              </button>
            )
          })}
        </div>
      )}

      {workoutState === 'idle' && (
        <div className="card p-4 flex items-center justify-between">
          <div>
            <p className="text-mist text-xs">Target</p>
            <p className="font-display font-semibold text-ink text-sm">
              {exercise.targetSets} sets × {exercise.isHold ? `${exercise.targetReps}s hold` : `${exercise.targetReps} reps`}
            </p>
          </div>
          <p className="text-mist text-xs max-w-[45%] text-right">{exercise.description}</p>
        </div>
      )}

      <CameraPreview
        videoRef={videoRef}
        poseReady={poseReady}
        poseError={poseError}
        keypoints={keypoints}
        isAnalyzing={isAnalyzing}
        onStatusChange={setCameraStatus}
        onStreamReady={(s) => (streamRef.current = s)}
      />

      <div className="grid grid-cols-2 gap-3">
        <RepCounter value={exercise.isHold ? progress : repsInSet} target={exercise.targetReps} isHold={exercise.isHold} />
        <SetCounter value={setsCompleted} target={exercise.targetSets} />
      </div>

      {isRunning ? (
        progress === 0 ? (
          <div className="card p-4 flex items-start gap-3">
            <div className="w-9 h-9 rounded-full bg-info/15 flex items-center justify-center shrink-0">
              <Eye className="text-info" size={20} />
            </div>
            <div>
              <p className="font-display font-semibold text-ink text-sm">Analyzing your movement…</p>
              <p className="text-mist text-xs mt-0.5">
                Make sure your full body is visible and complete a full rep — we'll confirm your form once we see one.
              </p>
            </div>
          </div>
        ) : (
          <PostureFeedbackCard isGood={feedback.isGood} message={feedback.message} tips={exercise.tips} />
        )
      ) : (
        <div className="card p-4 text-center text-mist text-xs">
          Press <span className="text-ink font-medium">Start Workout</span> to begin real-time posture analysis.
        </div>
      )}

      {isRunning && (
        <button onClick={handleFinish} className="btn-secondary w-full border-warning/30 text-warning">
          Finish Workout
        </button>
      )}

      {workoutState === 'summary' && pendingSession && (
        <WorkoutSummaryModal
          session={pendingSession}
          motivation={motivation}
          onSave={handleSave}
          onDismiss={handleDismissSummary}
          saving={saving}
        />
      )}
    </div>
  )
}

function formatTime(totalSec: number): string {
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}
