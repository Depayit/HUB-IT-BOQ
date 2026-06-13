# Rollback Trigger Matrix — HUB IT BOQ V3

| Field | Value |
|-------|-------|
| System | HUB IT BOQ V3 — ERP-ready BOQ Cost Intelligence System |
| Sprint | 9-1A — WS-07 Production Safety Controls |
| Deliverable | **PS-05** |
| Document type | **GOVERNANCE / RECOVERY / DOCUMENTATION ONLY** |
| Branch | `main` |
| Generated | 2026-06-13 |
| Parent policy | [PRODUCTION_SAFETY_POLICY.md](PRODUCTION_SAFETY_POLICY.md) (PS-01) |
| Stop cross-reference | [PRODUCTION_STOP_CONDITIONS.md](PRODUCTION_STOP_CONDITIONS.md) (PS-04) |

---

## 1. Purpose

Define **rollback triggers**, owners, detection methods, rollback actions, escalation paths, and recovery verification for every production safety scenario in Sprint 9 scope. Supports PS-01 principle **Recovery Before Scale**.

---

## 2. Rollback Scenario Register

### RT-001 — Export Gate Regression (Post TD-7B-003 Fix)

| Field | Value |
|-------|-------|
| **Trigger** | Export HTTP 200 when handoff or validation should block; TD-7B-003 fix introduces new layer divergence |
| **Owner** | Manager (decision); Engineer (execution) |
| **Detection method** | NP-003, NP-004, NP-006 automated tests; export reject rate alert (WS-06); manual spot check |
| **Rollback action** | 1. Revert CC-HR deploy commit. 2. Re-enable prior gate configuration. 3. Block export at load balancer if needed. 4. Notify Product of layer SSOT revert. |
| **Escalation path** | Engineer → Manager → Product → SC-09 STOP |
| **Recovery verification** | NP-003 PASS; NP-004 returns to documented baseline; NP-006 PASS; E8 audit rows consistent |

**Workstream:** WS-01, WS-07

---

### RT-002 — Handoff Layer Corruption

| Field | Value |
|-------|-------|
| **Trigger** | Handoff succeeds with missing/invalid `handoff_target`; handoff state inconsistent with approval |
| **Owner** | Manager; Engineer |
| **Detection method** | NP-004 regression; handoff reject rate alert; auditor query |
| **Rollback action** | 1. Revert handoff module deploy. 2. Mark affected BOQ versions handoff-pending. 3. Prevent export on affected IDs. |
| **Escalation path** | Engineer → Manager → SC-02 STOP |
| **Recovery verification** | NP-004 reproduces expected block; handoff audit rows correct; no export 200 on affected IDs |

**Workstream:** WS-01

---

### RT-003 — Approval Authority Regression

| Field | Value |
|-------|-------|
| **Trigger** | Wrong-role approval returns HTTP 200; duplicate approval persisted |
| **Owner** | Manager; Engineer |
| **Detection method** | NP-001, NP-002 regression; authority matrix unit tests |
| **Rollback action** | 1. Revert authority check deploy. 2. Audit affected approvals; flag for manual review. 3. Revoke erroneous approvals if safe. |
| **Escalation path** | Reviewer → Manager → SC-04 STOP |
| **Recovery verification** | NP-001 PASS; NP-002 PASS; erroneous approvals flagged in audit |

**Workstream:** WS-01 (if authority code touched)

---

### RT-004 — Validation / Readiness State Mismatch

| Field | Value |
|-------|-------|
| **Trigger** | Readiness shows Pass while validation has active BLOCK; WARNING+BLOCK coexistence mishandled (NP-007 regression) |
| **Owner** | Engineer; Manager |
| **Detection method** | NP-007, NP-008 regression; E6/E7 tier vs E5 comparison |
| **Rollback action** | 1. Revert validation/readiness deploy. 2. Re-run validation on affected versions. 3. Document tier semantics drift. |
| **Escalation path** | Engineer → Reviewer → Manager |
| **Recovery verification** | NP-007 PASS; NP-008 PASS; E6/E7 aligns with E5 block count |

**Workstream:** WS-01, WS-07

---

### RT-005 — M-03 Audit Schema Deploy Failure

| Field | Value |
|-------|-------|
| **Trigger** | Rejection log migration fails; E8 write errors; audit rows dropped or duplicated post-deploy |
| **Owner** | Manager; Engineer |
| **Detection method** | Migration health check; NP-010 regression; E4 vs E8 row count comparison |
| **Rollback action** | 1. Stop application writes to audit table. 2. Restore DB backup or run down migration. 3. Revert application deploy. 4. Verify E8 integrity from snapshot. |
| **Escalation path** | Engineer → Manager → SC-01 STOP |
| **Recovery verification** | NP-010 PASS; rejection rows queryable; no duplicate/missing audit rows |

**Workstream:** WS-02, WS-04

---

### RT-006 — BOQ Version Data Corruption

| Field | Value |
|-------|-------|
| **Trigger** | Cross-version contamination; wrong audit attachment; state machine inconsistent |
| **Owner** | Manager (incident commander); Engineer |
| **Detection method** | NP-011 contamination probe; BOQ Version ID consistency check |
| **Rollback action** | 1. Isolate affected version IDs (read-only). 2. Restore from point-in-time backup. 3. CC-EMG if production. 4. Re-validate restored versions. |
| **Escalation path** | Engineer → Manager → Director → SC-03 STOP |
| **Recovery verification** | NP-011 PASS; version ID consistent across E1–E9; state machine audit clean |

**Workstream:** All

---

### RT-007 — M-07 RequestId Deploy Regression

| Field | Value |
|-------|-------|
| **Trigger** | AppError missing requestId on block paths; new error contract breaks clients; correlation lost |
| **Owner** | Engineer; Manager |
| **Detection method** | NP-012 regression; block-path integration tests; error response schema check |
| **Rollback action** | 1. Revert AppError contract deploy. 2. Confirm prior error shape restored. 3. Document interim correlation workaround. |
| **Escalation path** | Engineer → Reviewer → Manager |
| **Recovery verification** | NP-012 PASS or documented workaround restored; no client 500 errors on block paths |

**Workstream:** WS-03

---

### RT-008 — Stale Validation Guard Failure

| Field | Value |
|-------|-------|
| **Trigger** | `applyLiveStaleGateGuard` disabled, bypassed, or failing; stale cache decision accepted as live |
| **Owner** | Engineer; Ops |
| **Detection method** | NP-009 regression; stale guard trigger metric (WS-06); ops runbook drill |
| **Rollback action** | 1. Re-enable guard in config. 2. Revert deploy if guard code regressed. 3. Force re-validation on versions in stale window. |
| **Escalation path** | Ops → Engineer → Manager → SC-11 STOP |
| **Recovery verification** | NP-009 PASS; stale guard metrics active; affected versions re-validated |

**Workstream:** WS-05, WS-06

---

### RT-009 — State-Change Recovery Failure (Re-open / Revoke)

| Field | Value |
|-------|-------|
| **Trigger** | NP-005 re-open or NP-006 revoke leaves inconsistent state; rollback of state change fails |
| **Owner** | Manager; Engineer |
| **Detection method** | NP-005, NP-006 regression; state machine audit trail |
| **Rollback action** | 1. Manual state correction per ops runbook. 2. Revert code if state machine logic regressed. 3. Lock version until consistent. |
| **Escalation path** | Engineer → Manager → SC-06 STOP |
| **Recovery verification** | NP-005 PASS; NP-006 PASS; state machine matches audit trail |

**Workstream:** WS-05

---

### RT-010 — Monitoring Deploy Causes False Confidence

| Field | Value |
|-------|-------|
| **Trigger** | Grafana dashboard shows green while gates block; alert thresholds mask rejections; ops relies on dashboard over audit |
| **Owner** | Ops; Manager |
| **Detection method** | Dashboard vs E8 audit comparison; alert silence detection |
| **Rollback action** | 1. Mark dashboard as non-authoritative. 2. Revert dashboard deploy. 3. Reinforce E8 query SSOT in runbook. |
| **Escalation path** | Ops → Reviewer → Manager |
| **Recovery verification** | Dashboard matches E8 sample; alerts fire on test rejection |

**Workstream:** WS-06

---

### RT-011 — Evidence Bundle Contamination

| Field | Value |
|-------|-------|
| **Trigger** | Wrong BOQ Version ID in evidence; governance-integrity-matrix flags FAIL; false PASS in E9 |
| **Owner** | Reviewer; Manager |
| **Detection method** | NP-011 probe; E9 checklist; verify scripts |
| **Rollback action** | 1. Invalidate contaminated bundle. 2. Re-run affected scenario. 3. Do not credit sprint criterion. |
| **Escalation path** | Auditor → Manager → SC-05 STOP |
| **Recovery verification** | Clean re-run PASS; integrity matrix PASS |

**Workstream:** All (governance)

---

### RT-012 — CC-HR Deploy Without Rollback Drill

| Field | Value |
|-------|-------|
| **Trigger** | High-risk change deployed without completed rollback drill; drill fails mid-deploy |
| **Owner** | Manager |
| **Detection method** | PS-03 approval checklist; pre-deploy gate |
| **Rollback action** | 1. **Do not deploy** — if pre-deploy detected. 2. If deployed: immediate revert per RT-001..RT-009 matching scope. |
| **Escalation path** | Reviewer → Manager → SC-06 STOP |
| **Recovery verification** | Rollback drill passes before re-attempt |

**Workstream:** All CC-HR

---

## 3. Rollback Summary Matrix

| ID | Scenario | Owner | Severity | WS |
|----|----------|-------|----------|-----|
| RT-001 | Export gate regression | Manager | Critical | WS-01, WS-07 |
| RT-002 | Handoff corruption | Manager | Critical | WS-01 |
| RT-003 | Authority regression | Manager | Critical | WS-01 |
| RT-004 | Validation/readiness mismatch | Manager | High | WS-01, WS-07 |
| RT-005 | M-03 schema failure | Manager | High | WS-02 |
| RT-006 | Version data corruption | Manager | Critical | All |
| RT-007 | M-07 requestId regression | Engineer | Medium | WS-03 |
| RT-008 | Stale guard failure | Ops | High | WS-05, WS-06 |
| RT-009 | State-change recovery | Manager | High | WS-05 |
| RT-010 | Monitoring false confidence | Ops | Medium | WS-06 |
| RT-011 | Evidence contamination | Reviewer | High | All |
| RT-012 | Deploy without drill | Manager | High | All CC-HR |

---

## 4. Detection Method Reference

| Method | Applies to | Owner role |
|--------|------------|------------|
| NP subset regression | RT-001..RT-009, RT-011 | Engineer |
| E4 vs E8 comparison | RT-005, SC-01 | Reviewer/Auditor |
| `applyLiveStaleGateGuard` health | RT-008 | System/Ops |
| governance-integrity-matrix | RT-011 | Auditor |
| CI pre-deploy checklist | RT-012 | System |
| Grafana / alert correlation | RT-010, RT-001 (post WS-06) | Ops |
| Manual ops runbook drill | RT-008, RT-009 | Ops |

---

## 5. Recovery Verification Standard

Every rollback must produce a **Recovery Verification Record**:

| Field | Required |
|-------|----------|
| RT-ID | Rollback scenario reference |
| Trigger date/time | ISO 8601 |
| BOQ Version IDs affected | List or NONE |
| Rollback action taken | Step reference |
| NP scenarios re-run | IDs + result |
| Audit spot-check | E8 query result |
| Owner sign-off | Engineer + Manager |
| Residual risk | R-S9-xxx update |

**No Evidence = Not Done** — rollback is incomplete without this record.

---

## 6. Rollback Authority (from PS-03)

| Action | Primary | Verify | Decision |
|--------|---------|--------|----------|
| Initiate (Critical) | Engineer | Reviewer | Manager |
| Initiate (High) | Engineer | Reviewer | Manager |
| Execute DB restore | Engineer | Manager | Manager |
| Approve re-deploy | — | Reviewer | Manager |
| Automated revert | System | Engineer | Manager notified |

---

## 7. Sprint 9 Phase Rollback Readiness

| Phase | Required RT drills before scale |
|-------|--------------------------------|
| S9-1A (WS-07 docs) | None — documentation only |
| S9-1B (WS-01 code) | RT-001, RT-002, RT-003, RT-004 |
| S9-1C (WS-02/03) | RT-005, RT-007 |
| S9-2 | RT-010 |
| S9-3 | RT-008, RT-009 |

---

## 8. Governance Statements

| Claim | Status |
|-------|--------|
| Rollback matrix enacted | **DOCUMENTED** — S9-1A |
| Rollback drills executed | **NOT YET** — S9-1+ execution |
| Production Readiness | **NOT CLAIMED** |
| MVP Freeze | **NOT CLAIMED** |

End of Rollback Trigger Matrix (PS-05).
