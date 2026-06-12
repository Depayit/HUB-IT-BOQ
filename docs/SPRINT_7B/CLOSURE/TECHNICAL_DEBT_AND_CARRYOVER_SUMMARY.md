# Technical Debt & Carry-over Summary — Sprint 7 Closure

| Field | Value |
|-------|-------|
| Branch | `s7b-sprint-7-closure` |
| Generated | 2026-06-12 |
| Register SSOT | [docs/SPRINT_7A/TECHNICAL_DEBT_REGISTER.md](../../SPRINT_7A/TECHNICAL_DEBT_REGISTER.md) (7A records preserved) |
| Principle | No TD closed without evidence |

---

## Sprint 7B Carry-over Register

| ID | Item | Source | Status | Timing |
|----|------|--------|--------|--------|
| M-03 | Rejected API attempts not yet in audit trail | SIM-003/005/006/007 | Deferred | S9/S10 |
| M-07 | requestId / traceId not on AppError | API/Error Contract | Deferred | S9/S10/V2 |
| TD-7B-003 | Handoff readiness / export gate alignment | SIM-007 | **Accepted carry-over** | S8/S9 or Before S10 |
| TD-7A-009 | Dual workflow model drift (`workflow-authority` vs governance) | Sprint 7A | Accepted (unchanged) | S8+ |
| AI-01 | Unified Block Reason Catalog | ARB-B | AI Suggestion Intake | S8/S9/V2 |
| AI-04 | Automated False PASS Detector | ARB-B | BOQ V2 | Post-MVP |
| ERP-V2 | ERP Downstream Block Propagation | ARB-B | ERP / Procurement V2 | Post-MVP |
| DOC-GAP-005-006 | SIM-005/006 FINAL_GREEN_CHECK.md not authored | Closure review | Accepted (non-blocker) | S8 hygiene |

---

## TD-7B-003 — Handoff Readiness / Export Gate Alignment

| Field | Value |
|-------|-------|
| Status | **ACCEPTED / CARRY TO S8–S9 or BEFORE S10** |
| Source | SIM-007 official run |
| Evidence | [evidence/SIM-007/](../evidence/SIM-007/) · [PHASE3_SIM-007/FINAL_GREEN_CHECK.md](../PHASE3_SIM-007/FINAL_GREEN_CHECK.md) |

**Observed gap:**

- Post-lock `validation_status` may remain **Pass**
- Readiness tier may remain **Ready**
- Export gate is **validation-only** — export technically allowed while handoff payload incomplete
- Handoff completeness enforced at **Handoff Layer** (`HANDOFF_TARGET_REQUIRED`) — not fully reflected in readiness/export gate

**Micro-fix applied (M-06):**

- `HANDOFF_TARGET_REQUIRED` code in `src/lib/validations/handoff.ts`
- `assertHandoffTargetProvided()` guard in `handoff.service.ts`
- Tests: 129 → **131** (+2 guard contract tests)

**Disposition:**

- **Not a blocker** for Sprint 7 Operational Readiness Simulation closure
- **Must be recorded** before production hardening / Sprint 9 / S10 freeze
- **Do not close** TD-7B-003 without separate alignment evidence

---

## M-03 — Rejected Action Audit Trail

Rejected approve/handoff/export API attempts are captured in runner JSON evidence (E4/E5/E7) but do **not** produce `audit_logs` rows today. Documented consistently across SIM-003/005/006/007 E8 artifacts. Deferred to S9/S10 when Postgres audit schema candidate (Pulse #2) is evaluated.

---

## M-07 — requestId / traceId Framework

`AppError` does not carry `requestId` / `traceId`. Sprint 7B traceability relies on **BOQ Version ID + timestamp** in evidence JSON. Documented in blocked-path plan §13 and SIM-003/005/006/007 evidence. Deferred S9/S10/V2.

---

## Sprint 7A TD Register Status (unchanged historical record)

TD-7A-001 through TD-7A-008, TD-7A-010, TD-7A-011: **CLOSED** (evidence in S7B-0 gate closure)

TD-7A-009: **ACCEPTED (carry to S7B)** — remains open, now carry to S8+

TD-7B-002: **CLOSED** (S7B-2B reporting governance warning rules)

---

## Items Explicitly Not Closed at Sprint 7

| Item | Reason |
|------|--------|
| TD-7B-003 | Architecture alignment not evidenced |
| M-03 | No audit trail instrumentation |
| M-07 | No AppError contract extension |
| AI-01, AI-04 | Intake only — not implemented |
| ERP-V2 | Out of MVP scope |
| Production Readiness | Separate sprint / evidence gate |
| MVP Freeze | Not claimed |

---

End of Technical Debt & Carry-over Summary.
