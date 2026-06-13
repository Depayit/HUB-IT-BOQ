# Sprint 9 Production Hardening Plan — HUB IT BOQ V3

| Field | Value |
|-------|-------|
| System | HUB IT BOQ V3 |
| Sprint | 9 — Production Hardening |
| Document type | **PLAN / GOVERNANCE / DOCUMENTATION ONLY** (S9-0) |
| Branch | `main` |
| Entry gate | [S9_ENTRY_GATE.md](../ENTRY_GATE/S9_ENTRY_GATE.md) = **GO** |
| Generated | 2026-06-13 |
| Prerequisite | Sprint 7 CLOSED / PASS; Sprint 8 CLOSED / PASS WITH WARNING |

---

## 1. Mission Statement

Move BOQ V3 from **"Validated System"** to **"Operationally Safe System"**.

Sprint 7 proved operational readiness under controlled simulation. Sprint 8 proved behavioral correctness and false PASS prevention under co-worker negative-path conditions. Sprint 9 converts documented gaps into production-safe controls without adding new product features.

> **Sprint 9 — Production Hardening:** Close documented layer gaps (TD-7B-003), complete audit/trace discipline (M-03, M-07), and establish observability and recovery baselines — preserving Sprint 8 behavioral proof without claiming production go-live.

---

## 2. Sprint 9 Objectives

| # | Objective | Source |
|---|-----------|--------|
| O1 | Resolve or disposition TD-7B-003 (handoff / export / readiness alignment) | NP-004 CONFIRMS; SIM-007 |
| O2 | Complete M-03 rejected-action audit trail | NP-010; all E9 M-03 notes |
| O3 | Complete M-07 requestId / traceId correlation | NP-012 concurrency paths |
| O4 | Verify audit completeness across block/reject paths | M-03; NP-011 E4 vs E8 |
| O5 | Document and verify recovery / rollback controls | NP-009 stale guard; state-change paths |
| O6 | Define operational monitoring strategy (plan + acceptance criteria) | Pulse #2, #8; AI intake |
| O7 | Document production safety controls | TD-7B-003; export/handoff gates |
| O8 | Conduct pre-freeze readiness assessment (S10 input) | Sprint 8 closure carry-over |

---

## 3. Scope

### In scope (S9)

- TD remediation execution for TD-7B-003, M-03, M-07 (S9-1+ waves)
- Audit completeness review and rejection-log design
- RequestId / traceId contract extension on AppError and audit correlation
- Recovery and rollback control documentation and verification
- Operational monitoring strategy (metrics, alerts, dashboards — **plan first**, implement in S9-1+)
- Production safety control matrix (export, handoff, approval, stale validation)
- Pre-freeze readiness assessment against Sprint 8 evidence
- Targeted regression tests or NP subset re-run **only if** fixes introduce risk
- TD-7A-009 monitoring and consolidation assessment (disposition in S9; fix Before S10 if needed)

### Out of scope (S9)

| Item | Bucket |
|------|--------|
| AI-01 Unified Block Reason Catalog | BOQ V2 |
| AI-04 Automated False PASS Detector | BOQ V2 |
| Full NP-001..NP-012 re-run (unless regression) | Not required |
| New product features / workflow changes beyond hardening | Out of scope |
| MVP Freeze / Production Readiness claim | Sprint 10 separate gate |
| ERP downstream propagation | ERP V2 |
| Agent observability (Pulse #6, #7) | Future Platform |
| Operational Readiness re-claim | Separate review |

---

## 4. Workstream Overview

| WS | Name | Priority | Primary IDs |
|----|------|----------|-------------|
| WS-01 | TD-7B-003 Resolution | **P0** | TD-7B-003 |
| WS-02 | Rejected Action Audit | **P0** | M-03 |
| WS-03 | RequestId / TraceId | **P0** | M-07 |
| WS-04 | Audit Completeness Review | **P1** | M-03, NP-011 |
| WS-05 | Recovery & Rollback Controls | **P1** | NP-009, NP-005, NP-006 |
| WS-06 | Operational Monitoring Strategy | **P1** | Grafana, Pulse #2 |
| WS-07 | Production Safety Controls | **P0** | TD-7B-003, export/handoff SSOT |
| WS-08 | Pre-Freeze Readiness Assessment | **P2** | All carry-over; S10 input |

Detail: [S9_WORKSTREAM_MATRIX.md](S9_WORKSTREAM_MATRIX.md)

---

## 5. Execution Phases (Recommended)

| Phase | Focus | Workstreams |
|-------|-------|-------------|
| **S9-0** | Entry gate + planning package | Governance only — **this phase** |
| **S9-1** | P0 safety + audit fixes | WS-01, WS-02, WS-03, WS-07 |
| **S9-2** | Observability + audit completeness | WS-04, WS-06 |
| **S9-3** | Recovery + pre-freeze assessment | WS-05, WS-08 |
| **S9-Closure** | Disposition review + S10 entry recommendation | All WS |

S9-1+ execution is **not authorized** by S9-0. Each phase requires its own wave green check before closure.

---

## 6. Sprint 9 Success Criteria

Measurable criteria refined from Sprint 8 findings:

| # | Criterion | Measure | Source |
|---|-----------|---------|--------|
| SC-01 | TD-7B-003 disposition complete | Closed with alignment evidence **or** explicit product acceptance with documented layer separation and test proof | NP-004 |
| SC-02 | M-03 disposition complete | Rejected approve/export/handoff attempts queryable in persistent audit or structured rejection log | NP-010 E4/E8 |
| SC-03 | M-07 disposition complete | requestId present on AppError for block paths; audit correlation documented | NP-012 |
| SC-04 | Audit completeness verified | E4-equivalent rejection rows reachable from E8 or rejection log; NP-011-style E4 vs E8 sweep PASS | NP-011 |
| SC-05 | Recovery path verified | Stale validation guard productionized; rollback paths for state-change errors documented and tested | NP-009 |
| SC-06 | Observability plan approved | Monitoring strategy document with metrics, alert thresholds, and dashboard scope — implementation tracked | Pulse #2, #8 |
| SC-07 | Production safety controls documented | Export/handoff/approval gate matrix aligned with E6/E7 tier semantics | TD-7B-003 |
| SC-08 | TD-7A-009 disposition recorded | Monitor continues or consolidation scheduled Before S10 with rationale | NP-001, NP-002 |
| SC-09 | No silent false PASS regression | Targeted tests or NP subset PASS if code changed | Sprint 8 baseline |
| SC-10 | Pre-freeze assessment complete | S10 entry recommendation draft with open-item inventory | WS-08 |

**Sprint 9 closure requires SC-01 through SC-07 at minimum.** SC-08 through SC-10 may complete as PASS or documented deferral with sign-off.

---

## 7. AI Suggestion Intake Review (Carry-over)

| Item | Classification | Rationale |
|------|----------------|-----------|
| **Grafana dashboards** | **S9** (WS-06) | Operational visibility for block/export/handoff reject rates — plan in S9-0; implement S9-2 |
| **Postgres audit schema** | **S9** (WS-02, WS-04) | Complements M-03 rejected-action persistence — design in S9; may extend Before S10 |
| **requestId / traceId** | **S9** (WS-03) | M-07 — AppError contract extension |
| **Observability (72-hour diagnostics)** | **S9** (WS-06) | Production readiness monitoring candidate |
| **AI-01** Unified Block Reason Catalog | **BOQ V2** | Product scope; not hardening |
| **AI-04** Automated False PASS Detector | **BOQ V2** | Sprint 8 used manual E9 checklist successfully |
| **TD-7A-009** workflow consolidation | **Before S10** | Monitor in S9; fix if ambiguity blocks interpretation |
| **Agent observability** | **Future Platform** | Pulse #6, #7 — out of BOQ V3 S9 scope |
| **ERP-V2 downstream** | **ERP V2** | Out of scope |

No AI items are implemented in S9-0.

Source: [AI_SUGGESTION_INTAKE_SUMMARY.md](../../SPRINT_7B/CLOSURE/AI_SUGGESTION_INTAKE_SUMMARY.md), Sprint 8 closure §9

---

## 8. Dependency on Sprint 8 Artifacts

| S9 work item | Sprint 8 evidence |
|--------------|-------------------|
| TD-7B-003 | [WAVE2/evidence/NP-004/](../../SPRINT_8/WAVE2/evidence/NP-004/); [TD_AND_CARRYOVER_REVIEW.md](../../SPRINT_8/CLOSURE/TD_AND_CARRYOVER_REVIEW.md) |
| M-03 | NP-010 E4/E8; all E9 M-03 notes |
| M-07 | NP-012 concurrency_log; E9 M-07 notes |
| Stale guard productionization | NP-009; `applyLiveStaleGateGuard` |
| Governance sweep pattern | NP-011 governance-integrity-matrix.json |
| Audit completeness baseline | NP-011 E4 vs E8 comparison |

Full index: [SPRINT_8_EVIDENCE_INDEX.md](../../SPRINT_8/CLOSURE/SPRINT_8_EVIDENCE_INDEX.md)

---

## 9. Sprint 9 Non-Goals

Sprint 9 must **not**:

- Re-execute full NP-001..NP-012 matrix unless regression found
- Claim Production Readiness or MVP Freeze
- Claim Operational Readiness PASS (separate review required)
- Silently close TD-7B-003 without alignment evidence and test proof
- Start BOQ V2 feature work under Production Hardening banner
- Start Sprint 10 work

---

## 10. Governance Statements

| Claim | Status |
|-------|--------|
| Sprint 9 execution started | **NOT STARTED** (S9-0 planning only) |
| Operational Readiness PASS | **NOT CLAIMED** (inherits Sprint 7 closure) |
| Production Readiness | **NOT CLAIMED** |
| MVP Freeze | **NOT CLAIMED** |
| TD-7B-003 closed | **NOT CLAIMED — remains OPEN at S9 entry** |
| Sprint 10 started | **NOT STARTED** |

---

## 11. Related Documents

| Document | Path |
|----------|------|
| Entry Gate | [S9_ENTRY_GATE.md](../ENTRY_GATE/S9_ENTRY_GATE.md) |
| Workstream Matrix | [S9_WORKSTREAM_MATRIX.md](S9_WORKSTREAM_MATRIX.md) |
| Risk Register | [S9_RISK_REGISTER.md](S9_RISK_REGISTER.md) |
| TD Remediation Plan | [S9_TD_REMEDIATION_PLAN.md](S9_TD_REMEDIATION_PLAN.md) |
| Sprint 8 Closure | [SPRINT_8_CLOSURE_REPORT.md](../../SPRINT_8/CLOSURE/SPRINT_8_CLOSURE_REPORT.md) |
| Sprint 9 Entry Recommendation (S8) | [SPRINT_9_ENTRY_RECOMMENDATION.md](../../SPRINT_8/CLOSURE/SPRINT_9_ENTRY_RECOMMENDATION.md) |

End of Sprint 9 Production Hardening Plan.
