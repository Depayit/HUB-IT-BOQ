# Approval Matrix — HUB IT BOQ V3

| Field | Value |
|-------|-------|
| System | HUB IT BOQ V3 — ERP-ready BOQ Cost Intelligence System |
| Sprint | 9-1A — WS-07 Production Safety Controls |
| Deliverable | **PS-03** |
| Document type | **GOVERNANCE / APPROVAL / DOCUMENTATION ONLY** |
| Branch | `main` |
| Generated | 2026-06-13 |
| Parent policy | [PRODUCTION_SAFETY_POLICY.md](PRODUCTION_SAFETY_POLICY.md) (PS-01) |
| Classification reference | [CHANGE_CLASSIFICATION_MATRIX.md](CHANGE_CLASSIFICATION_MATRIX.md) (PS-02) |

---

## 1. Purpose

Define **who may propose, approve, execute, and override** production-impacting changes — and **who owns rollback authority** — for each change category and role in BOQ V3 Sprint 9 hardening.

---

## 2. Role Definitions

| Role | Scope | Sprint 8 persona mapping |
|------|-------|--------------------------|
| **Engineer** | Implements code, configs, runners, seeds; authors technical evidence | Engineer persona (NP-003..NP-012) |
| **Reviewer** | Reviews diffs, evidence quality, false PASS risk; cannot self-approve own proposal | Reviewer persona (NP-001, NP-007) |
| **Manager** | Approves production impact; owns escalation; authorizes HOLD/STOP resolution | Manager persona (NP-001, NP-002, NP-010, NP-012) |
| **System** | Automated enforcement: CI gates, `applyLiveStaleGateGuard`, audit write guards, deployment pipelines | NP-009 guard; NP-011 integrity probes; CI/CD |

### 2.1 Role Separation Rules

| Rule | Detail |
|------|--------|
| AR-01 | Proposer cannot be sole approver for CC-CTL and above |
| AR-02 | Reviewer cannot approve CC-HR they authored without second Reviewer or Manager |
| AR-03 | Manager override must be logged — no silent Manager bypass |
| AR-04 | System may **block** but may not **approve** human-governance decisions |
| AR-05 | Director/Procurement/Auditor personas participate in **evidence review** but are not approval authorities in this matrix unless acting as Manager delegate |

---

## 3. Authority Matrix by Change Class

### 3.1 Standard Change (CC-STD)

| Action | Engineer | Reviewer | Manager | System |
|--------|----------|----------|---------|--------|
| **May propose** | ✓ | ✓ | ✓ | — |
| **May approve** | — | ✓ | ✓ | — |
| **May execute** | ✓ | ✓ | — | CI merge gate |
| **May override** | — | — | ✓ (documented) | — |
| **Rollback authority** | Engineer (git revert) | Reviewer (verify) | Manager (if dispute) | — |

---

### 3.2 Controlled Change (CC-CTL)

| Action | Engineer | Reviewer | Manager | System |
|--------|----------|----------|---------|--------|
| **May propose** | ✓ | — | ✓ | — |
| **May approve** | — | ✓ | ✓ (if Reviewer unavailable — logged) | CI pass required |
| **May execute** | ✓ | — | — | Deploy pipeline |
| **May override** | — | — | ✓ (logged + PS-04 review) | Block only |
| **Rollback authority** | Engineer (execute revert) | Reviewer (verify evidence) | **Manager (owns decision)** | Auto-rollback if health check fails |

---

### 3.3 High-Risk Change (CC-HR)

| Action | Engineer | Reviewer | Manager | System |
|--------|----------|----------|---------|--------|
| **May propose** | ✓ | — | ✓ (governance-led) | — |
| **May approve** | — | ✓ (technical) | ✓ (production impact) — **both required** | CI + manual checklist |
| **May execute** | ✓ (under approved window) | — | — | Deploy pipeline (approved tag only) |
| **May override** | — | — | ✓ (Emergency only → CC-EMG) | **Block** — no auto-approve |
| **Rollback authority** | Engineer (execute) | Reviewer (verify NP subset) | **Manager (owns go/no-go)** | Trigger RT-xxx per PS-05 |

**Additional CC-HR requirement:** Product/Governance sign-off when gate **semantics** change (TD-7B-003 disposition).

---

### 3.4 Emergency Change (CC-EMG)

| Action | Engineer | Reviewer | Manager | System |
|--------|----------|----------|---------|--------|
| **May propose** | ✓ (incident context) | — | ✓ | Incident detector |
| **May approve** | — | Post-hoc ≤4h | ✓ (verbal/written immediate) | Log capture |
| **May execute** | ✓ (immediate) | — | ✓ (direct) | Automated containment |
| **May override** | — | — | ✓ (incident commander) | Safety block if corruption risk |
| **Rollback authority** | Engineer (first responder) | Reviewer (post-hoc) | **Manager (incident commander)** | Automated rollback hooks |

---

## 4. Workstream Approval Map

| Workstream | Change class | Proposer | Approver(s) | Executor | Override | Rollback owner |
|------------|--------------|----------|-------------|----------|----------|----------------|
| **WS-07** PS-01..PS-06 | CC-STD | Engineer | Reviewer | Engineer | Manager | Engineer |
| **WS-01** TD-7B-003 fix | CC-HR | Engineer | Reviewer + Manager + Product | Engineer | Manager → CC-EMG | Manager |
| **WS-01** SSOT doc only | CC-STD | Engineer | Reviewer + Product | Engineer | Manager | Engineer |
| **WS-02** M-03 audit | CC-CTL/HR | Engineer | Reviewer + Manager | Engineer | Manager | Manager |
| **WS-03** M-07 trace | CC-CTL | Engineer | Reviewer | Engineer | Manager | Engineer |
| **WS-04** Audit verify | CC-STD/CTL | Engineer | Reviewer | Engineer/Auditor | Manager | Engineer |
| **WS-05** Recovery | CC-CTL | Engineer | Reviewer + Manager | Engineer + Ops | Manager | Manager |
| **WS-06** Monitoring plan | CC-STD | Engineer/Ops | Reviewer | Engineer | Manager | Engineer |
| **WS-06** Dashboard deploy | CC-CTL | Engineer | Reviewer + Manager | Engineer/Ops | Manager | Manager |
| **WS-08** Pre-freeze | CC-STD | Governance | Manager | Governance | Director delegate | Manager |

---

## 5. Gate-Specific Approval Rules

Production gates require role-aligned approval **in the application** (runtime) in addition to change approval (deploy time):

| Gate | Runtime approver role | Wrong-role result | Change class if modified |
|------|----------------------|-------------------|--------------------------|
| Validation submit | Engineer | Block + audit | CC-HR |
| Readiness promote | Engineer / Reviewer | Block + audit | CC-HR |
| Approval | Manager / Director (per authority matrix) | HTTP 403 (NP-001, NP-002) | CC-HR |
| Handoff | System + Engineer payload | Block (NP-004) | CC-HR |
| Export | System gate check | Block (NP-003, NP-006) | CC-HR |

**Policy:** Deploy-time approval (this matrix) does not substitute runtime authority checks.

---

## 6. Override Protocol

### 6.1 When Override Is Permitted

| Condition | Override role | Class |
|-----------|---------------|-------|
| Scheduled change blocked by tooling false positive | Manager | CC-CTL |
| Documented TD-7B-003 layer separation in effect | Product + Manager | CC-HR (pre-approved SSOT) |
| Active incident (PS-04 STOP) | Manager | CC-EMG |
| Audit query emergency access | Manager + Auditor post-hoc | CC-EMG |

### 6.2 When Override Is Prohibited

| Condition | Action |
|-----------|--------|
| Wrong-role approval in production | **STOP** — no override |
| Export 200 while validation BLOCK (undocumented) | **STOP** — no override |
| TD/M-item silent close | **STOP** — no override |
| Evidence contamination (NP-011) | **STOP** — no override |
| Reviewer self-approves own CC-HR | **HOLD** — governance violation |

### 6.3 Override Record (Mandatory)

```
Override-ID | Date | Gate/Check bypassed | Authorizing role | Rationale | BOQ Version IDs | Rollback plan | Post-review date
```

---

## 7. Rollback Authority Hierarchy

| Priority | Role | Authority |
|----------|------|-----------|
| 1 | **Manager** | Final go/no-go on production rollback; incident commander |
| 2 | **Engineer** | Executes technical rollback per PS-05 |
| 3 | **Reviewer** | Verifies rollback evidence; blocks re-deploy if insufficient |
| 4 | **System** | Automated rollback on health-check failure (pre-configured only) |

**Rule:** Engineer may initiate rollback unilaterally if data corruption is active (CC-EMG); Manager must be notified within 15 minutes.

---

## 8. Sprint 9-1A Approval Record

| Deliverable | Class | Proposer | Approver | Executor | Status |
|-------------|-------|----------|----------|----------|--------|
| PS-01 Production Safety Policy | CC-STD | Engineer | Reviewer (pending) | Engineer | **Authored** |
| PS-02 Change Classification | CC-STD | Engineer | Reviewer (pending) | Engineer | **Authored** |
| PS-03 Approval Matrix | CC-STD | Engineer | Reviewer (pending) | Engineer | **Authored** |
| PS-04 Stop Conditions | CC-STD | Engineer | Reviewer (pending) | Engineer | **Authored** |
| PS-05 Rollback Triggers | CC-STD | Engineer | Reviewer (pending) | Engineer | **Authored** |
| PS-06 Sign-Off | CC-STD | Engineer | Manager (pending) | Governance | **Authored** |

Formal sign-off captured in [PRODUCTION_SAFETY_SIGNOFF.md](PRODUCTION_SAFETY_SIGNOFF.md).

---

## 9. Governance Statements

| Claim | Status |
|-------|--------|
| Approval matrix enacted | **DOCUMENTED** — S9-1A |
| Production Readiness | **NOT CLAIMED** |
| MVP Freeze | **NOT CLAIMED** |
| Runtime authority changes | **NOT AUTHORIZED** |

End of Approval Matrix (PS-03).
