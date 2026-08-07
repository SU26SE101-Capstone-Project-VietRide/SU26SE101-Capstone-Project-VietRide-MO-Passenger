# CODEX Code Review Handoff

**Reviewer:** Codex  
**Implementer:** Grok  
**Date:** YYYY-MM-DD  
**Repo:** `…/SU26SE101-Capstone-Project-VietRide-MO-Passenger`  
**Mobile baseline (before):** `<commit>`  
**BE reference (read-only):** `<tag@commit>` if used  

---

## 1. Skills applied

| Skill | Why selected | How applied (concrete) |
|---|---|---|
| brainstorming | … | Design approved / skipped because … |
| vercel-react-native-skills | … | e.g. memo rows, list perf |
| building-native-ui | … | e.g. flex bounds, ScrollView maxHeight |
| native-data-fetching | … | e.g. infinite query keys |

**Skills considered but not used:** …

---

## 2. What to review

| Slice / area | Goal | Status |
|---|---|---|
| … | … | Code complete; static green; device pending |

---

## 3. Safety constraints

- [ ] Mobile-only (or list BE edits if any)
- [ ] No commit/push/reset unless requested
- [ ] No Operator APIs / fake endpoints / parallel clients
- [ ] Payload rules respected
- [ ] docs/superpowers preserved if present

---

## 4. File change map

| File | Change |
|---|---|
| … | … |

---

## 5. Static verification

```text
npx tsc --noEmit                 → PASS|FAIL
npm run lint -- --max-warnings=0 → PASS|FAIL
npm run check:i18n               → PASS|FAIL
```

Device/APK: pending | done (evidence)

---

## 6. BE gaps

- Path: `BE-GAPS.md` | **none**
- Open IDs: …

---

## 7. Review focus (for Codex)

1. …
2. …
3. …

---

## 8. Residual risks / follow-ups

- …

---

## 9. Codex verdict template

```markdown
### Codex review result
- Verdict: APPROVE | APPROVE_WITH_NITS | REQUEST_CHANGES
- Blocking findings:
- Non-blocking nits:
- Security/concurrency notes:
- Recommended next step:
```
