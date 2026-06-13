# Change Classification Matrix — HUB IT BOQ V3

| Field | Value |
|-------|-------|
| System | HUB IT BOQ V3 — ERP-ready BOQ Cost Intelligence System |
| Sprint | 9-1A — WS-07 Production Safety Controls |
| Deliverable | **PS-02** |
| Document type | **GOVERNANCE / CLASSIFICATION / DOCUMENTATION ONLY** |
| Branch | `main` |
| Generated | 2026-06-13 |
| Parent policy | [PRODUCTION_SAFETY_POLICY.md](PRODUCTION_SAFETY_POLICY.md) (PS-01) |

---

## 1. Purpose

Classify every production-impacting change to BOQ V3 into one of four categories. Each category defines mandatory approval, testing, rollback, and evidence requirements. **Unclassified changes must not execute.**

---

## 2. Classification Overview

| Class | Code | Velocity | Typical Sprint 9 examples |
|-------|------|----------|---------------------------|
| Standard Change | **CC-STD** | Normal | Documentation updates, monitoring plan drafts, runbook text |
| Controlled Change | **CC-CTL** | Gated | M-03 rejection log, M-07 AppError extension, stale guard monitoring hooks |
| High-Risk Change | **CC-HR** | Restricted | TD-7B-003 gate alignment, export/handoff gate code, audit schema migration |
| Emergency Change | **CC-EMG** | Immediate | Active data corruption, authority bypass in production, audit integrity breach |

---

## 3. Classification Decision Tree

```
Does the change touch PA-01..PA-12 (protected assets)?
├── NO  → CC-STD (if docs/config only) or re-evaluate scope
└── YES → Does it modify gate behavior, audit persistence, or state transitions?
    ├── NO  → CC-CTL
    └── YES → Could a failed change cause undetected false PASS or data loss?
        ├── YES → CC-HR
        └── NO  → CC-CTL

Is there an active STOP condition (PS-04) or production incident?
└── YES → CC-EMG (incident response overrides normal class)
```

---

## 4. Change Class Definitions

### 4.1 Standard Change (CC-STD)

| Attribute | Requirement |
|-----------|-------------|
| **Description** | Low-risk changes that do not alter runtime behavior, gate logic, audit persistence, or protected assets. Includes governance documentation, observability **plans** (not implementations), risk register updates, and WS deliverable authoring. |
| **Approval requirement** | Engineer proposes; Reviewer approves. No Manager required unless cross-workstream impact. |
| **Testing requirement** | Peer review of document accuracy; link check to referenced artifacts. No simulation re-run required. |
| **Rollback requirement** | Git revert of documentation commit; no runtime rollback. |
| **Evidence requirement** | Committed document path; PS-06 checklist row; no E1–E9 bundle required. |

**Sprint 9 examples:**

- S9-0 planning package (completed)
- WS-07 PS-01..PS-06 (this wave)
- WS-06 monitoring strategy draft (plan only)
- WS-08 pre-freeze assessment draft

**Exclusions:** Any change claiming to close TD-7B-003, M-03, or M-07 is **not** CC-STD.

---

### 4.2 Controlled Change (CC-CTL)

| Attribute | Requirement |
|-----------|-------------|
| **Description** | Production-impacting changes to observability, error contracts, audit enrichment, or operational hooks that do not alter core gate pass/fail semantics. Touches protected assets but does not change whether export/handoff/approval succeeds or fails. |
| **Approval requirement** | Engineer proposes; Reviewer approves; Manager notified. System CI must pass. |
| **Testing requirement** | Unit tests for changed modules; targeted integration test; regression check on affected NP subset (minimum 1 scenario per touched path). |
| **Rollback requirement** | Documented revert procedure; feature flag or config toggle where applicable; PS-05 rollback trigger assigned. |
| **Evidence requirement** | Test logs; CI green record; change record with CHG-ID; updated risk register entry; E9-equivalent review row for behavioral paths. |

**Sprint 9 examples:**

- M-07 requestId/traceId on AppError (WS-03)
- M-03 rejection log persistence (WS-02) — if schema additive only
- `applyLiveStaleGateGuard` monitoring hooks (WS-05)
- Grafana dashboard deployment (WS-06) — post plan approval
- Auditor query documentation (WS-04)

---

### 4.3 High-Risk Change (CC-HR)

| Attribute | Requirement |
|-----------|-------------|
| **Description** | Changes that alter gate pass/fail semantics, export/handoff authorization, approval authority, state transitions, or audit SSOT integrity. Failure could produce undetected false PASS, silent export, or data corruption. |
| **Approval requirement** | Engineer proposes; Reviewer + Manager approve; Product/Governance sign-off if gate semantics change; System CI + manual gate verification. |
| **Testing requirement** | Full targeted NP subset for affected paths (minimum NP-003, NP-004, NP-006 for export/handoff); E4 vs E8 equivalence check; false PASS checklist (E9 discipline); rollback drill. |
| **Rollback requirement** | Pre-deploy rollback plan mandatory (PS-05); database migration reversible or backup verified; deploy window with ops standby. |
| **Evidence requirement** | E1–E9 bundle or equivalent formal test run; NP regression logs; before/after gate behavior matrix; Product sign-off if layer separation accepted; SC-xx criterion mapping. |

**Sprint 9 examples:**

- TD-7B-003 gate alignment — unify export with handoff readiness (WS-01 option A)
- TD-7B-003 explicit layer SSOT + product acceptance (WS-01 option B) — doc is CC-STD but **accompanying code** is CC-HR if gate messages change
- Audit schema migration affecting E8 write paths (WS-02 if destructive)
- Authority matrix code changes
- Removal or weakening of `applyLiveStaleGateGuard`

**Mandatory extra gate:** No CC-HR executes until WS-07 PS-01..PS-05 are signed ≥ PASS WITH WARNING.

---

### 4.4 Emergency Change (CC-EMG)

| Attribute | Requirement |
|-----------|-------------|
| **Description** | Immediate response to active production incident: data corruption, authority bypass, audit inconsistency, security boundary violation, or STOP condition (PS-04) in live environment. Bypasses normal scheduling but **not** logging or post-review. |
| **Approval requirement** | Engineer executes with Manager verbal/written approval; Reviewer post-hoc within 4 hours; System incident log auto-captured. |
| **Testing requirement** | Minimum smoke test on affected path before restore; full NP subset within 24 hours post-incident. |
| **Rollback requirement** | Immediate rollback if fix worsens state; PS-05 emergency escalation path; incident commander owns decision. |
| **Evidence requirement** | Incident timeline; actions taken log; BOQ Version IDs affected; post-incident review within 24 hours; CC-EMG → CC-HR or CC-CTL reclassification for permanent fix. |

**Sprint 9 note:** S9-1A is documentation-only. CC-EMG applies when S9-1+ execution reaches production or staging with live data.

---

## 5. Requirement Matrix (Summary)

| Requirement | CC-STD | CC-CTL | CC-HR | CC-EMG |
|-------------|--------|--------|-------|--------|
| Engineer propose | ✓ | ✓ | ✓ | ✓ |
| Reviewer approve | ✓ | ✓ | ✓ | Post-hoc |
| Manager approve | — | Notify | ✓ | ✓ (verbal OK) |
| Product/Governance sign-off | — | — | If gate semantics | Post-hoc |
| Unit tests | — | ✓ | ✓ | Smoke |
| NP subset regression | — | ≥1 path | Full affected set | ≤24h |
| E1–E9 bundle | — | E9 row | Full or equivalent | Post-incident |
| Rollback plan (PS-05) | Git revert | ✓ | ✓ mandatory | Immediate |
| Change record (CHG-ID) | ✓ | ✓ | ✓ | ✓ |
| Risk register update | If new risk | ✓ | ✓ | ✓ |
| PS-04 stop check | — | ✓ | ✓ | Active incident |

---

## 6. Workstream → Default Classification

| Workstream | Default class | Escalation trigger |
|------------|---------------|-------------------|
| WS-07 (S9-1A docs) | **CC-STD** | N/A — this wave |
| WS-01 TD-7B-003 code | **CC-HR** | Any export/handoff gate change |
| WS-01 TD-7B-003 SSOT doc only | **CC-STD** | — |
| WS-02 M-03 persistence | **CC-CTL** → **CC-HR** if E8 write semantics change |
| WS-03 M-07 requestId | **CC-CTL** | — |
| WS-04 Audit completeness | **CC-STD** (verify) / **CC-CTL** (query tooling) | — |
| WS-05 Recovery / rollback | **CC-CTL** | **CC-HR** if guard behavior changes |
| WS-06 Monitoring | **CC-STD** (plan) / **CC-CTL** (deploy) | — |
| WS-08 Pre-freeze assessment | **CC-STD** | — |

---

## 7. Reclassification Rules

| Event | Action |
|-------|--------|
| CC-STD scope expands to touch PA-xx | Reclassify to CC-CTL minimum |
| CC-CTL test reveals gate semantic change | Upgrade to CC-HR before merge |
| CC-HR rollback drill fails | **HOLD** — do not deploy |
| CC-EMG permanent fix merged | Reclassify follow-up as CC-HR or CC-CTL |
| Undocumented change discovered | **STOP** SC-GOV-01; retroactive CC-EMG review |

---

## 8. Governance Statements

| Claim | Status |
|-------|--------|
| Classification matrix enacted | **DOCUMENTED** — S9-1A |
| All future S9 changes classified | **REQUIRED** — not yet exercised |
| Production Readiness | **NOT CLAIMED** |
| MVP Freeze | **NOT CLAIMED** |

End of Change Classification Matrix (PS-02).
