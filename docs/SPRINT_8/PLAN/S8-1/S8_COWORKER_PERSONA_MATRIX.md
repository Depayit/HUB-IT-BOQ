# Sprint 8 Co-worker Persona Matrix — Detailed Planning

| Field | Value |
|-------|-------|
| System | HUB IT BOQ V3 |
| Sprint | 8-1 — Detailed Co-worker Persona & Negative Path Planning |
| Document type | **PLAN / GOVERNANCE / DOCUMENTATION ONLY** |
| Branch | `s7b-sprint-7-closure` |
| HEAD at plan | `8826278c94e824d8c72c26e6d1d9e1eac2da560b` |
| Entry gate | [S8_ENTRY_GATE.md](../ENTRY_GATE/S8_ENTRY_GATE.md) = **GO** |
| Parent plan | [S8_SIMULATION_PLAN.md](S8_SIMULATION_PLAN.md) |
| Generated | 2026-06-12 |
| Status | **Planning only — no execution, no RBAC changes** |

---

## 1. Purpose

Define realistic human behavior actors for Sprint 8 co-worker simulation. Each persona represents a role that can make mistakes under time pressure, incomplete context, or wrong assumptions.

Sprint 7 proved system correctness under deterministic runners. Sprint 8 must prove correctness when **users behave imperfectly**.

Personas are simulation actors only — no user management or workflow logic changes in S8-1.

---

## 2. Persona Summary

| Persona | Role | Typical Mistake | Primary Negative Paths |
|---------|------|-----------------|------------------------|
| **Engineer** | Create / Edit BOQ | Missing fields, wrong discipline, edit after submit | NP-005, NP-007, NP-008, NP-009 |
| **Reviewer** | Review before approval | Approve too early, skip validation read | NP-007, NP-001 |
| **Manager** | Stage approval | Wrong authority, duplicate approve | NP-001, NP-002, NP-012 |
| **Director** | Final lock | Lock wrong version, revoke then forget state | NP-005, NP-006 |
| **Procurement** | Export / handoff consumer | Use stale export, export while blocked | NP-003, NP-004, NP-006, NP-012 |
| **Auditor** | Evidence review | Trust incomplete evidence, miss ID mismatch | NP-011, all (E9 review) |
| **Admin / Ops** | Recovery / rerun | Re-run wrong scenario, stale cache | NP-009, NP-010, NP-011 |

---

## 3. Detailed Persona Profiles

### 3.1 Engineer

| Field | Definition |
|-------|------------|
| **Role** | Creates and edits BOQ lines, disciplines, cost data; submits for review |
| **System touchpoints** | Validation, readiness derivation, workflow draft → submitted |

**Likely mistakes**

| Mistake | Example |
|---------|---------|
| Missing required fields | Submit with empty discipline lines |
| Wrong discipline assignment | Lines under incorrect discipline code |
| Edit after submit/approve | Change lines after Manager approved |
| Assume validation is current | Act on screen without re-running validation after edit |
| Ignore Warning codes | Proceed as if Warning = Ready |

**Expected system behavior**

| Mistake | Expected response |
|---------|-------------------|
| Missing fields / discipline gaps | Validation BLOCK or Warning; readiness Blocked or Warning |
| Edit after approval/lock | Block downstream approve/export/handoff OR invalidate prior approval state |
| Stale validation assumption | Fresh validation on save/submit must reflect current data |
| Warning ignored | Unresolved BLOCK must prevent Ready tier and export |

**False PASS risk**

| Risk | Mechanism |
|------|-----------|
| Stale E2/E6 | Cached Pass/Ready after data change (NP-009) |
| Warning masked as Ready | Warning + unresolved BLOCK coexistence (NP-007) |
| Partial block reporting | Only first BLOCK shown when multiple exist (NP-008) |

**Evidence expected**

| Artifact | Content |
|----------|---------|
| E1 | Engineer seed context, initial BOQ Version ID |
| E2 | Post-edit validation snapshot with block/warning codes |
| E3 | Workflow stage after submit/edit sequence |
| E9 | Persona = Engineer; action narrative; false PASS checklist |

---

### 3.2 Reviewer

| Field | Definition |
|-------|------------|
| **Role** | Reviews BOQ completeness and validation output before formal approval chain |
| **System touchpoints** | Readiness summary, validation report, workflow state (read-heavy) |

**Likely mistakes**

| Mistake | Example |
|---------|---------|
| Approve review too early | Mark review complete while BLOCK codes remain |
| Trust summary without E2 | Accept Ready tier without checking validation detail |
| Conflate Warning with pass | Treat Warning-only BOQ as fully cleared |

**Expected system behavior**

| Mistake | Expected response |
|---------|-------------------|
| Review while BLOCK exists | System must not advance to approval-ready if BLOCK unresolved |
| Warning-only BOQ | Warning tier allowed; export may proceed with flags (per SIM-002/004/008 baseline) |
| Premature review sign-off | Workflow must not skip required gates |

**False PASS risk**

| Risk | Mechanism |
|------|-----------|
| Ready with BLOCK | Reviewer trusts E6 without E2 cross-check (NP-007) |
| Duplicate review advance | Second review action advances state incorrectly (NP-001 variant) |

**Evidence expected**

| Artifact | Content |
|----------|---------|
| E2 | Validation detail reviewer should have read |
| E6 | Readiness tier at review moment |
| E9 | Reviewer persona step; expected vs observed tier |

---

### 3.3 Manager

| Field | Definition |
|-------|------------|
| **Role** | Stage approval authority (not final lock) |
| **System touchpoints** | Approval service, workflow-authority, audit append |

**Likely mistakes**

| Mistake | Example |
|---------|---------|
| Wrong authority | Manager approves at Director-only stage |
| Duplicate approve | Click approve twice after success |
| Approve with Warning present | Approve while unresolved Warning that should block stage |
| Approve wrong BOQ version | Approve stale tab / old version ID |

**Expected system behavior**

| Mistake | Expected response |
|---------|-------------------|
| Wrong stage / role | 403 `UNAUTHORIZED_ROLE` or equivalent; no workflow advance |
| Duplicate approve | Second attempt rejected or no-op; no duplicate audit corruption |
| Approve with BLOCK | 403 validation block; no approval recorded |
| Wrong version | Reject or no effect on canonical BOQ Version ID |

**False PASS risk**

| Risk | Mechanism |
|------|-----------|
| Unauthorized approve 200 | Critical stop (NP-002) |
| Duplicate audit rows | State appears double-approved (NP-001) |
| Race with Engineer edit | Approve while concurrent edit (NP-012) |

**Evidence expected**

| Artifact | Content |
|----------|---------|
| E4 | All approve attempts with HTTP status, error code, attempt # |
| E3 | Workflow state after each attempt |
| E8 | Audit rows (note M-03 gap for rejections) |
| E9 | Manager persona sequence |

---

### 3.4 Director

| Field | Definition |
|-------|------------|
| **Role** | Final lock / final approval authority |
| **System touchpoints** | Final approval, lock status, revoke/reopen (if supported) |

**Likely mistakes**

| Mistake | Example |
|---------|---------|
| Lock wrong version | Final lock on outdated BOQ snapshot |
| Revoke then team exports | Revoke approval; Procurement exports anyway |
| Lock with handoff incomplete | Lock while handoff target still missing (TD-7B-003 edge) |
| Re-open after lock | Attempt to unlock for edit without proper workflow |

**Expected system behavior**

| Mistake | Expected response |
|---------|-------------------|
| Lock wrong version | No lock on non-canonical ID; or lock rejected |
| Export after revoke | Export blocked or returns stale/invalid status (NP-006) |
| Lock with handoff gap | Handoff still blocked at handoff layer; document TD-7B-003 |
| Re-open approved BOQ | Edit blocked or invalidates lock/approval (NP-005) |

**False PASS risk**

| Risk | Mechanism |
|------|-----------|
| Export after revoke succeeds | Critical stop (NP-006) |
| Lock appears valid but data changed | Version ID contamination |
| Handoff/export mismatch post-lock | TD-7B-003 documented gap vs unexpected success |

**Evidence expected**

| Artifact | Content |
|----------|---------|
| E3 | Lock status, approval history, revoke events |
| E4 | Director approve/revoke attempts |
| E7 | Export attempt after revoke |
| E9 | Director actions and downstream impact |

---

### 3.5 Procurement

| Field | Definition |
|-------|------------|
| **Role** | Export and handoff consumer — downstream of approval chain |
| **System touchpoints** | Export service, handoff service, readiness gate |

**Likely mistakes**

| Mistake | Example |
|---------|---------|
| Export while BLOCK exists | Download BOQ when validation still blocked |
| Handoff without target | Initiate handoff with missing `handoff_target` |
| Use stale export file | Trust earlier export after BOQ was modified |
| Export immediately after approve race | Export concurrent with in-flight edit (NP-012) |

**Expected system behavior**

| Mistake | Expected response |
|---------|-------------------|
| Export while validation BLOCK | 400 `EXPORT_BLOCKED`; no artifact files |
| Handoff without target | 403 `HANDOFF_TARGET_REQUIRED`; 0 handoff records |
| Stale export trust | New export must reflect current validation/readiness |
| Race export | Export reflects consistent post-action state; no partial file |

**False PASS risk**

| Risk | Mechanism |
|------|-----------|
| Export 200 with BLOCK | Critical stop (NP-003) |
| Handoff record without target | Critical stop (NP-004) |
| TD-7B-003 edge | Export allowed while handoff blocked — document, not silent PASS |

**Evidence expected**

| Artifact | Content |
|----------|---------|
| E5 | Handoff attempt outcome |
| E6 | Readiness at export/handoff moment |
| E7 | Export metadata, block response, or artifacts |
| E9 | Procurement persona; stale-file check narrative |

---

### 3.6 Auditor

| Field | Definition |
|-------|------------|
| **Role** | Evidence reviewer — validates proof bundle integrity |
| **System touchpoints** | E1–E9 artifacts, audit trail, execution reports |

**Likely mistakes**

| Mistake | Example |
|---------|---------|
| Trust incomplete evidence | Accept run without E4 rejection records |
| Miss BOQ Version ID mismatch | E1 ID ≠ E7/E8 ID |
| Assume audit = runtime | E8 complete but E4 shows rejections (M-03) |
| Accept false PASS narrative | E9 checklist unchecked |

**Expected system behavior**

| Mistake | Expected response |
|---------|-------------------|
| Incomplete bundle | Governance FAIL — scenario not closed |
| ID mismatch | Contamination STOP |
| Audit/runtime gap | Document M-03; do not claim audit completeness |

**False PASS risk**

| Risk | Mechanism |
|------|-----------|
| Evidence mismatch undetected | NP-011 governance drill |
| Audit contradiction ignored | E8 vs E4 conflict (M-03) |

**Evidence expected**

| Artifact | Content |
|----------|---------|
| E1–E8 | Full bundle cross-check |
| E9 | Auditor false PASS checklist completion |
| Execution report | Matrix row for SIM-CW-XXX |

---

### 3.7 Admin / Ops

| Field | Definition |
|-------|------------|
| **Role** | Recovery, rerun, cache clear, scenario re-seed |
| **System touchpoints** | Validation refresh, diagnostic reruns, environment recovery |

**Likely mistakes**

| Mistake | Example |
|---------|---------|
| Re-run wrong scenario | Copy SIM-003 seed into SIM-CW-009 run |
| Clear cache incorrectly | Validation cache stale after recovery |
| Reuse prior BOQ Version ID | Contaminate new run with Sprint 7 ID |
| Rerun after partial failure | Continue batch without stop-on-fail |

**Expected system behavior**

| Mistake | Expected response |
|---------|-------------------|
| Wrong scenario rerun | Governance catch before official evidence signed |
| Stale cache | Fresh validation must run; E2 timestamp after last edit |
| ID reuse | Contamination check FAIL |
| Batch continue after false PASS | Stop-on-fail halts wave |

**False PASS risk**

| Risk | Mechanism |
|------|-----------|
| Stale validation snapshot | NP-009 |
| BOQ Version contamination | Prior SIM ID in E1 (NP-011) |
| Retry contamination | NP-010 state advance on retry |

**Evidence expected**

| Artifact | Content |
|----------|---------|
| E1 | Fresh seed attestation, unique BOQ Version ID |
| E2 | Post-recovery validation with timestamp proof |
| E9 | Admin/Ops recovery narrative; contamination sweep |

---

## 4. Persona ↔ Negative Path Cross-Reference

| Persona | NP-001 | NP-002 | NP-003 | NP-004 | NP-005 | NP-006 | NP-007 | NP-008 | NP-009 | NP-010 | NP-011 | NP-012 |
|---------|--------|--------|--------|--------|--------|--------|--------|--------|--------|--------|--------|--------|
| Engineer | | ● | ● | ● | ● | | ● | ● | ● | ● | | ● |
| Reviewer | ● | | | | | | ● | | | | | |
| Manager | ● | ● | | | | | ● | | | ● | | ● |
| Director | ● | | | | ● | ● | | | | | | ● |
| Procurement | | | ● | ● | | ● | | | | | | ● |
| Auditor | | | | | | | | | | | ● | |
| Admin/Ops | | | | | | | | | ● | ● | ● | |

● = primary or secondary actor in scenario

---

## 5. AI Suggestion Intake Alignment (Persona Scope)

| Item | S8-1 Treatment |
|------|----------------|
| TD-7B-003 | Procurement + Director personas must document handoff/export layer gap in NP-003, NP-004, NP-006 |
| M-03 | Manager, Procurement personas — rejection evidence in E4; Auditor notes E8 gap |
| M-07 | Admin/Ops, Auditor — BOQ Version ID + timestamp trace; defer traceId fix S9 |
| TD-7A-009 | Manager, Director — monitor authority interpretation in NP-001, NP-002 |

No implementation in S8-1.

---

## 6. S8-1 Scope Confirmation

| Activity | Status |
|----------|--------|
| Persona matrix definition | **Complete** (this document) |
| Simulation execution | **NOT AUTHORIZED** |
| RBAC / user management changes | **NOT IN SCOPE** |
| Official E1–E9 | **NOT CREATED** |

---

## 7. Verdict

Co-worker persona matrix is defined with mistakes, expected behavior, false PASS risk, and evidence expectations per persona. **READY FOR S8-2** scenario matrix detail.

End of Sprint 8 Co-worker Persona Matrix.
