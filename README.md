# FitRight — AI Form Coach

Real-time rep/set counting and posture correction using on-device AI pose
estimation, wrapped in a premium mobile-first UI (Plan / Workout / Report /
Me). No camera frame ever leaves the browser tab — only derived numbers
(reps, sets, duration, form flags) are stored, locally first, and optionally
synced. Post-workout summaries can optionally be turned into a natural-language
coaching report by an AI model running server-side.

This is a working hackathon-ready base build: camera → pose → rep logic →
local storage → optional cloud sync → reporting, all wired end-to-end.

## Quick start

```bash
npm install
npm run dev
```

Open the printed local URL (`http://localhost:5173`) in Chrome or Safari
on a device with a camera. Grant camera permission when prompted.

**Works fully without any setup** — with no `.env` present, the login screen
runs in local-only mode: fill in the "Login" tab (Name, Gmail, New password,
Confirm password) and submit it once. There's no separate "continue as
guest" button — submitting that form is what puts you straight into the app
with a local identity, and everything runs and saves locally from there.

### Optional: enable Supabase auth + cross-device sync

1. Create a free project at [supabase.com](https://supabase.com).
2. Copy `.env.example` to `.env` and fill in your project URL + anon key
   (Project Settings → API).
3. In the Supabase SQL editor, run the migrations under `supabase/migrations/`
   (creates `workout_summaries` + RLS policies, and — if you also want AI
   reports — the `workout_reports` cache table).
4. Restart `npm run dev`. The login screen will now accept real signup/login,
   and finished sessions will sync to the cloud automatically when online.

Note: sign-up email addresses are currently restricted to
`gmail.com` / `yahoo.com` / `outlook.com` domains (`src/lib/validation.ts`).

### Optional: enable AI post-workout reports

Requires Supabase auth + sync (above) to already be set up.

1. Deploy the Edge Function: `supabase functions deploy generate-workout-report`.
2. Set its AI provider API key as a secret (never bundled into the frontend):
   `supabase secrets set OPENROUTER_API_KEY=...` — uses OpenRouter's
   `openai/gpt-oss-20b:free` model (see
   `supabase/functions/generate-workout-report/.env.example` for local dev).
3. On the Report tab, once a session has synced to the cloud, use "Generate
   AI Report" to request a summary, form corrections, and next-session tips.

If the key isn't set (or the request fails), the function serves a
rule-based fallback report instead of erroring out.

## What's implemented

- **Auth** — glassmorphism Login/Sign Up screen (`src/components/auth/AuthPage.tsx`). The "Login" tab is the
  account-creation form (Name, Gmail, New password, Confirm password); the "Sign Up" tab is the plain sign-in
  form (Gmail, Password) — field naming intentionally follows the product wireframe rather than convention.
  Uses Supabase email/password when configured, otherwise a seamless local-only identity (`src/lib/AuthContext.tsx`,
  `src/lib/localAuth.ts`).
- **Bottom navigation** — Plan / Workout / Report / Me (`src/components/nav/BottomNavigation.tsx`)
- **Camera capture** — `getUserMedia`, sandboxed stream, stopped on exit (`src/components/workout/CameraPreview.tsx`)
- **On-device pose estimation** — an AI body-landmark model, run entirely in-browser via WASM/GPU with no
  frame ever leaving the tab (`src/lib/poseEngine.ts`)
- **Exercise logic** — joint-angle math + a rep-cycle state machine per exercise, plus rule-based form flags (`src/lib/exerciseLogic.ts`)
- **Exercises covered** — squat, push-up, lunge (angle-threshold rep counting), plank (hold-timer via hip-line alignment), burpee (reuses the squat/stand cycle as a placeholder — see below)
- **Sets** — the Workout page derives sets from cumulative reps/hold-time vs each exercise's `targetReps`/`targetSets` (`src/lib/exercises/types.ts`)
- **Privacy enforcement point** — the pose loop draws the skeleton to a canvas and computes metrics, then discards the frame; nothing raw is ever written to `lib/db.ts` or sent to `lib/supabase.ts` (the sanctioned write path is `src/lib/privacy/enforcementPoint.ts`)
- **Local storage** — Dexie (IndexedDB), offline-first source of truth (`src/lib/db.ts`)
- **Cloud sync** — pushes only workout summaries (reps/sets/duration/form-flag breakdown) to Supabase Postgres when online + logged in (`src/lib/supabase.ts`)
- **AI post-workout reports** — an Edge Function (`supabase/functions/generate-workout-report/`) turns a synced
  session's aggregated stats into a summary, form corrections, progress comparison, and next-session tips via an
  AI model, with a rule-based fallback if the model call fails or isn't configured. Only pre-aggregated numbers
  and rule-violation counts are ever sent — never pose or video data (see that folder's `privacyGuard.ts`).
  Currently wired up as a dev-preview on the Report tab (raw JSON response, not yet a polished per-section UI).
- **Report page** — daily/weekly analytics (Recharts), goal cards, smart insights, AI report panel (`src/components/report/ReportPage.tsx`)
- **Me page** — profile editing, reminder settings, logout confirmation (`src/components/me/ProfilePage.tsx`)

## Known gaps to finish before final submission

- **Deployed AI report secret**: the Edge Function is deployed and reachable,
  but every generated report has come back `source: "fallback"` rather than
  `"ai"` — the provider API key exists in the local
  `supabase/functions/.env` (used only by `supabase functions serve`) but
  hasn't been pushed to the deployed function's own secrets. Run
  `supabase secrets set OPENROUTER_API_KEY=...` against the linked project to
  fix; this is a deploy-time action, not something a code change resolves.
- **Burpee** currently reuses the knee-angle squat/stand cycle rather than
  a true multi-phase (stand → plank → push-up → jump) state machine —
  the state machine shape in `exerciseLogic.ts` (`updateRepCounter`) is
  built to extend; add a `burpeePhase` enum with its own thresholds.
- **Single-person, roughly-frontal camera angle** assumed. Side-on angle
  robustness (e.g. squat depth from a profile view) needs threshold tuning.
- **AI post-workout report UI** is wiring-only — it renders the Edge
  Function's raw JSON response rather than styled summary/correction/tip
  cards (`src/components/report/ReportPage.tsx`).
- **Encryption at rest**: on web, this relies on OS-level disk encryption
  since IndexedDB has no native encryption hook. If you wrap this in
  Capacitor/Expo for a native build, swap `src/lib/db.ts` for
  SQLCipher / Keychain-backed storage — the rest of the app is unaffected
  since everything calls the same `saveSession`/`getAllSessions` functions.
- **Weekly goal targets** are currently fixed defaults (6 sessions / 300
  reps) — add a small settings screen to let users edit them.
- **Reminder settings** are stored locally (`localStorage`) and don't yet
  trigger an actual notification — add a scheduling/notification backend.
- No automated tests yet (Jest + React Testing Library recommended for
  `exerciseLogic.ts`'s angle math and rep state machine, since that's the
  most demo-breaking failure point).

## Tech stack

React + TypeScript + Vite · Tailwind CSS · On-device AI pose estimation
(WASM/GPU, in-browser) · Dexie.js · Supabase (Auth + Postgres + Edge
Functions) · Recharts · Server-side AI for post-workout report generation

## Project structure

```
src/
  components/
    auth/       AuthPage, LoginForm, SignupForm
    nav/        BottomNavigation
    plan/       PlanPage, ProfileHeader, WeeklyCalendar, TodayChallengeCard, ExerciseCard, GoalProgressCard
    workout/    WorkoutPage, CameraPreview, PoseOverlay, RepCounter, SetCounter, PostureFeedbackCard, WorkoutSummaryModal
    report/     ReportPage, DailyAnalytics, WeeklyAnalytics, GoalCard
    me/         ProfilePage, ReminderSettings, LogoutDialog
    shared/     MobileShell, Avatar, ProgressRing
  lib/
    poseEngine.ts       on-device AI pose-estimation wrapper
    exerciseLogic.ts    joint-angle math + rep-cycle state machine + form rules
    exercises/          per-exercise plugins (thresholds, targets, tips) + registry
    privacy/            enforcementPoint.ts — the only sanctioned write path into local storage
    db.ts               Dexie local storage (offline-first source of truth)
    supabase.ts         auth + cloud sync (summaries only) + AI report fetch
    localAuth.ts        local-account bookkeeping for guest/no-backend mode
    AuthContext.tsx     session/guest-mode/display-name state
    validation.ts       input validation (e.g. allowed sign-up email domains)
    reportUtils.ts      report-page date/aggregate helpers
    constants.ts        shared defaults (targets, storage keys)
  types/                shared TypeScript types
supabase/
  migrations/           SQL schema + RLS policies (workout_summaries, workout_reports)
  functions/
    generate-workout-report/   Edge Function: aggregated stats -> AI-generated report, with a
                                privacy-guard boundary and a rule-based fallback
```
