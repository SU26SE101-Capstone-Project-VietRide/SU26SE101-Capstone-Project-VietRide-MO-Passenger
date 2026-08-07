# Agent workflow — Skills → Implement → Gaps → Codex handoff

**Audience:** Grok (and any coding agent) on VietRide Passenger Mobile  
**Enforced from:** 2026-08-07  
**Related:** `BE-GAPS.md`, `CODEX_REVIEW_HANDOFF.md`, `docs/templates/`

---

## 0. Hard rules

1. **Brainstorming first** for creative work (new UI, features, behavior change). Do not implement until design is approved (or user explicitly says “skip design / just fix X”).
2. **Read skill files before coding** — skim is not enough for matched skills.
3. **Only edit Mobile** unless user explicitly authorizes BE. BE is read-only for contract comparison.
4. **Always write deliverables at end of a non-trivial session:**
   - `BE-GAPS.md` — if any backend support is missing or wrong (**omit only when zero gaps**; say “No BE gaps” in Codex handoff).
   - `CODEX_REVIEW_HANDOFF.md` — always for reviewable code changes.
5. **No commit/push/reset** unless user asks.
6. Preserve untracked work (e.g. `docs/superpowers/`).

---

## 1. Session pipeline (always)

```text
┌─────────────────────────────────────┐
│ 0. Git status + baseline commit     │
└─────────────────┬───────────────────┘
                  ▼
┌─────────────────────────────────────┐
│ 1. BRAINSTORMING skill (gate)       │
│    intent · constraints · design    │
│    → user approval                  │
└─────────────────┬───────────────────┘
                  ▼
┌─────────────────────────────────────┐
│ 2. Skill selection matrix           │
│    map task → 1–N skills            │
│    READ each SKILL.md (+ rules)     │
└─────────────────┬───────────────────┘
                  ▼
┌─────────────────────────────────────┐
│ 3. Implementation                   │
│    checklist from skills            │
│    no parallel APIs / Operator      │
└─────────────────┬───────────────────┘
                  ▼
┌─────────────────────────────────────┐
│ 4. Static gates                     │
│    tsc · lint · i18n (± export)     │
└─────────────────┬───────────────────┘
                  ▼
┌─────────────────────────────────────┐
│ 5. BE-GAPS.md (if any gaps)         │
│ 6. CODEX_REVIEW_HANDOFF.md (always) │
└─────────────────────────────────────┘
```

### Step 1 — Brainstorming

Load: `brainstorming` skill.

- Explore repo context.
- Clarify purpose / constraints / success (questions one at a time when ambiguous).
- 2–3 approaches + recommendation.
- Present design; **wait for approval** on greenfield/feature work.
- Spec path when needed: `docs/superpowers/specs/YYYY-MM-DD-<topic>-design.md`.

**Bypass only if user says:** “chỉ fix bug X / apply plan đã khóa / skip brainstorm”.

### Step 2 — Skill selection

1. Classify task (table below).
2. Pick **required** skills first, then optional.
3. `read_file` each selected `SKILL.md` (and rule files when skill points to them).
4. Write a short **Skill checklist** into the Codex handoff later (what you applied).

### Step 3 — Implement

- Follow skill checklists and existing project patterns.
- Prefer single utilities / existing API clients / React Query keys.
- No N+1, no invented endpoints, no BE edits in Mobile batch.

### Step 4 — Verify

```bash
npx tsc --noEmit
npm run lint -- --max-warnings=0
npm run check:i18n
# when UI/native: npx expo export --platform android (as required)
```

Static alone → tracker `IN_PROGRESS`. Device/APK → `VERIFIED`.

### Step 5–6 — Artifacts

| File | When | Template |
|---|---|---|
| `BE-GAPS.md` | Any BE contract/behavior gap found or still open | `docs/templates/BE-GAPS.template.md` |
| `CODEX_REVIEW_HANDOFF.md` | Any code change session for review | `docs/templates/CODEX_REVIEW_HANDOFF.template.md` |

Update existing `BE-GAPS.md` / handoff in place when continuing the same epic; or date-suffix large epics (`CODEX_REVIEW_HANDOFF_YYYYMMDD.md`).

---

## 2. Skill inventory (installed on this machine)

Paths:

- `~/.grok/skills/`
- `~/.grok/bundled/skills/`
- `~/.agents/skills/` (and `~/.claude/skills/` often mirrors)

### 2.1 Process / meta (use every multi-step session)

| Skill | Use when |
|---|---|
| **brainstorming** | Creative work, features, UI/behavior change |
| **find-skills** | Need skill not in inventory |
| **create-skill** | Author a new skill |
| **create-workflow** | Multi-agent Rhai workflow |
| **design** | Formal design doc + PR plan |
| **execute-plan** | Execute design PR plan |
| **implement** | Bundled implement flow |
| **review** / **code-review** | Code review pass |
| **pr-babysit** | PR CI / restack |
| **writing-guidelines** | Prose/docs audit |

### 2.2 React Native / Expo (Passenger app default)

| Skill | Use when |
|---|---|
| **vercel-react-native-skills** | RN lists, memo, animation, navigation patterns |
| **building-native-ui** | Screens, HIG-ish layout, safe area, scroll |
| **native-data-fetching** | fetch, React Query, cache, offline |
| **expo-router** | File-based routes (if using Expo Router) |
| **expo-ui** | @expo/ui native trees |
| **expo-tailwind-setup** | NativeWind / Tailwind on Expo |
| **expo-dev-client** | Dev client builds |
| **expo-deployment** | EAS store / TestFlight |
| **expo-cicd-workflows** | EAS workflow YAML |
| **expo-api-routes** | API routes + EAS Hosting |
| **expo-module** | Native modules |
| **expo-brownfield** | Embed RN in native host |
| **expo-examples** | Official example patterns |
| **expo-observe** | Metrics / Observe |
| **upgrading-expo** | SDK upgrade |
| **use-dom** / **web-to-native** | Web→native migration |
| **add-app-clip** | iOS App Clip |
| **eas-simulator** | Cloud simulator |
| **eas-update-insights** | OTA health |

### 2.3 UI / UX / visual design

| Skill | Use when |
|---|---|
| **frontend-design** | Distinctive UI direction |
| **ui-ux-pro-max** | Styles, palettes, UX DB |
| **design-taste-frontend** (+ v1) | Anti-slop landing/redesign |
| **high-end-visual-design** | Agency-grade polish |
| **minimalist-ui** | Editorial monochrome |
| **industrial-brutalist-ui** | Data-heavy brutalist |
| **gpt-taste** | GSAP / editorial motion web |
| **image-to-code** / **imagegen-frontend-*** | Design from images |
| **kpi-dashboard-design** | KPI dashboards |
| **web-design-guidelines** | A11y / web UI audit |
| **redesign-existing-projects** | Upgrade existing UI |
| **stitch-design-taste** | Google Stitch DESIGN.md |

### 2.4 Web / Vercel / React web

| Skill | Use when |
|---|---|
| **vercel-react-best-practices** | React/Next performance |
| **vercel-composition-patterns** | Compound components |
| **vercel-react-view-transitions** | View Transition API |
| **vercel-optimize** | Vercel cost/perf |
| **deploy-to-vercel** / **vercel-cli-with-tokens** | Deploy |
| **google-maps-platform** | Maps architecture |

### 2.5 Browser / QA / cloud agents

| Skill | Use when |
|---|---|
| **qa** | Score a site/app in browser |
| **agent-browser** / **browser-use** / **remote-browser** | Browser automation |
| **cloud** / **open-source** / **x402** | Browser Use cloud / OSS / payments |

### 2.6 Docs / media / game / resume

| Skill | Use when |
|---|---|
| **docx** / **pdf** / **pptx** | Office files |
| **imagine** + game-* skills | Image/game assets |
| **resume-claude** / **resume-codex** / **resume-cursor** | Continue other agent sessions |
| **build-with-ai** | Prefer SpaceXAI for LLM features |
| **full-output-enforcement** | No truncated code dumps |
| **shiiman-google-auth-*** | Google OAuth (Claude skills path) |

---

## 3. Task → skill matrix (Passenger Mobile defaults)

| Task type | Required skills | Often add |
|---|---|---|
| New feature / behavior | brainstorming | building-native-ui, vercel-react-native-skills, native-data-fetching |
| UI layout / map / Liquid theme | brainstorming (if redesign), building-native-ui, vercel-react-native-skills | frontend-design or design-taste if visual direction |
| Data / API / React Query | native-data-fetching | — |
| Lists / FlashList / notifications | vercel-react-native-skills | — |
| Maps / tracking map | google-maps-platform (if Maps API), building-native-ui | vercel-react-native-skills |
| Performance | vercel-react-native-skills | vercel-react-best-practices if web |
| BE contract gap analysis | (read-only BE) | write BE-GAPS.md |
| End-of-session review pack | — | CODEX_REVIEW_HANDOFF.md always |
| Deploy | deploy-to-vercel or expo-deployment | — |
| QA site | qa | browser-use |

**Do not load 10 design skills at once.** Pick one primary visual skill + RN skills.

---

## 4. BE-GAPS.md rules

File: **repo root `BE-GAPS.md`** (canonical).  
If an older `BE_GAPS_FOR_MOBILE.md` exists, merge/update into `BE-GAPS.md` and point links.

Every gap row needs:

- ID, Priority, Status (`BLOCKED_BE` default)
- Source of truth (BE path + commit/tag)
- Current behavior, Mobile impact, Required BE behavior
- Security/concurrency, Acceptance evidence
- Mobile capability unblocked

**Do not** invent BE endpoints in Mobile to “close” a gap. Document and degrade safely.

**No gaps:** skip creating empty file; state in Codex handoff: `BE gaps: none`.

---

## 5. CODEX_REVIEW_HANDOFF.md rules

File: **repo root `CODEX_REVIEW_HANDOFF.md`** (overwrite or date for big epics).

Must include:

1. Baseline commits (Mobile / BE if relevant)
2. Skill checklist (which skills read + applied)
3. What changed (user-facing + technical)
4. File map
5. Static gate evidence
6. BE-GAPS pointer (or none)
7. Residual risks / not done (device, APK)
8. Review focus questions for Codex
9. Verdict template for Codex reply

---

## 6. Response format to user (end of session)

```markdown
### Skills used
- brainstorming: …
- vercel-react-native-skills: …
- building-native-ui: …

### Deliverables
- BE-GAPS.md: yes | none
- CODEX_REVIEW_HANDOFF.md: updated

### Gates
- tsc / lint / i18n: …
```

---

## 7. Change log

| Date | Note |
|---|---|
| 2026-08-07 | Initial workflow + skill inventory + mandatory gaps/handoff artifacts |
