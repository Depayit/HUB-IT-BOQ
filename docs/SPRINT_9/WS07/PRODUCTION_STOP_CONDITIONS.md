# Production Stop Conditions — HUB IT BOQ V3

| Field | Value |
|-------|-------|
| System | HUB IT BOQ V3 — ERP-ready BOQ Cost Intelligence System |
| Sprint | 9-1A — WS-07 Production Safety Controls |
| Deliverable | **PS-04** |
| Document type | **GOVERNANCE / STOP CONTROL / DOCUMENTATION ONLY** |
| Branch | `main` |
| Generated | 2026-06-13 |
| Parent policy | [PRODUCTION_SAFETY_POLICY.md](PRODUCTION_SAFETY_POLICY.md) (PS-01) |

---

## 1. Purpose

Define **mandatory stop conditions** that halt Sprint 9 execution, deployment, or closure when operational safety, governance integrity, or evidence trust is compromised. A STOP is **not** a WARNING — execution must cease until the condition is cleared or explicitly dispositioned as CC-EMG with Manager authority.

---

## 2. Severity Legend

| Level | Definition | Default action |
|-------|------------|----------------|
| **Critical** | Active or imminent data integrity loss, authority bypass, or undetected false PASS | Immediate STOP; CC-EMG; Manager within 15 min |
| **High** | Governance violation or confirmed regression on protected path | STOP; no merge/deploy; Manager within 1 hour |
| **Medium** | Evidence gap or approval chain failure before production exposure | HOLD → STOP if unresolved >24h |
| **Low** | Documentation inconsistency without runtime impact | HOLD; fix before wave sign-off |

---

## 3. Stop Condition Register

### SC-01 — Audit Inconsistency

| Field | Value |
|-------|-------|
| **Trigger** | E8 `audit_logs` contradicts E4 runner capture for same BOQ Version ID + action + timestamp window; or rejection row missing when HTTP 403/409 returned |
| **Severity** | **High** |
| **Escalation path** | Engineer (detect) → Reviewer (confirm) → Manager (STOP authority) → Auditor (if M-03 related) |
| **Required action** | 1. STOP merge/deploy on affected workstream. 2. Capture both E4 and E8 snapshots. 3. Open incident record. 4. WS-02/WS-04 investigation. 5. Resume only after equivalence criteria met or M-03 fix verified. |

**Sprint 8 source:** M-03; NP-010; NP-011 E4 vs E8 sweep.

---

### SC-02 — Workflow Bypass

| Field | Value |
|-------|-------|
| **Trigger** | State transition (approve, export, handoff, re-open, revoke) succeeds without passing required upstream gate; or runner/script promotes state without gate check |
| **Severity** | **Critical** |
| **Escalation path** | System (detect) → Engineer (immediate) → Manager (incident commander) |
| **Required action** | 1. STOP all deployments. 2. Identify affected BOQ Version IDs. 3. Block export/handoff at system level if production. 4. CC-EMG rollback per PS-05. 5. NP subset regression before resume. |

**Sprint 8 source:** NP-001, NP-002, NP-003, NP-005, NP-006.

---

### SC-03 — Data Corruption

| Field | Value |
|-------|-------|
| **Trigger** | BOQ Version ID cross-contamination; audit row attached to wrong version; approval state inconsistent with validation state; duplicate approval persisted (NP-001 pattern) |
| **Severity** | **Critical** |
| **Escalation path** | Engineer → Manager → Director (if customer-facing) |
| **Required action** | 1. STOP writes to affected versions. 2. Snapshot database. 3. CC-EMG isolation. 4. Rollback RT-006 (PS-05). 5. NP-011 contamination probe before any closure. |

**Sprint 8 source:** NP-001, NP-011, NP-012.

---

### SC-04 — Unauthorized Override

| Field | Value |
|-------|-------|
| **Trigger** | Gate bypass without override record; wrong-role action returns HTTP 200; admin action suppresses block without audit row; self-approved CC-HR change |
| **Severity** | **Critical** |
| **Escalation path** | Reviewer (detect) → Manager → Auditor |
| **Required action** | 1. STOP immediately. 2. Revoke access if role misconfiguration. 3. Log retroactive override record if action was legitimate emergency. 4. PS-03 violation review. 5. NP-001/NP-002 regression mandatory. |

**Sprint 8 source:** NP-001, NP-002; PS-01 §7.

---

### SC-05 — Evidence Contradiction

| Field | Value |
|-------|-------|
| **Trigger** | E1–E9 bundle claims PASS while raw logs show failure; BOQ Version ID mismatch across evidence rows; governance-integrity-matrix.json flags contamination; false PASS detected |
| **Severity** | **High** |
| **Escalation path** | Auditor/Reviewer → Manager → Governance |
| **Required action** | 1. STOP wave closure. 2. Invalidate affected evidence bundle. 3. Re-run affected NP scenario. 4. Update FALSE_PASS register. 5. No sprint criterion credit until clean re-run. |

**Sprint 8 source:** NP-011; FALSE_PASS_PREVENTION_DECISION.

---

### SC-06 — Rollback Failure

| Field | Value |
|-------|-------|
| **Trigger** | PS-05 rollback drill fails; migration irreversible without backup; revert leaves inconsistent gate state; post-rollback NP subset fails |
| **Severity** | **High** |
| **Escalation path** | Engineer → Manager → Ops |
| **Required action** | 1. STOP deploy of associated change. 2. HOLD workstream. 3. Fix rollback procedure before any CC-HR retry. 4. Document in risk register R-S9-006. |

**Sprint 8 source:** R-S9-006; NP-005, NP-006 recovery paths.

---

### SC-07 — Approval Chain Failure

| Field | Value |
|-------|-------|
| **Trigger** | CC-CTL+ change merged without required approver; missing CHG-ID; Manager not notified on CC-CTL; CC-HR missing Product sign-off on gate semantic change |
| **Severity** | **Medium** → **High** if deployed |
| **Escalation path** | Reviewer → Manager |
| **Required action** | 1. HOLD merge if pre-deploy. 2. STOP if deployed to staging/production. 3. Retroactive approval within 24h or revert. 4. PS-03 compliance review. |

---

### SC-08 — Security Boundary Violation

| Field | Value |
|-------|-------|
| **Trigger** | Role authority matrix bypass; unauthenticated export/handoff path; audit log tampering; credentials in evidence bundle |
| **Severity** | **Critical** |
| **Escalation path** | System → Manager → Security/Ops |
| **Required action** | 1. STOP all access to affected endpoint. 2. Rotate credentials if exposed. 3. CC-EMG. 4. Forensic audit of affected window. 5. No resume without security review. |

**Sprint 8 source:** NP-001, NP-002 authority model.

---

### SC-09 — Export Safety Regression

| Field | Value |
|-------|-------|
| **Trigger** | Export HTTP 200 while validation BLOCK (excluding documented TD-7B-003 layer case); export after revoke succeeds (NP-006 regression); export without approval |
| **Severity** | **Critical** |
| **Escalation path** | Engineer → Manager → Product |
| **Required action** | 1. STOP immediately. 2. Block export gate. 3. NP-003, NP-006 regression. 4. If post-TD-7B-003 fix: reopen TD item. |

**Sprint 8 source:** NP-003, NP-006; R-S9-001; S9 Risk Register §7.

---

### SC-10 — TD/M-Item Silent Close Attempt

| Field | Value |
|-------|-------|
| **Trigger** | TD-7B-003, M-03, or M-07 marked closed without SC-01/02/03 evidence; sprint criterion checked without artifact link |
| **Severity** | **High** |
| **Escalation path** | Reviewer → Manager → Governance |
| **Required action** | 1. STOP closure process. 2. Revert status to OPEN. 3. Require disposition evidence per PS-01 §8. |

**Sprint 8 source:** TD-7B-003 carry-over; S9 Entry Gate §5.

---

### SC-11 — Stale State Undetected

| Field | Value |
|-------|-------|
| **Trigger** | Validation decision made on stale cache after live state changed; `applyLiveStaleGateGuard` disabled or failing silently; NP-009 pattern reproduces |
| **Severity** | **High** |
| **Escalation path** | Engineer → Manager → Ops |
| **Required action** | 1. STOP deploy if guard weakened. 2. Enable guard. 3. WS-05 recovery runbook. 4. NP-009 regression. |

**Sprint 8 source:** NP-009; R-S9-005.

---

### SC-12 — Governance Violation (General)

| Field | Value |
|-------|-------|
| **Trigger** | Any PS-01 principle violated: unclassified change, missing evidence, scope creep (product feature as hardening), Production Readiness claim, MVP Freeze claim |
| **Severity** | **Medium** → **High** if claim published |
| **Escalation path** | Reviewer → Manager → Governance |
| **Required action** | 1. HOLD or STOP per severity. 2. Retract unauthorized claim. 3. R-S9-010 review. |

**Sprint 8 source:** R-S9-010; S9 non-goals.

---

## 4. Stop Condition Summary Matrix

| ID | Condition | Severity | Auto-detect? |
|----|-----------|----------|--------------|
| SC-01 | Audit inconsistency | High | Partial (NP-011 sweep) |
| SC-02 | Workflow bypass | Critical | System gate |
| SC-03 | Data corruption | Critical | NP-011 probe |
| SC-04 | Unauthorized override | Critical | NP-001/002 tests |
| SC-05 | Evidence contradiction | High | E9 checklist |
| SC-06 | Rollback failure | High | Drill |
| SC-07 | Approval chain failure | Medium/High | CI/governance |
| SC-08 | Security boundary violation | Critical | Auth tests |
| SC-09 | Export safety regression | Critical | NP-003/006 |
| SC-10 | TD/M silent close | High | PS-06 checklist |
| SC-11 | Stale state undetected | High | NP-009 guard |
| SC-12 | Governance violation | Medium/High | Review |

---

## 5. STOP vs HOLD Decision

| Signal | Verdict |
|--------|---------|
| Active production corruption or authority bypass | **STOP** (Critical) |
| Failed NP regression on protected path | **STOP** (High) |
| Missing evidence for closure | **HOLD** |
| Pending Reviewer sign-off on CC-STD | **HOLD** |
| TD-7B-003 documented gap (no regression) | **PASS WITH WARNING** — not STOP |
| M-03/M-07 open with documented workaround | **PASS WITH WARNING** — not STOP |

---

## 6. Escalation Timeline

| Severity | Notify Manager | Notify Governance | Resume authority |
|----------|----------------|-----------------|------------------|
| Critical | ≤15 minutes | ≤1 hour | Manager + Reviewer + evidence |
| High | ≤1 hour | ≤4 hours | Manager + evidence |
| Medium | ≤4 hours | Next standup | Reviewer + Manager |
| Low | Next standup | — | Reviewer |

---

## 7. Clearance Criteria

A STOP condition is **cleared** only when:

1. Root cause documented
2. Corrective action executed and verified
3. Affected NP subset (or equivalent) passes
4. Risk register updated
5. Manager sign-off recorded
6. PS-06 checklist updated

**No silent clearance.**

---

## 8. Inherited Sprint 8 Stop Rules (Retained)

From [S9_RISK_REGISTER.md](../PLAN/S9_RISK_REGISTER.md) §7:

| Condition | Action |
|-----------|--------|
| Export HTTP 200 with active validation BLOCK (non-TD-7B-003 documented case) | **STOP** — SC-09 |
| Wrong-role approve returns 200 | **STOP** — SC-04 |
| TD-7B-003 silently closed without evidence | **STOP** — SC-10 |
| E1–E9 BOQ Version contamination detected | **STOP** — SC-03/SC-05 |

---

## 9. Governance Statements

| Claim | Status |
|-------|--------|
| Stop conditions enacted | **DOCUMENTED** — S9-1A |
| Active STOP conditions | **NONE** — documentation wave only |
| Production Readiness | **NOT CLAIMED** |
| MVP Freeze | **NOT CLAIMED** |

End of Production Stop Conditions (PS-04).
