# Sprint 8 Negative Path Library — Candidate Catalog

| Field | Value |
|-------|-------|
| System | HUB IT BOQ V3 |
| Sprint | 8-1 — Detailed Co-worker Persona & Negative Path Planning |
| Document type | **PLAN / GOVERNANCE / DOCUMENTATION ONLY** |
| Branch | `s7b-sprint-7-closure` |
| HEAD at plan | `8826278c94e824d8c72c26e6d1d9e1eac2da560b` |
| Parent plan | [S8_SIMULATION_PLAN.md](S8_SIMULATION_PLAN.md) |
| Persona matrix | [S8_COWORKER_PERSONA_MATRIX.md](S8_COWORKER_PERSONA_MATRIX.md) |
| Generated | 2026-06-12 |
| Status | **Library only — not seeded, not executed** |

---

## 1. Purpose

Catalog negative path scenarios for Sprint 8 co-worker simulation. Each entry maps to a SIM-CW execution ID from [S8_SCENARIO_CANDIDATE_MATRIX.md](S8_SCENARIO_CANDIDATE_MATRIX.md).

**S8-1 does not execute, seed, or produce evidence for any NP entry.**

---

## 2. Classification Legend

| Complexity | Meaning |
|------------|---------|
| **Low** | Single persona, single action, deterministic expected outcome |
| **Medium** | Multi-step or composite state; moderate evidence cross-check |
| **High** | Multi-persona, race, or TD-7B-003 layer ambiguity |

| Recommended Sprint | Meaning |
|--------------------|---------|
| **S8 Must Do** | Required for Sprint 8 closure |
| **S8 Optional** | Execute if capacity |
| **S9** | Defer to production hardening |
| **S10 / V2** | Post-MVP |

| Risk | Meaning |
|------|---------|
| **High** | False PASS or unauthorized advance possible |
| **Medium** | Evidence gap or incorrect tier |
| **Low** | Governance / hygiene |

---

## 3. Negative Path Catalog

### NP-001 — Duplicate Approval Attempt

| Field | Value |
|-------|-------|
| **SIM-CW map** | SIM-CW-001 |
| **Personas** | Manager, Director |
| **Risk** | Medium |
| **Complexity** | Low |
| **Recommended sprint** | S8 Must Do |
| **Sprint 7 baseline** | SIM-001 happy path (inverse) |

**Scenario:** Approver submits approval twice — double-click, retry, or duplicate API call after success.

**Expected behavior:** First approve succeeds once; second rejected or no-op; E3 shows single effective approval; E4 logs both attempts.

**False PASS risk:** Duplicate audit rows or double stage advance.

---

### NP-002 — Wrong Role Approval Attempt

| Field | Value |
|-------|-------|
| **SIM-CW map** | SIM-CW-002 |
| **Personas** | Engineer, Procurement |
| **Risk** | High |
| **Complexity** | Low |
| **Recommended sprint** | S8 Must Do |
| **Sprint 7 baseline** | SIM-006 (`UNAUTHORIZED_ROLE`) |

**Scenario:** Non-approver role attempts stage or final approval.

**Expected behavior:** HTTP 403; E3 unchanged; E4 captures rejection. **False PASS risk:** Unauthorized 200 — CRITICAL STOP.

---

### NP-003 — Export While BLOCK Exists

| Field | Value |
|-------|-------|
| **SIM-CW map** | SIM-CW-003 |
| **Personas** | Procurement, Engineer |
| **Risk** | High |
| **Complexity** | Medium |
| **Recommended sprint** | S8 Must Do |
| **Sprint 7 baseline** | SIM-003, SIM-005, SIM-006 |

**Expected behavior:** HTTP 400 `EXPORT_BLOCKED`; E7 no artifacts; E6 Blocked. **False PASS risk:** Export 200 — CRITICAL STOP.

---

### NP-004 — Handoff Without Target

| Field | Value |
|-------|-------|
| **SIM-CW map** | SIM-CW-004 |
| **Personas** | Procurement, Engineer |
| **Risk** | High |
| **Complexity** | Medium |
| **Recommended sprint** | S8 Must Do |
| **Sprint 7 baseline** | SIM-007 (`HANDOFF_TARGET_REQUIRED`) |

**Expected behavior:** HTTP 403; E5 = 0 records. **TD-7B-003:** document E6/E7 vs E5 — PASS WITH WARNING max.

---

### NP-005 — Re-open Approved BOQ

| Field | Value |
|-------|-------|
| **SIM-CW map** | SIM-CW-005 |
| **Personas** | Engineer, Director |
| **Risk** | High |
| **Complexity** | Medium |
| **Recommended sprint** | S8 Must Do |

**Expected behavior:** Edit blocked OR approval invalidated; export/handoff blocked until re-validated.

---

### NP-006 — Export After Approval Revoked

| Field | Value |
|-------|-------|
| **SIM-CW map** | SIM-CW-006 |
| **Personas** | Procurement, Director |
| **Risk** | High |
| **Complexity** | Medium |
| **Recommended sprint** | S8 Must Do |

**Expected behavior:** Export blocked after revoke. **False PASS risk:** Export 200 after revoke — CRITICAL STOP.

---

### NP-007 — Warning + Block Together

| Field | Value |
|-------|-------|
| **SIM-CW map** | SIM-CW-007 |
| **Personas** | Engineer, Manager, Reviewer |
| **Risk** | High |
| **Complexity** | Medium |
| **Recommended sprint** | S8 Must Do |

**Expected behavior:** BLOCK dominates; E6 = Blocked; export blocked. **False PASS risk:** Ready with unresolved BLOCK — CRITICAL STOP.

---

### NP-008 — Multiple BLOCK Causes

| Field | Value |
|-------|-------|
| **SIM-CW map** | SIM-CW-008 |
| **Personas** | Engineer |
| **Risk** | Medium |
| **Complexity** | Medium |
| **Recommended sprint** | S8 Must Do |

**Expected behavior:** E2 lists all BLOCK codes; no partial advance.

---

### NP-009 — Stale Validation Snapshot

| Field | Value |
|-------|-------|
| **SIM-CW map** | SIM-CW-009 |
| **Personas** | Admin/Ops, Engineer |
| **Risk** | High |
| **Complexity** | High |
| **Recommended sprint** | S8 Must Do |

**Expected behavior:** E2/E6 reflect fresh validation after edit. **False PASS risk:** Stale Pass/Ready — CRITICAL STOP.

---

### NP-010 — Retry Rejected Action

| Field | Value |
|-------|-------|
| **SIM-CW map** | SIM-CW-010 |
| **Personas** | All personas |
| **Risk** | Medium |
| **Complexity** | Low |
| **Recommended sprint** | S8 Optional |

**Expected behavior:** Retry returns same rejection unless state fixed. **M-03:** rejections in E4, may absent from E8.

---

### NP-011 — Evidence Mismatch

| Field | Value |
|-------|-------|
| **SIM-CW map** | SIM-CW-011 |
| **Personas** | Auditor, Admin/Ops |
| **Risk** | Medium |
| **Complexity** | Low |
| **Recommended sprint** | S8 Optional |

**Expected behavior:** Contamination check FAIL; stop-on-fail before closure.

---

### NP-012 — Cross-user Workflow Conflict

| Field | Value |
|-------|-------|
| **SIM-CW map** | SIM-CW-012 |
| **Personas** | Engineer + Manager; Manager + Procurement |
| **Risk** | High |
| **Complexity** | High |
| **Recommended sprint** | S8 Must Do |

**Expected behavior:** Consistent final state; no double advance. **False PASS risk:** Race export/approve — CRITICAL STOP.

---

## 4. Library Summary Matrix

| ID | Theme | Risk | Complexity | Sprint | SIM-CW |
|----|-------|------|------------|--------|--------|
| NP-001 | Duplicate approval | Medium | Low | S8 Must Do | SIM-CW-001 |
| NP-002 | Wrong role approval | High | Low | S8 Must Do | SIM-CW-002 |
| NP-003 | Export while BLOCK | High | Medium | S8 Must Do | SIM-CW-003 |
| NP-004 | Handoff without target | High | Medium | S8 Must Do | SIM-CW-004 |
| NP-005 | Re-open approved BOQ | High | Medium | S8 Must Do | SIM-CW-005 |
| NP-006 | Export after revoke | High | Medium | S8 Must Do | SIM-CW-006 |
| NP-007 | Warning + Block | High | Medium | S8 Must Do | SIM-CW-007 |
| NP-008 | Multiple BLOCK causes | Medium | Medium | S8 Must Do | SIM-CW-008 |
| NP-009 | Stale validation | High | High | S8 Must Do | SIM-CW-009 |
| NP-010 | Retry rejected action | Medium | Low | S8 Optional | SIM-CW-010 |
| NP-011 | Evidence mismatch | Medium | Low | S8 Optional | SIM-CW-011 |
| NP-012 | Cross-user conflict | High | High | S8 Must Do | SIM-CW-012 |

---

## 5. Carry-over Treatment

| ID | Classification |
|----|----------------|
| TD-7B-003 | **Test in S8** — NP-003, NP-004, NP-006, NP-007 |
| M-03 | **Observe in S8** — E4 vs E8; **Defer fix S9** |
| M-07 | **Observe in S8** — **Defer fix S9** |

---

## 6. Verdict

Negative path library complete. **READY FOR S8-2**.

End of Sprint 8 Negative Path Library.
