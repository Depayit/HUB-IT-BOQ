# Sprint 9 TD Remediation Plan — HUB IT BOQ V3

| Field | Value |
|-------|-------|
| System | HUB IT BOQ V3 |
| Sprint | 9 — Production Hardening |
| Document type | **PLAN / GOVERNANCE / DOCUMENTATION ONLY** (S9-0) |
| Generated | 2026-06-13 |
| Register SSOT | [TECHNICAL_DEBT_REGISTER.md](../../SPRINT_7A/TECHNICAL_DEBT_REGISTER.md) |
| Sprint 8 review | [TD_AND_CARRYOVER_REVIEW.md](../../SPRINT_8/CLOSURE/TD_AND_CARRYOVER_REVIEW.md) |

---

## 1. Purpose

Review Sprint 7/8 carry-over technical debt and mitigation items. Classify disposition for Sprint 9 execution. **No fixes in S9-0.**

---

## 2. Classification Legend

| Bucket | Meaning |
|--------|---------|
| **Fix in S9** | Target closure or verified fix in Sprint 9 execution waves |
| **Monitor in S9** | Track; no code fix unless ambiguity becomes blocker |
| **Before S10** | Must disposition before MVP Freeze gate |
| **BOQ V2** | Next-generation platform scope |

---

## 3. Item Review Matrix

| ID | Description | Sprint 8 status | Classification | Workstream | Rationale |
|----|-------------|-----------------|----------------|------------|-----------|
| **TD-7B-003** | Handoff readiness / export gate alignment — export may proceed while handoff blocks | **OPEN** — CONFIRMS NP-004 | **Fix in S9** | WS-01, WS-07 | Highest-impact production safety gap; confirmed evidence; product must align gates or accept documented layer SSOT |
| **M-03** | Rejected API attempts not in audit trail (E4 only) | **OPEN** — E9 documented | **Fix in S9** | WS-02, WS-04 | Audit completeness required for operational safety; NP-010 proves rejection paths exist but E8 gap remains |
| **M-07** | requestId / traceId not on AppError | **OPEN** — workaround used | **Fix in S9** | WS-03 | Cross-user correlation (NP-012) needs production traceability; BOQ Version ID + timestamp insufficient for ops |
| **TD-7A-009** | Dual workflow model drift (`workflow-authority` vs governance) | **Monitor** — no blocker | **Monitor in S9**; **Before S10** if ambiguous | WS-08 | Sprint 8 authority runs (NP-001, NP-002) showed no ambiguous success; consolidation deferred unless S10 interpretation blocked |
| **AI-01** | Unified Block Reason Catalog | Reference only | **BOQ V2** | — | Product catalog scope; not hardening |
| **AI-04** | Automated False PASS Detector | Manual E9 used | **BOQ V2** | — | Sprint 8 manual checklist proven effective |
| **NP-009 guard** | `applyLiveStaleGateGuard` | **Adopted S8** | **Monitor in S9** → productionize S9-3 | WS-05, WS-06 | Code exists; S9 adds monitoring and runbook |

---

## 4. Detailed Remediation Plans

### TD-7B-003 — Fix in S9

| Field | Value |
|-------|-------|
| **Severity** | High |
| **Sprint 8 evidence** | NP-004 CONFIRMS; NP-003/006/007 exercise related paths |
| **Root cause** | Layer separation — post-lock validation Pass/Ready vs handoff layer block on missing `handoff_target` |
| **Options** | (A) Unify export gate with handoff readiness; (B) Document explicit layer SSOT with product acceptance |
| **S9 deliverable** | Alignment code or signed acceptance doc + targeted test |
| **Close criteria** | SC-01 — no silent close; test evidence required |
| **Before S10** | Must disposition — blocks pre-freeze confidence if open |

**Rationale for Fix in S9:** Sprint 8 proved the gap is real and documented, not a simulation artifact. Production ops cannot rely on E6/E7 alone for export safety.

---

### M-03 — Fix in S9

| Field | Value |
|-------|-------|
| **Severity** | Medium |
| **Sprint 8 evidence** | NP-010 retry drill; E9 M-03 notes on all rejection paths |
| **Root cause** | Rejected approve/export/handoff attempts not appended to `audit_logs` |
| **S9 deliverable** | Rejection log persistence (audit enrichment or parallel structured log) |
| **Close criteria** | SC-02 — queryable rejection rows |
| **Dependencies** | WS-04 audit completeness sweep |

**Rationale for Fix in S9:** Audit trail is core to operational safety. E4 runner JSON is not a production audit source.

---

### M-07 — Fix in S9

| Field | Value |
|-------|-------|
| **Severity** | Medium |
| **Sprint 8 evidence** | NP-012 concurrency_log; E9 M-07 notes |
| **Root cause** | AppError contract lacks requestId/traceId |
| **S9 deliverable** | AppError extension + audit correlation field |
| **Close criteria** | SC-03 — requestId on block paths |
| **Dependencies** | WS-06 monitoring may consume requestId as correlation key |

**Rationale for Fix in S9:** Deferred since Sprint 7B with documented workaround. Production incident response requires request correlation.

---

### TD-7A-009 — Monitor in S9; Before S10

| Field | Value |
|-------|-------|
| **Severity** | Low |
| **Sprint 8 evidence** | NP-001, NP-002, NP-005 — clear block codes; no ambiguous success |
| **Root cause** | Potential drift between `workflow-authority` and governance workflow models |
| **S9 deliverable** | Monitor log in WS-08; consolidation assessment |
| **Fix trigger** | Ambiguity blocks production role interpretation or causes false PASS |
| **Before S10** | Consolidate if MVP Freeze requires single workflow SSOT |

**Rationale for Monitor in S9:** Sprint 8 did not require resolution for PASS. Premature consolidation risks scope creep. WS-08 assesses Before S10 need.

---

## 5. AI Suggestion Intake — TD-Adjacent Items

| Item | Classification | Rationale |
|------|----------------|-----------|
| Postgres audit schema | **Fix in S9** (supports M-03) | Structured audit enrichment for rejection rows |
| Grafana observability | **Fix in S9** (WS-06 plan); implement S9-2 | Operational monitoring — not TD ID but hardening requirement |
| 72-hour readiness diagnostics | **Monitor in S9** | Ops tooling; plan in WS-06 |
| ERP-V2 downstream | **BOQ V2 / ERP V2** | Out of BOQ V3 hardening |
| Agent observability | **Future Platform** | Pulse #6, #7 |

---

## 6. Remediation Timeline

| Phase | Items | Expected outcome |
|-------|-------|------------------|
| **S9-0** | All — review only | Classification complete (this document) |
| **S9-1** | TD-7B-003, M-03, M-07 | P0 fixes or signed acceptance |
| **S9-2** | M-03 verify (WS-04), Postgres schema if needed | Audit completeness PASS |
| **S9-3** | TD-7A-009 assessment, NP-009 productionize | Monitor/disposition recorded |
| **S9-Closure** | All items | Disposition matrix in closure report |
| **Before S10** | TD-7A-009 consolidation (conditional) | Single workflow SSOT if required |

---

## 7. Disposition Decision Tree (S9-1+)

```
TD-7B-003
├── Product accepts layer separation?
│   ├── YES → Document SSOT + safety matrix (WS-07) + test NP-004 edge → CLOSE (accepted)
│   └── NO  → Unify gates (WS-01 code) + regression test → CLOSE (fixed)
M-03
├── Rejection rows in audit_logs?
│   ├── YES → WS-04 sweep → CLOSE
│   └── NO  → Implement WS-02 → re-test NP-010 → CLOSE
M-07
├── requestId on AppError block paths?
│   ├── YES → CLOSE
│   └── NO  → Implement WS-03 → re-test NP-012 subset → CLOSE
TD-7A-009
├── Ambiguity in authority scenarios?
│   ├── YES → Schedule Before S10 consolidation
│   └── NO  → Monitor; record in WS-08 → DEFER Before S10
```

---

## 8. Items Explicitly Not in S9 Remediation

| ID / Item | Bucket | Reason |
|-----------|--------|--------|
| AI-01 | BOQ V2 | Product feature |
| AI-04 | BOQ V2 | Automation enhancement |
| TD-7A-004..011 (closed S7B-0) | Closed | Already remediated |
| DOC-GAP-005-006 | Closed S7 | Evidence docs committed |

---

## 9. Success Criteria Mapping

| ID | Success criterion | Document |
|----|-------------------|----------|
| TD-7B-003 | SC-01 | [S9_PRODUCTION_HARDENING_PLAN.md](S9_PRODUCTION_HARDENING_PLAN.md) §6 |
| M-03 | SC-02, SC-04 | Same |
| M-07 | SC-03 | Same |
| TD-7A-009 | SC-08 | Same |

---

## 10. Governance Statements

| Claim | Status |
|-------|--------|
| TD-7B-003 closed | **NOT CLAIMED** |
| M-03 resolved | **NOT CLAIMED** |
| M-07 resolved | **NOT CLAIMED** |
| TD-7A-009 consolidated | **NOT CLAIMED** |
| Remediation executed | **NOT STARTED** — S9-0 planning only |
| Production Readiness | **NOT CLAIMED** |
| MVP Freeze | **NOT CLAIMED** |

End of Sprint 9 TD Remediation Plan.
