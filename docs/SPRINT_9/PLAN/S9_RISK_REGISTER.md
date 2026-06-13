# Sprint 9 Risk Register — Production Hardening

| Field | Value |
|-------|-------|
| System | HUB IT BOQ V3 |
| Sprint | 9 — Production Hardening |
| Document type | **PLAN / GOVERNANCE / DOCUMENTATION ONLY** (S9-0) |
| Generated | 2026-06-13 |
| Parent plan | [S9_PRODUCTION_HARDENING_PLAN.md](S9_PRODUCTION_HARDENING_PLAN.md) |

---

## 1. Severity Legend

| Level | Definition |
|-------|------------|
| **Critical** | Undetected false PASS or data integrity loss in production paths |
| **High** | Operational safety gap with confirmed Sprint 8 evidence |
| **Medium** | Audit/observability gap; workaround exists |
| **Low** | Hygiene or future-platform item; no current blocker |

---

## 2. Risk Register

| Risk ID | Risk | Severity | Sprint | Workstream | Mitigation (S9) | Residual |
|---------|------|----------|--------|------------|---------------|----------|
| **R-S9-001** | **TD-7B-003** — export may proceed while handoff layer blocks | **High** | S9 | WS-01, WS-07 | Align gates or document explicit SSOT with product sign-off; targeted NP-004 regression test | Low after disposition |
| **R-S9-002** | **M-03** — rejected API attempts under-represented in E8 audit | **Medium** | S9 | WS-02, WS-04 | Persist rejection rows; E4/E8 equivalence sweep | Low after M-03 close |
| **R-S9-003** | **M-07** — no requestId/traceId on AppError for block paths | **Medium** | S9 | WS-03 | AppError contract extension; audit correlation | Low after M-07 close |
| **R-S9-004** | **Audit confidence** — E8 read alone implies completeness; E4 required for rejections | **Medium** | S9 | WS-04 | Formalize auditor query SSOT; NP-011-style sweep post-fix | Low with WS-04 verify |
| **R-S9-005** | **Stale state recovery** — validation cache stale window could mask live state | **Medium** | S9 | WS-05 | Productionize NP-009 stale guard; ops runbook | Low — guard exists; monitor in WS-06 |
| **R-S9-006** | **Rollback failure** — state-change errors (re-open, revoke) without documented recovery | **Medium** | S9 | WS-05 | Document and test rollback paths for NP-005/NP-006 | Low after WS-05 verify |
| **R-S9-007** | **Monitoring blind spot** — no production dashboards for block/export/handoff reject rates | **Medium** | S9 | WS-06 | Observability plan + Grafana scope; alert thresholds | Medium until S9-2 implement |
| **R-S9-008** | **TD-7A-009** — dual workflow model drift (`workflow-authority` vs governance) | **Low** | Before S10 | WS-08 | Monitor in S9; consolidate Before S10 if ambiguity emerges | Low — no Sprint 8 blocker |
| **R-S9-009** | **Manual false PASS detection** — no AI-04 automation | **Low** | BOQ V2 | — | Retain E9 checklist discipline; defer AI-04 | Accepted deferral |
| **R-S9-010** | **Scope creep** — product features disguised as hardening | **Medium** | S9 | All | S9 non-goals; entry gate scope control | Low with governance |
| **R-S9-011** | **Regression** — TD/M fixes introduce new false PASS | **High** | S9 | WS-01..03 | Targeted NP subset or unit tests on changed paths | Low with test gate |
| **R-S9-012** | **Premature Production Readiness claim** | **High** | S10 | WS-08 | Explicit non-claims in all S9 docs; pre-freeze assessment | Accepted — S10 gate |

---

## 3. Mandatory Risks (Prompt Requirement)

| Required risk | Register ID | Status |
|---------------|-------------|--------|
| TD-7B-003 | R-S9-001 | **Registered — High** |
| M-03 | R-S9-002 | **Registered — Medium** |
| M-07 | R-S9-003 | **Registered — Medium** |
| Audit confidence | R-S9-004 | **Registered — Medium** |
| Stale state recovery | R-S9-005 | **Registered — Medium** |
| Rollback failure | R-S9-006 | **Registered — Medium** |
| Monitoring blind spot | R-S9-007 | **Registered — Medium** |

---

## 4. Top Risks (S9 Priority)

| Rank | Risk ID | Risk | Severity | Why now |
|------|---------|------|----------|---------|
| 1 | R-S9-001 | TD-7B-003 export/handoff layer gap | **High** | CONFIRMS in NP-004; only documented WARNING preventing silent false PASS |
| 2 | R-S9-011 | Regression from hardening fixes | **High** | P0 code changes in WS-01..03 could reintroduce false PASS |
| 3 | R-S9-004 | Audit confidence (E8 without E4) | **Medium** | Ops/auditors may misread audit completeness |
| 4 | R-S9-007 | Monitoring blind spot | **Medium** | No production visibility until WS-06 implemented |
| 5 | R-S9-005 | Stale state recovery | **Medium** | Guard exists but ops runbook and monitoring incomplete |

---

## 5. Risk by Sprint Phase

| Phase | Primary risks |
|-------|---------------|
| S9-0 (planning) | R-S9-010 scope creep |
| S9-1 (P0 fixes) | R-S9-001, R-S9-011, R-S9-002, R-S9-003 |
| S9-2 (observability) | R-S9-004, R-S9-007 |
| S9-3 (recovery + assessment) | R-S9-005, R-S9-006, R-S9-012 |
| Before S10 | R-S9-008 |

---

## 6. Inherited Sprint 8 Risks (Closed or Accepted)

| Sprint 8 risk | Sprint 9 disposition |
|---------------|---------------------|
| Silent false PASS under co-worker conditions | **Closed** — 0 silent false PASS; Sprint 8 PASS WITH WARNING |
| Governance integrity failure | **Closed** — NP-011 Wave 4 |
| Evidence contamination | **Closed** — NP-011 probes; verify scripts |
| TD-7B-003 untested | **Closed** — NP-003/004/006/007 exercised |

---

## 7. Stop Conditions (S9 Execution)

S9 execution (S9-1+) must **STOP** if:

| Condition | Action |
|-----------|--------|
| Export HTTP 200 with active validation BLOCK (non-TD-7B-003 documented case) | STOP — regression |
| Wrong-role approve returns 200 | STOP — authority failure |
| TD-7B-003 silently closed without evidence | STOP — governance violation |
| E1–E9 BOQ Version contamination detected | STOP — evidence trust failure |

Source: Sprint 8 stop-on-fail rules; adapted for hardening regression.

---

## 8. Governance Statements

| Claim | Status |
|-------|--------|
| All risks mitigated | **NOT CLAIMED** — S9-0 planning only |
| Production Readiness | **NOT CLAIMED** |
| MVP Freeze | **NOT CLAIMED** |

End of Sprint 9 Risk Register.
