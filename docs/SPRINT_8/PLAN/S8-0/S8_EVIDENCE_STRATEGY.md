# Sprint 8 Evidence Strategy — Co-worker / Negative Path Simulation

| Field | Value |
|-------|-------|
| System | HUB IT BOQ V3 |
| Sprint | 8-0 — Planning only |
| Branch | `s7b-sprint-7-closure` |
| Generated | 2026-06-12 |
| Parent plan | [S8_SIMULATION_PLAN.md](S8_SIMULATION_PLAN.md) |
| Sprint 7 reference | [SPRINT_7_EVIDENCE_INDEX.md](../../SPRINT_7B/CLOSURE/SPRINT_7_EVIDENCE_INDEX.md) |
| Principle | **No Evidence = Not Done** · **No cross-SIM contamination** |

---

## 1. Purpose

Define the evidence pattern for Sprint 8 co-worker and negative path simulations. Reuse Sprint 7B E1–E9 structure where applicable, with mandatory adaptations for human-action narrative and false PASS detection.

**S8-0 produces no official evidence artifacts.**

---

## 2. Evidence Namespace

| Element | Convention |
|---------|------------|
| Root | `docs/SPRINT_8/evidence/SIM-CW-XXX/` (created at execution only) |
| Scenario ID | `SIM-CW-001` through `SIM-CW-012` per candidate matrix |
| BOQ Version ID | **Unique per scenario** — never reuse Sprint 7 SIM-001..008 IDs |
| Execution reports | `docs/SPRINT_8/EXECUTION_REPORT/SIM-CW-XXX.md` |
| PRE_GATE / diagnostic | Isolated namespace; **not official evidence** |

---

## 3. Artifact Definitions (E1–E9)

### E1 — Seed / Starting State

| Field | S8 Requirement |
|-------|----------------|
| Purpose | Document initial BOQ Version ID, persona starting context, seed payload |
| Source | Fresh seed per SIM-CW; no Sprint 7 evidence reuse |
| Co-worker addition | Record which persona created/edited initial state |
| Filename | `E1-seed-payload.json` |

### E2 — Validation Snapshot

| Field | S8 Requirement |
|-------|----------------|
| Purpose | Validation result **after each material persona action** |
| Key fields | `validation_status`, block/warning codes, timestamp |
| Co-worker addition | Action that triggered validation (e.g., Engineer save, post-modify refresh) |
| False PASS check | E2 must reflect current data, not stale cache |
| Filename | `E2-validation-snapshot.json` |

### E3 — Workflow State

| Field | S8 Requirement |
|-------|----------------|
| Purpose | Workflow stage, lock status, approval history after action sequence |
| Co-worker addition | Ordered action log with persona attribution |
| Filename | `E3-workflow-state.json` |

### E4 — Action Attempt / Approval Evidence

| Field | S8 Requirement |
|-------|----------------|
| Purpose | Every approve/reject attempt including **failed** attempts |
| Sprint 7 pattern | Negative evidence for blocked paths |
| Co-worker addition | Persona, HTTP status, error code, attempt number (for duplicates/retries) |
| M-03 note | Rejections may not appear in `audit_logs` — capture here and note in E9 |
| Filename | `E4-approval-gates.json` (or `E4-action-attempts.json` if broader than approval) |

### E5 — Handoff or Blocked Handoff Evidence

| Field | S8 Requirement |
|-------|----------------|
| Purpose | Handoff attempt outcome; 0 records when blocked |
| TD-7B-003 | Document handoff block vs readiness/export state at attempt time |
| Filename | `E5-handoff-record.json` |

### E6 — Readiness State

| Field | S8 Requirement |
|-------|----------------|
| Purpose | Ready / Warning / Blocked tier after action sequence |
| Co-worker addition | Tier must align with E2 unresolved BLOCK count |
| False PASS check | Blocked tier cannot coexist with Ready when BLOCK unresolved |
| Filename | `E6-readiness-status.json` |

### E7 — Export / Blocked Export / Report Evidence

| Field | S8 Requirement |
|-------|----------------|
| Purpose | Export attempt outcome, artifact metadata, or block response |
| Negative path | 400 `EXPORT_BLOCKED` when validation BLOCK active |
| TD-7B-003 | If export allowed while handoff blocked, document explicitly — not silent PASS |
| Filename | `E7-export-result/metadata.json` (+ artifacts if success) |

### E8 — Audit Trail

| Field | S8 Requirement |
|-------|----------------|
| Purpose | `audit_logs` rows for scenario BOQ Version ID |
| M-03 gap | Compare E8 row count vs E4 rejection count; document mismatch in E9 |
| Filename | `E8-audit-trail.json` |

### E9 — Execution Note / Human Action Narrative

| Field | S8 Requirement |
|-------|----------------|
| Purpose | **Primary co-worker simulation artifact** — human-readable proof |
| Format | Markdown |
| Filename | `E9-execution-note.md` |

#### E9 Required Sections (Co-worker Simulation)

```markdown
## Scenario
SIM-CW-XXX — [theme title]

## Persona Sequence
| Step | Persona | Action Attempted | Expected Result | Observed Result | Pass? |
|------|---------|------------------|-----------------|-----------------|-------|

## False PASS Check
- [ ] Unauthorized role blocked
- [ ] Export blocked when validation BLOCK
- [ ] Handoff blocked when target missing
- [ ] BOQ Version ID consistent E1–E8
- [ ] No prior SIM evidence reused
- [ ] E2/E6/E7 mutually consistent
- [ ] Audit vs runtime consistent (or M-03 gap documented)

## Carry-over Notes
(TD-7B-003 / M-03 / M-07 / TD-7A-009 as applicable)

## Evidence Links
- E1: ...
- E2: ...
(... E3–E8 ...)

## Verdict
PASS | PASS WITH WARNING | FAIL | STOP
```

---

## 4. E1–E9 Completeness Matrix (Template for S8 Execution)

To be filled during S8-1+ execution:

| SIM-CW | E1 | E2 | E3 | E4 | E5 | E6 | E7 | E8 | E9 | BOQ ID OK | Verdict |
|--------|----|----|----|----|----|----|----|----|----|-----------|---------|
| SIM-CW-001 | — | — | — | — | — | — | — | — | — | — | Planned |
| ... | | | | | | | | | | | |

---

## 5. Negative Evidence Requirements

For all **S8 Must Do** negative path scenarios:

| Layer | Minimum Evidence |
|-------|------------------|
| Validation block | E2 shows BLOCK codes; E6 Blocked |
| Approval block | E4 shows 403 + error code; workflow not advanced in E3 |
| Handoff block | E5 shows 0 records or block response; E4 handoff attempt logged |
| Export block | E7 shows 400 or no artifacts; metadata documents block reason |
| Duplicate/retry | E4 shows multiple attempts; state unchanged after first success/reject |

---

## 6. Contamination Controls

| Rule | Enforcement |
|------|-------------|
| Unique BOQ Version ID per SIM-CW | Verify in E1 and cross-check E2–E8 |
| No Sprint 7 ID reuse | Compare against [SPRINT_7_EVIDENCE_INDEX.md](../../SPRINT_7B/CLOSURE/SPRINT_7_EVIDENCE_INDEX.md) canonical IDs |
| No prior SIM-CW bundle reuse | New run = new E1 seed |
| PRE_GATE_DIAGNOSTIC isolation | Never promote to official evidence |
| Closed SIM evidence reference | Reference only in E9 baseline notes — not copied as E1 |

Sprint 7 canonical BOQ Version IDs (must not appear in S8 E1):

| SIM | BOQ Version ID |
|-----|----------------|
| SIM-001 | `8f1376bb-092b-4250-b8d9-ef87fe739ca6` |
| SIM-002 | `8c1ad9f7-7d10-4ce8-bf4d-cee967d5a650` |
| SIM-004 | `6ed88f77-3211-454c-bfc0-fa5a71ff388c` |
| SIM-008 | `1cf53bc3-e914-4b99-9926-83d2d9051980` |
| SIM-003 | `514dfb95-9fea-4db3-8f82-8977735908ed` |
| SIM-005 | `95893441-3c00-4fb1-80eb-cea0a27ecf9e` |
| SIM-006 | `5de7fdf4-0a1e-424c-9415-799cc6e03fa6` |
| SIM-007 | `68035a1f-6eb4-4fa8-8a57-4908e515af7e` |

---

## 7. False PASS Detection (Manual — S8)

Automated detector (AI-04) deferred to BOQ V2. S8 requires manual false PASS checklist in every E9:

| Check | Stop if FAIL |
|-------|--------------|
| Role authorization | Unauthorized approve succeeds |
| Export gate | Export 200 with validation BLOCK |
| Handoff gate | Handoff record without valid target |
| Readiness tier | Ready with unresolved BLOCK |
| State consistency | E3 stage advanced despite E4 rejection |
| Cache freshness | E2 Pass after data change without re-validation |
| Audit consistency | E8 success rows contradict E4 rejections without M-03 note |
| ID integrity | Any E* references wrong BOQ Version ID |

---

## 8. Relationship to Sprint 7 Evidence

| Sprint 7 Artifact | S8 Usage |
|-------------------|----------|
| SIM-001 E1–E9 | Baseline reference for SIM-CW-005 inverse (modify after approval) |
| SIM-006 E4 | Baseline for SIM-CW-002 wrong-role extension |
| SIM-007 E5/E7 | Baseline for SIM-CW-004 TD-7B-003 documentation |
| SIM-003/005 E7 | Baseline for SIM-CW-003 export block |
| Closure final green check | S8 entry baseline only — re-run before S8 execution batch |

---

## 9. S8-0 Deliverable Status

| Item | S8-0 Status |
|------|-------------|
| Evidence strategy document | **Complete** (this file) |
| Official E1–E9 bundles | **Not created** |
| Execution reports | **Not created** |
| Evidence index | **Deferred to S8 execution closure** |

---

## 10. Verdict

Evidence strategy is defined and aligned with Sprint 7B patterns plus co-worker E9 narrative requirements. **READY FOR S8-1** scenario-level evidence plan detail.

End of Sprint 8 Evidence Strategy.
