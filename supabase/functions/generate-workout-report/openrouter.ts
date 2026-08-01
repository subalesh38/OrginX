import type { SanitizedSessionStats } from './privacyGuard.ts'
import type { GoalContext, WorkoutReport } from './types.ts'

/**
 * AI report generation via OpenRouter (openai/gpt-oss-20b:free). The API
 * key is read from an env var only available to this server-side function
 * (`OPENROUTER_API_KEY`, set via `supabase secrets set` in production); it
 * is never sent to, or readable by, the frontend.
 *
 * `generateReport` never receives anything except the sanitized stats
 * produced by `privacyGuard.ts` — see that file for the enforcement point.
 */

const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY')
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'
const OPENROUTER_MODEL = 'openai/gpt-oss-20b:free'
const REQUEST_TIMEOUT_MS = 20_000

export async function generateReport(
  current: SanitizedSessionStats,
  prior: SanitizedSessionStats[],
  goal: GoalContext,
): Promise<WorkoutReport> {
  if (!OPENROUTER_API_KEY) {
    console.error('OPENROUTER_API_KEY is not set — serving the rule-based fallback report.')
    return ruleBasedFallback(current, prior, goal)
  }

  try {
    const text = await callOpenRouter(buildPrompt(current, prior, goal))
    const parsed = JSON.parse(text)
    return {
      generatedAt: new Date().toISOString(),
      source: 'ai',
      summary: String(parsed.summary ?? ''),
      formCorrections: Array.isArray(parsed.formCorrections) ? parsed.formCorrections : [],
      progressComparison: Array.isArray(parsed.progressComparison) ? parsed.progressComparison : [],
      nextSessionTips: Array.isArray(parsed.nextSessionTips) ? parsed.nextSessionTips : [],
    }
  } catch (err) {
    // The model/provider being down, slow, rate-limited, or returning
    // malformed output must never block the report entirely — fall back
    // to a stats-only summary.
    console.error('OpenRouter report generation failed, using fallback:', err instanceof Error ? err.message : err)
    return ruleBasedFallback(current, prior, goal)
  }
}

async function callOpenRouter(prompt: string): Promise<string> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    const res = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        // Optional but recommended by OpenRouter for attribution/rankings.
        'HTTP-Referer': 'https://fitright.app',
        'X-Title': 'FitRight',
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        response_format: { type: 'json_object' },
        temperature: 0.4,
        messages: [{ role: 'user', content: prompt }],
      }),
      signal: controller.signal,
    })

    if (!res.ok) throw new Error(`OpenRouter API error ${res.status}: ${await res.text()}`)

    const data = await res.json()
    const text = data.choices?.[0]?.message?.content
    if (!text) throw new Error('OpenRouter returned no content')
    return text
  } finally {
    clearTimeout(timeout)
  }
}

function buildPrompt(current: SanitizedSessionStats, prior: SanitizedSessionStats[], goal: GoalContext): string {
  return `You are a supportive fitness coach reviewing a single workout session's aggregated stats.
You were NOT given any video, image, or raw pose/landmark data — only numbers and rule-violation
counts that were already computed on-device. Never claim to have seen the user's form directly;
refer to it only in terms of the flagBreakdown entries provided.

CURRENT SESSION
${JSON.stringify(current, null, 2)}

RECENT PRIOR SESSIONS (most recent first, up to 7)
${JSON.stringify(prior, null, 2)}

WEEKLY GOAL CONTEXT
${JSON.stringify(goal, null, 2)}

Respond with ONLY a single JSON object (no markdown fences, no other text) with EXACTLY these keys:
{
  "summary": "2-3 sentence overall performance summary for this session",
  "formCorrections": [
    { "exercise": "string", "issue": "string", "occurrence": "string", "suggestion": "string" }
  ],
  "progressComparison": ["short string", "..."],
  "nextSessionTips": ["short string", "..."]
}

Rules:
- formCorrections: one entry per issue that had flagBreakdown occurrences this session. Ground each
  in the specific code/count, e.g. "your knees caved inward on 6 of 12 squats". Omit issues with
  zero occurrences. Use an empty array if flagBreakdown is empty.
- progressComparison: 1-3 short strings comparing this session to the prior sessions (reps, hold
  time, form score trend). If there isn't enough prior data, say so briefly instead of inventing one.
- nextSessionTips: 1-2 specific, actionable suggestions for the next session.
- Keep the tone encouraging but specific. Do not restate the raw JSON back verbatim.`
}

/** Used when OpenRouter is unset, times out, errors, or returns unparseable output. */
function ruleBasedFallback(current: SanitizedSessionStats, prior: SanitizedSessionStats[], goal: GoalContext): WorkoutReport {
  const totalFlags = current.flagBreakdown.reduce((sum, f) => sum + f.count, 0)

  const formCorrections = current.flagBreakdown
    .filter((f) => f.count > 0)
    .map((f) => ({
      exercise: current.exerciseId,
      issue: f.label || f.code,
      occurrence: `${f.count} time${f.count === 1 ? '' : 's'} this session`,
      suggestion: 'Slow down and focus on this cue for a few reps before speeding back up.',
    }))

  const priorAvgScore = prior.length ? Math.round(prior.reduce((sum, p) => sum + p.formScore, 0) / prior.length) : null
  const progressComparison: string[] = []
  if (priorAvgScore !== null) {
    const diff = current.formScore - priorAvgScore
    progressComparison.push(
      diff === 0
        ? `Your posture accuracy (${current.formScore}%) matched your recent average.`
        : `Your posture accuracy (${current.formScore}%) is ${Math.abs(diff)}% ${diff > 0 ? 'above' : 'below'} your recent average of ${priorAvgScore}%.`,
    )
  } else {
    progressComparison.push('Not enough recent sessions yet to compare trends.')
  }
  if (goal.targetSessions > 0) {
    progressComparison.push(`You've completed ${goal.sessionsThisWeek} of ${goal.targetSessions} sessions this week.`)
  }

  const topIssue = [...current.flagBreakdown].sort((a, b) => b.count - a.count)[0]

  return {
    generatedAt: new Date().toISOString(),
    source: 'fallback',
    summary:
      `You completed ${current.setsCompleted}/${current.targetSets} sets of ${current.exerciseId} ` +
      `with a ${current.formScore}% posture accuracy score` +
      (totalFlags ? ` and ${totalFlags} form flag${totalFlags === 1 ? '' : 's'}.` : '.'),
    formCorrections,
    progressComparison,
    nextSessionTips: [
      topIssue
        ? `Focus on "${topIssue.label || topIssue.code}" next session — it was your most common flag.`
        : 'Keep up the clean form and consider increasing reps or sets slightly.',
    ],
  }
}
