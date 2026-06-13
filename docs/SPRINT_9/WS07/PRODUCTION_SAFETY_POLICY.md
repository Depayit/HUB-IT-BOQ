# Production Safety Policy — HUB IT BOQ V3

| Field | Value |
|-------|-------|
| System | HUB IT BOQ V3 — ERP-ready BOQ Cost Intelligence System |
| Sprint | 9-1A — WS-07 Production Safety Controls |
| Deliverable | **PS-01** |
| Document type | **GOVERNANCE / POLICY / DOCUMENTATION ONLY** |
| Branch | `main` |
| Generated | 2026-06-13 |
| Parent plan | [S9_PRODUCTION_HARDENING_PLAN.md](../PLAN/S9_PRODUCTION_HARDENING_PLAN.md) |
| Workstream | WS-07 — Production Safety Controls |

---

## 1. Purpose

This policy defines the **Production Safety Control framework** governing all Sprint 9 hardening activities and future production-impacting changes to BOQ V3. It ensures that changes cannot bypass governance, auditability, rollback capability, approval control, or operational safety requirements.

This document is **policy only**. It does **not** authorize code changes, claim Production Readiness, claim MVP Freeze, or close open carry-over items (TD-7B-003, M-03, M-07).

---

## 2. Scope

### In scope

- Production safety principles and protected assets
- Governance rules for Sprint 9 hardening waves (S9-1 through S9-Closure)
- Change classification, approval, stop, and rollback references (see companion PS-02..PS-05)
- Alignment with BOQ V3 gate chain: **validation → readiness → approval → handoff → export**

### Out of scope

| Item | Bucket |
|------|--------|
| New product features | BOQ V2 |
| UI enhancements | Out of scope |
| Simulation execution / seed / runner creation | Separate wave authorization |
| Sprint 10 / MVP Freeze | WS-08 |
| Production Readiness claim | Sprint 10 gate |
| ERP downstream propagation | ERP V2 |

---

## 3. Production Safety Principles

| # | Principle | Definition | Enforcement |
|---|-----------|------------|-------------|
| P-01 | **Safety-first** | Operational safety takes precedence over delivery speed. A change that cannot be audited, rolled back, or approved must not proceed. | Stop conditions PS-04; change class PS-02 |
| P-02 | **Governance Before Change** | No production-impacting change executes without documented classification, approval, and evidence plan. | Approval matrix PS-03 |
| P-03 | **No Silent Override** | No role, script, or system path may bypass a gate without a logged, attributable override record. | M-03 audit; stop SC-04 |
| P-04 | **No Silent Closure** | Open TD, M-items, and WARNING carry-over cannot close without disposition evidence and explicit sign-off. | TD-7B-003 guard; PS-06 |
| P-05 | **No Evidence = Not Done** | A work item is incomplete until evidence artifacts exist, are indexed, and pass trust review. | E1–E9 discipline; NP-011 pattern |
| P-06 | **Audit Before Automation** | Automated gates, runners, and CI checks must not replace human-auditable evidence until audit completeness is verified. | WS-04 dependency |
| P-07 | **Recovery Before Scale** | Rollback and recovery paths must be documented and verified before expanding change velocity or production exposure. | WS-05; PS-05 |
| P-08 | **Explicit Risk Documentation** | Every change carries documented risk, residual risk, and escalation path. | [S9_RISK_REGISTER.md](../PLAN/S9_RISK_REGISTER.md) |
| P-09 | **Explicit Ownership Assignment** | Every control, gate, and rollback scenario has a named owner role — not an implicit team. | PS-03, PS-05 |
| P-10 | **Explicit Escalation Path** | Stop and rollback triggers define who is notified, in what order, and what action is mandatory. | PS-04, PS-05 |

---

## 4. Protected Assets

The following assets are **protected** under this policy. Any change touching them requires at minimum a **Controlled Change** classification (PS-02).

| Asset ID | Asset | Protection rationale | Sprint 8 evidence |
|----------|-------|---------------------|-------------------|
| PA-01 | **BOQ Version state** | Authoritative lifecycle record; corruption breaks audit chain | NP-005, NP-006, NP-012 |
| PA-02 | **Validation gate results** | Determines BLOCK/WARNING/PASS semantics for downstream gates | NP-003, NP-007, NP-009 |
| PA-03 | **Readiness / approval state** | Authority enforcement; wrong-role success is Critical stop | NP-001, NP-002 |
| PA-04 | **Handoff layer** | Separate from validation; TD-7B-003 layer gap confirmed | NP-004 |
| PA-05 | **Export gate** | Must not silently proceed when upstream layers block | NP-003, NP-004, NP-006 |
| PA-06 | **Audit logs (E8)** | Production audit SSOT; E4 runner JSON is not substitute | M-03; NP-010, NP-011 |
| PA-07 | **Rejection records** | Rejected approve/export/handoff attempts must be queryable | M-03; NP-010 |
| PA-08 | **RequestId / traceId correlation** | Cross-user and concurrency incident correlation | M-07; NP-012 |
| PA-09 | **Evidence bundles (E1–E9)** | Governance integrity; contaminated bundles cannot close | NP-011 |
| PA-10 | **Stale validation guard** | `applyLiveStaleGateGuard` — prevents stale-cache false confidence | NP-009 |
| PA-11 | **Role authority matrix** | Engineer / Reviewer / Manager / Director permissions | NP-001, NP-002 |
| PA-12 | **TD / M-item register** | Open items must remain visible until dispositioned | TD-7B-003, M-03, M-07 |

---

## 5. Safety-First Philosophy

### 5.1 Definition

**Safety-first** means that when a conflict arises between:

- delivering a hardening fix faster, and
- preserving audit completeness, gate integrity, or rollback capability,

the system **must choose safety**. Delivery may defer; safety may not.

### 5.2 Application to BOQ V3

BOQ V3 operates across **layered gates** (validation, readiness, approval, handoff, export). Sprint 8 proved that layers can diverge — post-lock validation may show Pass/Ready while handoff blocks (TD-7B-003, NP-004). Safety-first requires:

1. **No single layer report** (E6/E7 alone) may be treated as export authorization.
2. **All block paths** must produce attributable rejection evidence (M-03 target).
3. **All block responses** must carry correlation identifiers (M-07 target).
4. **Stale state** must trigger guard or stop — not silent acceptance (NP-009).

### 5.3 Safety vs. Warning

| Status | Meaning | Allowed action |
|--------|---------|----------------|
| **PASS** | All gates and evidence consistent; no open Critical/High stop condition | Proceed per change class |
| **PASS WITH WARNING** | Documented gap with evidence; no silent false PASS | Proceed only with explicit WARNING register entry and disposition plan |
| **HOLD** | Missing evidence, approval gap, or unresolved contradiction | No production change until cleared |
| **STOP** | Active stop condition (PS-04) | Halt execution; escalate immediately |

Sprint 8 closed **PASS WITH WARNING** because TD-7B-003 is documented, not silent. This policy preserves that discipline.

---

## 6. Governance Before Change

### 6.1 Change Lifecycle

Every production-impacting change must follow:

```
Propose → Classify (PS-02) → Approve (PS-03) → Plan evidence → Execute → Verify → Record disposition
```

Skipping any step is a **governance violation** and triggers stop condition SC-GOV-01 (PS-04).

### 6.2 Minimum Change Record

| Field | Required |
|-------|----------|
| Change ID | Unique identifier (e.g., `CHG-S9-WS01-001`) |
| Classification | Standard / Controlled / High-Risk / Emergency |
| Workstream | WS-01..WS-08 |
| Protected assets touched | PA-01..PA-12 reference |
| Proposer | Role + name |
| Approver(s) | Per PS-03 |
| Evidence plan | Artifacts to produce (tests, E-rows, sign-off) |
| Rollback plan | Per PS-05 |
| Risk reference | R-S9-xxx from risk register |
| Open item impact | TD/M-item disposition statement |

### 6.3 Wave Authorization

S9-0 Entry Gate = **GO** authorizes planning only. Each execution wave (S9-1A, S9-1B, S9-2, S9-3) requires:

- WS deliverable completion evidence
- PS-06 sign-off status ≥ PASS WITH WARNING
- No active STOP condition

---

## 7. No Silent Override

### 7.1 Definition

A **silent override** occurs when:

- A gate is bypassed without audit record
- A role acts outside authority without rejection log
- A script or runner promotes state without gate check
- An admin action suppresses a block without traceable record

### 7.2 Prohibited Patterns

| Pattern | Example | Required instead |
|---------|---------|------------------|
| Gate skip | Export HTTP 200 while validation BLOCK (non-documented case) | HTTP 403/409 + rejection audit row |
| Authority bypass | Wrong-role approve returns 200 | HTTP 403 + M-03 rejection row |
| Evidence skip | Closure without E1–E9 or equivalent test proof | Evidence bundle + trust review |
| TD silent close | TD-7B-003 marked closed without alignment evidence | SC-01 disposition with test proof |
| Undocumented layer acceptance | Treating E6 Pass as export OK when handoff blocks | Explicit SSOT doc + product sign-off |

### 7.3 Permitted Override

An override is **permitted** only when:

1. Classified as **Emergency Change** (PS-02)
2. Approved per PS-03 (Manager + System notification minimum)
3. Logged with: actor, timestamp, BOQ Version ID, gate bypassed, rationale
4. Post-incident review scheduled within 24 hours
5. Rollback path verified (PS-05)

---

## 8. No Silent Closure

### 8.1 Definition

**Silent closure** means marking a work item, TD, M-item, sprint criterion, or WARNING as closed/resolved without:

- Disposition evidence
- Sign-off record
- Updated risk register entry

### 8.2 Non-Closable Without Evidence

| Item | Close requires |
|------|----------------|
| TD-7B-003 | Alignment fix **or** signed layer-separation SSOT + targeted NP-004 regression |
| M-03 | Queryable rejection rows in persistent audit |
| M-07 | requestId on AppError block paths + audit correlation doc |
| SC-01..SC-07 | Measurable evidence per [S9_PRODUCTION_HARDENING_PLAN.md](../PLAN/S9_PRODUCTION_HARDENING_PLAN.md) §6 |
| Sprint 9 wave | PS-06 sign-off ≥ PASS WITH WARNING |
| WARNING register entry | Explicit disposition: fixed, accepted, or deferred with owner |

### 8.3 Closure Record Template

Every closure must produce:

```
Item ID | Prior status | New status | Evidence path | Approver | Date | Residual risk
```

---

## 9. No Evidence = Not Done

### 9.1 Evidence Hierarchy

| Tier | Source | Production weight |
|------|--------|-------------------|
| E1–E9 bundles | Official simulation / test runs | **Authoritative** for gate proof |
| Targeted unit/integration tests | CI or manual run logs | **Authoritative** for code-path proof |
| E4 runner JSON | Negative-path capture | **Supplementary** — not production audit SSOT |
| E6/E7 reporting | Tier semantics | **Informational** — not sole export authorization |
| E8 audit_logs | Persistent audit | **Authoritative** for production audit queries |
| Planning documents | S9-0, WS-07 | **Authoritative** for governance only — not execution proof |

### 9.2 Done Criteria

A Sprint 9 hardening task is **done** only when:

1. Code or documentation deliverable exists (if applicable)
2. Verification evidence exists and is indexed
3. Trust review passes (no contamination, no contradiction)
4. Risk register updated
5. PS-06 checklist item marked with evidence link

**Planning alone is never done.**

---

## 10. Audit Before Automation

### 10.1 Rationale

Sprint 8 demonstrated that E8 audit alone can imply false completeness — rejected attempts may exist only in E4 (M-03). Automating gates or CI promotion before audit completeness is verified (WS-04) risks **automated false confidence**.

### 10.2 Rules

| Rule | Detail |
|------|--------|
| AB-01 | No CI gate may auto-close a sprint criterion without linked evidence artifact |
| AB-02 | No runner may be marked GREEN without E9-equivalent review row |
| AB-03 | Grafana alerts (WS-06) supplement — do not replace — audit queries |
| AB-04 | `applyLiveStaleGateGuard` automation requires ops runbook (WS-05) before production reliance |
| AB-05 | AI-04 (automated false PASS detector) is deferred BOQ V2 — manual E9 discipline remains SSOT |

### 10.3 Audit Completeness Prerequisite

Before any **High-Risk Change** (PS-02) to audit or gate paths:

- WS-04 E4 vs E8 equivalence criteria must be documented
- M-03 disposition path must be defined (even if not yet implemented)

---

## 11. Recovery Before Scale

### 11.1 Definition

**Scale** means increasing any of:

- Change velocity (more merges per day)
- Production exposure (live user traffic)
- Automation coverage (auto-deploy, auto-approve)
- Parallel workstream execution

**Recovery** means documented, tested ability to:

- Roll back a bad state change (NP-005 re-open, NP-006 revoke)
- Recover from stale validation (NP-009)
- Restore audit integrity after incident
- Revert code deploy with data consistency

### 11.2 Prerequisites to Scale

| Scale action | Recovery prerequisite |
|--------------|----------------------|
| WS-01 TD-7B-003 code fix | Rollback trigger RT-001..RT-004 verified (PS-05) |
| M-03 audit schema deploy | Rollback trigger RT-005; backup verification |
| Parallel S9-1 workstreams | PS-02..PS-05 complete; WS-07 signed |
| S9-2 observability deploy | WS-05 stale recovery runbook exists |
| S10 entry consideration | WS-08 pre-freeze assessment; all SC-01..SC-07 |

---

## 12. Gate Chain SSOT

Production safety controls map to the BOQ V3 gate chain:

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│ Validation  │───▶│  Readiness  │───▶│  Approval   │───▶│   Handoff   │───▶│   Export    │
│   (BLOCK/   │    │  (Pass/     │    │  (role      │    │  (target    │    │  (gate      │
│   WARNING)  │    │   Ready)    │    │   authority)│    │   complete) │    │   enforce)  │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
      │                  │                  │                  │                  │
   NP-003/007/009    E6 tier           NP-001/002         NP-004 (TD)        NP-003/006
   PA-02             PA-03              PA-11              PA-04              PA-05
```

**Policy rule:** Export authorization requires **all upstream gates** to pass for the specific BOQ Version ID — unless TD-7B-003 is explicitly dispositioned with signed layer-separation SSOT (WS-01 outcome updates this policy §12).

---

## 13. Inherited Open Items (Policy Baseline)

| ID | Status at S9-1A | Policy treatment |
|----|-----------------|------------------|
| TD-7B-003 | **OPEN** | PA-04/PA-05 protected; PASS WITH WARNING max until disposition |
| M-03 | **OPEN** | PA-06/PA-07 protected; no audit automation until closed |
| M-07 | **OPEN** | PA-08 protected; concurrency incidents use workaround correlation |
| TD-7A-009 | **Monitor** | Tracked; no blocker for WS-07 policy |

---

## 14. Related Documents

| Deliverable | Path |
|-------------|------|
| PS-02 Change Classification | [CHANGE_CLASSIFICATION_MATRIX.md](CHANGE_CLASSIFICATION_MATRIX.md) |
| PS-03 Approval Matrix | [APPROVAL_MATRIX.md](APPROVAL_MATRIX.md) |
| PS-04 Stop Conditions | [PRODUCTION_STOP_CONDITIONS.md](PRODUCTION_STOP_CONDITIONS.md) |
| PS-05 Rollback Triggers | [ROLLBACK_TRIGGER_MATRIX.md](ROLLBACK_TRIGGER_MATRIX.md) |
| PS-06 Sign-Off | [PRODUCTION_SAFETY_SIGNOFF.md](PRODUCTION_SAFETY_SIGNOFF.md) |
| Risk Register | [S9_RISK_REGISTER.md](../PLAN/S9_RISK_REGISTER.md) |
| Workstream Matrix | [S9_WORKSTREAM_MATRIX.md](../PLAN/S9_WORKSTREAM_MATRIX.md) |

---

## 15. Governance Statements

| Claim | Status |
|-------|--------|
| Production Safety Policy enacted | **DOCUMENTED** — S9-1A WS-07 |
| Production Readiness | **NOT CLAIMED** |
| MVP Freeze | **NOT CLAIMED** |
| TD-7B-003 closed | **NOT CLAIMED** |
| M-03 / M-07 closed | **NOT CLAIMED** |
| Code changes authorized | **NOT AUTHORIZED** by this document |

End of Production Safety Policy (PS-01).
