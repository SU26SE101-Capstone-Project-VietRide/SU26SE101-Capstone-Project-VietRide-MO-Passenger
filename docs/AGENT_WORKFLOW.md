# VietRide Passenger — Codex Direct workflow

**Owner:** Codex

**Applies to:** Passenger React Native / Expo repository

**Canonical BE gap tracker:** [`BE-GAPS.md`](../BE-GAPS.md)

## 1. Operating rules

1. Invoke the repo-local `brainstorming` skill first for every non-trivial task and complete its execution brief before editing code.
2. Start from the current request, source code, git status and relevant tests.
3. Use `vercel-react-native-skills` by default for React Native and Expo work. Read its `SKILL.md` and only the rule files relevant to the task.
4. Codex operates directly. Do not create or require secondary-agent handoff/review artifacts or historical session snapshots.
5. Reuse existing implementation and preserve unrelated user changes.
6. Treat the current BE checkout as authoritative when a Mobile task depends on a REST, Socket.IO, auth, fare, route, booking, notification or tracking contract.
7. Keep BE-owned gaps in root `BE-GAPS.md`; do not invent Mobile calculations, endpoints or silent workarounds to mask them.
8. Do not commit, push, reset or rewrite history unless the user explicitly requests it.

## 2. Direct pipeline

```text
request
  -> brainstorming: intent, scope, constraints, risks, approach, validation
  -> inspect current source and git state
  -> select the smallest matching skill set
  -> verify current BE contract when relevant
  -> implement directly
  -> run proportional static/runtime gates
  -> update BE-GAPS.md when evidence changes
  -> report result directly to the user
```

No separate handoff or review document is produced.

## 3. Skill routing

| Work | Default skill | Add only when needed |
|---|---|---|
| Every non-trivial task | `brainstorming` first | Keep it brief for small fixes; share the brief for broad/high-risk work |
| React Native / Expo implementation | `vercel-react-native-skills` | Relevant rule files referenced by that skill |
| UI redesign or visual polish | `vercel-react-native-skills` | One visual skill, preferably repo-local `design-taste-frontend` |
| Large lists / notifications / histories | `vercel-react-native-skills` | List performance rules; use FlashList when the data size warrants it |
| Animation / gesture work | `vercel-react-native-skills` | Reanimated and Gesture Handler rules relevant to the interaction |
| API / React Query / Socket.IO | `vercel-react-native-skills` | Inspect current BE source and existing query/cache conventions |
| Cross-repository contract change | Task-specific coding skill | Inspect BE first, then change only the repos authorized by the user |
| Documentation or artifact task | Matching document skill | Do not load document skills for ordinary code changes |

Do not stack multiple visual styles or duplicate React Native skills. `vercel-react-native-skills` supersedes `react-native-skills` as the Mobile default.

## 4. Scope gates

- **Small bug:** inspect, fix, run targeted checks and report.
- **Single-repo feature:** state a short scope update, implement and verify.
- **Cross-repository or high-risk change:** report current contract and intended repo/file scope before editing.
- **Destructive or production action:** confirm the exact target and act only when explicitly authorized.

Brainstorming is always the first skill, but user approval is required only when a missing product decision would materially change the implementation or expand authorization.

## 5. BE gap workflow

Update root `BE-GAPS.md` only from current contract, OpenAPI, runtime source or wire evidence.

Every active row must include:

- stable ID and priority;
- status and owning system;
- BE tag/commit and source path;
- observed behavior and Mobile impact;
- safe client behavior without fabricating BE authority;
- acceptance evidence required to close the row.

Status vocabulary:

- `BLOCKED_BE`: BE contract or runtime owns the defect.
- `BE_FIXED_PENDING_MOBILE_VERIFY`: BE source contains a fix but Mobile wire/device behavior is not verified.
- `VERIFIED`: current source plus required runtime/device evidence passed.
- `N/A_PASSENGER`: intentionally outside Passenger scope.

If a task finds no new gap, leave `BE-GAPS.md` unchanged and say `BE gaps: none found` in the final report.

## 6. Validation gates

Run checks proportional to the changed surface:

```powershell
npx tsc --noEmit
npm run lint -- --max-warnings=0
npm run check:i18n
npm test -- --runInBand <target>
```

If the npm shim is broken, invoke the matching local executable in `node_modules/.bin` and report the fallback. For UI/native behavior, add Expo export and device/emulator verification when the environment permits it. Never label unrun runtime checks as passed.

## 7. Final report

Return directly to the user with:

- outcome and user-visible behavior;
- changed files;
- validation run and exact result;
- `BE-GAPS.md` changes or `BE gaps: none found`;
- remaining risks such as unrun device, APK, gateway or socket verification.

## Change log

| Date | Change |
|---|---|
| 2026-08-10 | Added repo-local `brainstorming` as the mandatory first skill before implementation skill selection. |
| 2026-08-10 | Adopted Codex Direct, made Vercel React Native guidance the Mobile default and retained `BE-GAPS.md` as the only cross-repository gap tracker. |
