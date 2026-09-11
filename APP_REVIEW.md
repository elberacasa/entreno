# Entreno: first product review

Reviewed September 11, 2026, at commit `cb43d6573516e0973a243cbb373c1e1d286df360`.

Repository: https://github.com/abrahambenzaquen21-gif/entreno

The repository was cloned into this workspace. This review adds no application changes and publishes nothing. Audience and business model remain open decisions.

## Assessment

Entreno has a useful foundation: a Spanish-language workout logger with reusable routines, a plan generator, exercise demonstrations, scheduling, rest timers, history, and charts. Its dark interface is consistent and the central logging flow works. The opportunity is to connect these features into a clearer experience: know what to do today, record it with little effort, understand the result, and return with an appropriate next target.

The current implementation deserves incremental improvement. A wholesale framework rewrite would not address the main product problems found here.

## What was checked

- Installed dependencies from the lockfile.
- Production web build: **passed**. The generated JavaScript entry bundle is approximately 3 MB before transport compression; this is an artifact size, not a measured load-time result.
- Lint: **passed**.
- TypeScript: **failed** with TS2882 at `src/constants/theme.ts:1`, for the side-effect import of `@/global.css`.
- No project-owned automated test files or test script were found. The deployment workflow builds, but does not run lint, type checking, or tests.
- Dependency installation reported 15 moderate vulnerabilities. This is the package manager's report; exploitability and production impact were not assessed.
- Walked through the local production app at a 390 × 844 browser viewport: first launch, routines, all four questionnaire steps, generated plan, saving one routine, starting a workout, logging a set, rest timer, finishing, history, reload, and progress.
- A sample routine and one sample workout were created only in the local browser preview. The workout remained in history after reloading.

This was a browser walkthrough and source review, not testing on a physical iPhone. Offline cold starts, background timer alerts, operating-system sharing, storage exhaustion, and device migration still need dedicated checks.

## Product opportunities, in order

### 1. Make the first workout easier to reach

The fresh Today screen offers “Entreno vacío” and “Nueva rutina,” followed by zero-valued statistics. The guided questionnaire and ready-made catalog are on the Routines tab. A person who needs guidance must discover the most helpful feature themselves.

Proposed first-use screen: “Find my plan,” “Choose a routine,” and a quieter option to start freely. Show a short plan preview and let the person start the first session directly. After a first workout, replace onboarding with today's relevant action.

### 2. Make the plan generator earn its promise

It asks about equipment, days, time, and goal, but not experience. Its three-day step explicitly advises beginners to use a different full-body routine from the catalog, while continuing to generate a push/pull/legs plan.

Observed example: dumbbells, three days, 60 minutes, muscle goal produced an eight-exercise, 26-set push session. Four exercises were core exercises. It also included an ab wheel despite selecting only dumbbells. The latter is a confirmed equipment-data defect: `src/lib/seed.ts:80` assigns the ab-wheel exercise an empty equipment list.

Proposed changes: collect experience and exercise familiarity; validate equipment metadata; offer substitutions when equipment is unavailable; preview the plan's rationale and weekly organization. Review the generator's tendency to fill available time with additional exercises (`src/lib/recommend.ts:379`). Exact exercise prescriptions need a separate training-content review.

### 3. Reduce typing during every workout

The app displays the previous performance, but new sessions initialize from the routine template (`src/lib/store.tsx:333`, `src/lib/store.tsx:440`). It does not carry forward the last completed workout automatically. Adding an extra set does already copy the preceding set's values, which is worth preserving.

Proposed changes: distinguish planned targets from previous results; prefill sensible last-used values; provide a clear next-set action; make effort tracking optional and explain it; offer an exercise-swap action. Keep access to the whole workout for people who prefer it.

### 4. Explain progress and give the workout an ending

Finishing returns to the previous screen (`src/app/session/[id].tsx:209`). There is no dedicated recap or next-session prompt. Charts emphasize totals and estimated maximum weight, which are not equally useful for all exercise types.

Observed example: after eight unweighted push-ups, Progress displayed “0 kg,” a “>12 reps” explanation for the missing estimate, and a weekly chart caption of “máx 1 kg” despite zero recorded weighted volume. These are misleading explanations of the sample data, not missing workout persistence.

Proposed recap: completed work, comparison with the previous comparable session, meaningful personal records, and the next planned workout. For bodyweight exercises, prioritize repetitions and consistency. Any future progression suggestion should explain its basis and remain editable.

### 5. Make history trustworthy before expanding the product

Local storage and manual backup support a simple account-free app, but changing phones currently requires deliberate export/import. Protecting accumulated history is essential whether or not cloud sync is added.

Start with validated backups, recoverable restoration, visible save status, and a last-backup indicator. Consider optional account sync after deciding whether cross-device use is important to the intended audience. Keep offline logging useful throughout.

## Engineering findings

| Priority | Finding and evidence | Proposed acceptance check |
|---|---|---|
| High | `src/lib/storage.ts:219`: backup parsing only checks two top-level arrays and does not validate nested records, references, app marker, or version. For example, a sessions array containing `null` passes these checks. `src/lib/storage.ts:75` also trusts the shape of parsed stored JSON. | Malformed or unsupported backups are rejected before state changes; legacy supported backups migrate; invalid stored data opens a recovery path without crashing the main screens. |
| High | `src/lib/store.tsx:389`: restore replaces in-memory state, then writes five storage keys independently. A partial failure can leave a mixture of old and new data after reload. | Fault injection at each write leaves one coherent, recoverable dataset. |
| High | `src/lib/store.tsx:240`: failed quarantine writes still clear every blocked key. `replaceAll` also ignores quarantine failures. Original unreadable data can subsequently be overwritten despite the intended protection. | Failed quarantine retains protection until recovery succeeds or the user explicitly chooses loss of that data. |
| High | `src/app/routine/[id].tsx:42`: edits live only in component state with no leave/reload protection. At line 89, Save ignores the persistence result and navigates away. | Back/reload cannot silently lose edits; failed saving leaves a recoverable draft and clear feedback. |
| Medium | `src/app/settings.tsx:318`: bodyweight displays and stores raw kilograms even when the field is labeled pounds. | Enter 180 lb, switch units, and see approximately 81.65 kg; reload preserves the same physical quantity. |
| Medium | `src/app/(tabs)/progress.tsx:160`: strength chart values are formatted in the selected unit but the suffix remains `kg`. At line 196, all unavailable estimates are explained as “>12 reps.” | Labels agree with displayed values; missing weight and high-repetition estimates have accurate, distinct explanations. |
| Medium | `src/components/chart.tsx:173`: the artificial minimum axis maximum of 1 is reused as the reported data maximum. | All-zero data reports zero or an empty state without inventing a maximum. |
| Medium | `src/app/session/[id].tsx:134`: marking a set complete does not validate inputs. The walkthrough successfully marked effort “99” complete. Numeric parsing also permits negative values and fractional repetitions. | Validate by field and exercise type, explain errors inline, and allow legitimate unweighted sets. |
| Medium | `src/lib/stats.ts:103`: equal top weights across sessions retain the earlier record's repetitions even when a later session has more repetitions. | Equal-weight records choose the stronger repetition result. |
| Medium | `public/sw.js:16`: install caches only the HTML shell; assets are cached when subsequently requested. First-load assets can be fetched before the worker controls the page. Navigation responses are cached without checking success at line 51. | Test fresh install → disconnect → relaunch, all essential screens/demos offline, and failed navigation responses. Treat full offline readiness as unverified today. |
| Medium | `public/sw.js:26`: activation deletes every other cache on the origin, rather than only obsolete Entreno caches. | Another app's cache on the same origin remains intact. |

## UI and accessibility findings

Reviewed against [Vercel Web Interface Guidelines](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md). Locations below are source findings; the browser accessibility tree also exposed many actions as generic containers or icon text.

- `src/components/ui.tsx:248` — shared buttons lack default button semantics.
- `src/components/ui.tsx:325` — icon buttons lack required accessible action names at many call sites.
- `src/components/ui.tsx:361` — visible field labels are not programmatically associated with their inputs.
- `src/app/session/[id].tsx:651` — removing a set requires long-pressing its number; no visible ordinary-action alternative or undo.
- `src/app/session/[id].tsx:665` — logging fields need labels including exercise, set, and metric.
- `src/components/exercise-demo.tsx:35` — animation starts automatically without honoring reduced-motion preference; images need useful accessible descriptions.
- `scripts/finish-web-build.mjs:93` — generated viewport restricts zoom with `maximum-scale=1`.

The visual design already has a coherent palette and hierarchy. Improve first-use priorities, muted-text readability, control labels, and the amount of information visible during a set before pursuing cosmetic replacement.

## Suggested first release

1. **Protect the foundation:** backup and storage recovery, reliable saving, units and input validation, type-check fix, and automated checks for these failure paths.
2. **Improve the main journey:** direct plan discovery on Today, equipment correction, last-session values, clearer workout controls, and a completion recap.
3. **Make return visits useful:** weekly plan adherence, meaningful progress by exercise type, substitutions, and transparent next-session targets.

Keep social feeds, subscriptions, broad integrations, and a general AI chat feature outside this first release until there is a clear user need. The next discussion should choose which part of the existing experience matters most, based on this review.

Measure first-workout completion, time/taps required to log a set, return for a second workout, weekly plan completion, and successful recovery after interrupted saves. These are proposed success measures; no analytics were added.
