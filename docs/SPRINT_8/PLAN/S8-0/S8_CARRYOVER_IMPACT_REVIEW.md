# Sprint 8 Carry-over / TD Impact Review

| Field | Value |
|-------|-------|
| System | HUB IT BOQ V3 |
| Sprint | 8-0 — Planning only |
| Branch | `s7b-sprint-7-closure` |
| Generated | 2026-06-12 |
| Source | [TECHNICAL_DEBT_AND_CARRYOVER_SUMMARY.md](../../SPRINT_7B/CLOSURE/TECHNICAL_DEBT_AND_CARRYOVER_SUMMARY.md) |
| Register SSOT | [TECHNICAL_DEBT_REGISTER.md](../../SPRINT_7A/TECHNICAL_DEBT_REGISTER.md) |

---

## 1. Purpose

Assess how Sprint 7 carry-over and technical debt items affect Sprint 8 co-worker / negative path simulation planning and execution. Identify blockers vs monitor-only items.

---

## 2. Carry-over Impact Matrix

| ID | Item | Impact on S8 | Recommended Treatment | S8 Execution Blocker? |
|----|------|--------------|----------------------|----------------------|
| **TD-7B-003** | Handoff readiness / export gate alignment | Directly affects handoff/export negative paths (SIM-CW-003, SIM-CW-004, SIM-CW-006). Post-lock validation may show Pass/Ready while handoff blocked. | **S8 Must Do scenarios** must exercise and document layer behavior explicitly in E7/E9. Code alignment fix = **S9 candidate** if scenario proves gap unacceptable. | **No** — test and document; do not silently close |
| **M-03** | Rejected API attempts not in audit trail | E8 may under-represent rejections; co-worker retries (SIM-CW-010) rely on E4/E5/E7 runner JSON | Include in **evidence review** and E9 narrative. Flag missing `audit_logs` rows vs runtime reject. Fix deferred **S9 Production Hardening**. | **No** |
| **M-07** | requestId / traceId not on AppError | Cross-user race (SIM-CW-012) harder to correlate in logs | Document as **not blocker** unless traceability impossible. Use BOQ Version ID + timestamp + E9 persona sequence. Fix **S9 Production Hardening**. | **No** |
| **TD-7A-009** | Dual workflow model drift (`workflow-authority` vs governance) | May affect interpretation of wrong-role and stage-approval scenarios (SIM-CW-001, SIM-CW-002, SIM-CW-005) | **Monitor** in co-worker scenarios. Do not resolve unless scenario blocked or ambiguous PASS. Consolidation = S8 hygiene or S9. | **No** |
| **AI-01** | Unified Block Reason Catalog | Useful for E2/E8 readability; not implemented | **AI Suggestion Intake** — reference in planning only. Classification: **BOQ V2**. | **No** |
| **AI-04** | Automated False PASS Detector | Would strengthen stop-on-fail automation | **BOQ V2** — manual false PASS check in E9 for S8. | **No** |
| **DOC-GAP-005-006** | SIM-005/006 FINAL_GREEN_CHECK.md not authored | Documentation hygiene only | Optional S8 doc retrospective. E0 + E1–E9 sufficient per Sprint 7 closure. | **No** |
| **ERP-V2** | ERP downstream block propagation | No direct S8 BOQ simulation impact | **ERP / Procurement V2** — out of scope. | **No** |

---

## 3. S8 Scenario ↔ Carry-over Mapping

| Scenario | Primary TD / Carry-over |
|----------|-------------------------|
| SIM-CW-002 | TD-7A-009 (monitor), M-03 (E4 rejection evidence) |
| SIM-CW-003 | TD-7B-003 (export gate validation-only edge) |
| SIM-CW-004 | TD-7B-003 (handoff layer vs readiness) |
| SIM-CW-006 | TD-7B-003 (export after state change) |
| SIM-CW-007 | TD-7B-003 (Warning vs Block tier SSOT) |
| SIM-CW-010 | M-03 (retry rejection audit gap) |
| SIM-CW-012 | M-07 (traceability), TD-7A-009 (authority model) |

---

## 4. Blocker Assessment for S8 Execution

### **No carry-over items block Sprint 8 execution.**

All items were dispositioned as non-blockers at Sprint 7 closure. Sprint 8 must:

1. **Not close TD-7B-003** without separate alignment evidence.
2. **Not treat M-03** as audit completeness PASS — document gap in E9.
3. **Not upgrade SIM-007** export-gate warning to full PASS during S8.
4. **Apply stop-on-fail** if carry-over gap produces unexpected unauthorized success (not documented SIM-007 behavior).

---

## 5. Items That Could Become Blockers During S8 Execution

| Condition | Escalation |
|-----------|------------|
| Wrong role approve returns 200 | **STOP** — not carry-over; critical defect |
| Export 200 with validation BLOCK (not TD-7B-003 handoff-only case) | **STOP** |
| Handoff record created without target | **STOP** — regression vs SIM-007 proof |
| False PASS on stale cache (SIM-CW-009) | **STOP** |
| BOQ Version ID contamination | **STOP** |

These are runtime failures, not pre-existing carry-over blockers.

---

## 6. Recommended S8 Treatment Summary

| Priority | Action |
|----------|--------|
| P0 | Exercise TD-7B-003 in SIM-CW-003, SIM-CW-004, SIM-CW-006, SIM-CW-007 |
| P1 | Document M-03 gap in every blocked/rejection scenario E9 |
| P1 | Monitor TD-7A-009 in authority scenarios; log ambiguity in E9 |
| P2 | Optional DOC-GAP-005-006 retrospective |
| Defer | AI-01, AI-04, M-07 fix, M-03 fix, ERP-V2 to S9/V2 buckets |

---

## 7. AI Suggestion Intake (Carry-forward)

| Item | S8 Classification |
|------|-------------------|
| AI-01 Unified Block Reason Catalog | BOQ V2 |
| AI-04 Automated False PASS Detector | BOQ V2 |
| Postgres audit schema (Pulse #2) | S9 Production Hardening |
| Grafana observability (Pulse #2, #8) | S9 Production Hardening |
| 72-hour readiness diagnostics | S9 Production Hardening |
| Agent observability (Pulse #6, #7) | Future Platform |

---

## 8. Verdict

Carry-over impact review complete. **Zero blockers** for S8 planning and execution kickoff. TD-7B-003 is the highest-impact item and must be explicitly tested, not fixed silently in S8-0.

End of Sprint 8 Carry-over / TD Impact Review.
