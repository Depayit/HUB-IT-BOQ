# Sprint 8 — TD and Carry-over Review

| Field | Value |
|-------|-------|
| System | HUB IT BOQ V3 |
| Sprint | 8 Closure |
| Generated | 2026-06-12 |
| Register SSOT | [TECHNICAL_DEBT_REGISTER.md](../../SPRINT_7A/TECHNICAL_DEBT_REGISTER.md) |
| Sprint 7 source | [TECHNICAL_DEBT_AND_CARRYOVER_SUMMARY.md](../../SPRINT_7B/CLOSURE/TECHNICAL_DEBT_AND_CARRYOVER_SUMMARY.md) |

---

## 1. Purpose

Review Sprint 7 carry-over items after full Sprint 8 execution (Waves 1–4, NP-001..NP-012). Determine whether Sprint 8 execution changed the status of any TD item.

---

## 2. TD-7B-003 — Handoff Readiness / Export Gate Alignment

| Field | Value |
|-------|-------|
| **Status** | **OPEN** |
| **Sprint 8 changed status?** | **No** |

### Why still open

Post-lock validation may show Pass/Ready while the handoff layer blocks (missing `handoff_target`). Export may proceed in that state. This is a **layer separation gap**, not an undetected runtime defect.

### Evidence collected in Sprint 8

| Scenario | Assessment | Source |
|----------|------------|--------|
| NP-003 | Export and readiness both block — gap not triggered | [WAVE2/evidence/NP-003/E9-execution-note.md](../WAVE2/evidence/NP-003/E9-execution-note.md) |
| NP-004 | **CONFIRMS** — export allowed while handoff blocked | [WAVE2/evidence/NP-004/E9-execution-note.md](../WAVE2/evidence/NP-004/E9-execution-note.md) |
| NP-006 | Post-revoke export blocked via validation BLOCK | [WAVE2/evidence/NP-006/E9-execution-note.md](../WAVE2/evidence/NP-006/E9-execution-note.md) |
| NP-007 | BLOCK dominates tier; export blocked | [WAVE2/EXECUTION_REPORT/NP-007.md](../WAVE2/EXECUTION_REPORT/NP-007.md) |

### Sprint 8 treatment

- Exercised per plan — **not silently closed**
- NP-004 verdict: **PASS WITH WARNING** (maximum allowed per false PASS register FP-006)
- Wave 2 green check explicitly states TD-7B-003 **remains OPEN**

### Recommended next step

**S9 Production Hardening** — alignment fix candidate if product owner accepts layer unification scope.

---

## 3. M-03 — Rejected API Attempts Not in Audit Trail

| Field | Value |
|-------|-------|
| **Status** | **OPEN** |
| **Sprint 8 changed status?** | **No** |

### Why still open

Rejected approval, export, and handoff attempts are captured in **E4 runner JSON** but may not appear as rows in **E8** (`audit_logs`). Audit completeness cannot be inferred from E8 alone on rejection paths.

### Evidence collected in Sprint 8

| Scenario | M-03 note |
|----------|-----------|
| NP-001, NP-002, NP-008 | E9 M-03 trace note — E4 captures rejections |
| NP-004, NP-010 | E4 sequential rejection attempts documented |
| NP-011 | E9 compares E4 vs E8 |
| All rejection paths | Manual E9 checklist — not treated as audit PASS |

NP-010 retry drill: audit rows before=4, after=4 — no duplicate success rows, but rejections still primarily evidenced in E4.

### Recommended next step

**S9 Production Hardening** — persist rejected API attempts to audit trail (or structured rejection log).

---

## 4. M-07 — requestId / traceId Not on AppError

| Field | Value |
|-------|-------|
| **Status** | **OPEN** |
| **Sprint 8 changed status?** | **No** |

### Why still open

Cross-user concurrency (NP-012) and multi-persona bursts cannot be correlated via requestId in application errors. Sprint 8 used **BOQ Version ID + persona timestamps + E9 narrative** as workaround.

### Evidence collected in Sprint 8

| Scenario | M-07 treatment |
|----------|----------------|
| NP-012 | E9 M-07 note; concurrency_log persona timestamps |
| NP-001, NP-002, NP-008 | E9 defers requestId to S9 |
| Wave 3 green check | M-07 observed; fix deferred S9 |

### Recommended next step

**S9 Production Hardening** — add requestId/traceId to AppError and audit correlation.

---

## 5. TD-7A-009 — Dual Workflow Model Drift

| Field | Value |
|-------|-------|
| **Status** | **Monitor — OPEN for consolidation** |
| **Sprint 8 changed status?** | **No** |

### Why still open

Potential drift between `workflow-authority` model and governance workflow interpretation. Sprint 8 monitored in authority scenarios (NP-001, NP-002, NP-005) without blocking ambiguity or false PASS.

### Evidence collected in Sprint 8

- NP-002: clear `UNAUTHORIZED_ROLE` — no ambiguous success
- NP-001: duplicate attempt blocked with visible code
- No scenario required TD-7A-009 resolution to achieve PASS

### Classification

**Before S10** — consolidate workflow model if ambiguity blocks production interpretation.

---

## 6. Sprint 8 Code Change Inventory

| Change | Item | TD impact |
|--------|------|-----------|
| `validation.service.ts` — `applyLiveStaleGateGuard` | NP-009 stale validation | Reduces FP-001 risk; does **not** close TD-7B-003 |

No other TD items received code fixes in Sprint 8.

---

## 7. Carry-over Classification Summary

| ID | Sprint 8 outcome | Classification | Sprint 8 closed? |
|----|------------------|----------------|------------------|
| **TD-7B-003** | Tested; CONFIRMS in NP-004 | **S9** (fix candidate) | **No** |
| **M-03** | Observed; E9 documented | **S9** | **No** |
| **M-07** | Observed; workaround used | **S9** | **No** |
| **TD-7A-009** | Monitored; no blocker | **Before S10** | **No** |
| **AI-01** | Reference only | **BOQ V2** | N/A |
| **AI-04** | Manual E9 used | **BOQ V2** | N/A |
| **ERP-V2** | Out of scope | **ERP V2** | N/A |

---

## 8. Items That Did Not Become Blockers

Sprint 7 carry-over review predicted zero blockers. Sprint 8 execution confirmed:

- No wrong-role approve returned 200
- No export 200 with active validation BLOCK (except documented TD-7B-003 handoff-only case)
- No handoff record without target
- No stale cache false PASS (NP-009 guard)
- No BOQ Version contamination across 12 scenarios

---

## 9. Governance Statements

| Claim | Status |
|-------|--------|
| TD-7B-003 closed by Sprint 8 | **NOT CLAIMED** |
| M-03 resolved | **NOT CLAIMED** |
| M-07 resolved | **NOT CLAIMED** |
| Operational Readiness PASS | **NOT CLAIMED** |
| Production Readiness | **NOT CLAIMED** |
| MVP Freeze | **NOT CLAIMED** |
| Sprint 9 | **NOT STARTED** |

---

End of TD and Carry-over Review.
