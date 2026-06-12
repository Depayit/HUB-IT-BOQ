# Sprint 8 Simulation Plan — Co-worker + Negative Path Testing

| Field | Value |
|-------|-------|
| System | HUB IT BOQ V3 |
| Sprint | 8 — Co-worker Simulation + Negative Path Testing |
| Document type | **PLAN / GOVERNANCE / DOCUMENTATION ONLY** (S8-0) |
| Branch | `s7b-sprint-7-closure` |
| HEAD at plan | `8826278c94e824d8c72c26e6d1d9e1eac2da560b` |
| Entry gate | [S8_ENTRY_GATE.md](../ENTRY_GATE/S8_ENTRY_GATE.md) = **GO** |
| Generated | 2026-06-12 |
| Prerequisite | Sprint 7 Operational Readiness Simulation = CLOSED / PASS |

---

## 1. Objective

Sprint 8 must prove that BOQ V3 can tolerate **realistic human / team behavior**, not only clean deterministic scenario runners used in Sprint 7B.

Sprint 7 proved cross-layer enforcement under controlled seeds (Ready, Warning, Blocked). Sprint 8 extends that proof to:

- user mistakes and wrong-role actions
- retry / duplicate actions
- stale state and cache risk
- reopened or modified approved BOQ
- export after approval revoked
- Warning + Block coexistence
- multiple BLOCK causes simultaneously
- rejected API attempt evidence review
- handoff readiness / export alignment (TD-7B-003)
- cross-user workflow race risk

Sprint 8 does **not** aim to add new product features. It is a **behavioral and negative-path simulation sprint**.

---

## 2. Scope

### In scope

- Co-worker persona matrix definition and scenario mapping
- Negative path scenario candidate selection and prioritization
- Evidence strategy adapted for human-action narrative (E1–E9 + E9 persona fields)
- Stop-on-fail governance for co-worker simulation execution (S8-1+)
- TD / carry-over impact review for negative paths
- AI Suggestion Intake classification for any new ARB/Pulse items
- Execution order recommendation for S8 Must Do scenarios
- Explicit linkage to Sprint 7 SIM baseline (no re-claim of Operational Readiness)

### Sprint 7 baseline reused (reference only — not re-run unless regression)

| Tier | SIMs | Role in S8 |
|------|------|------------|
| Ready | SIM-001 | Baseline for co-worker happy-path deviation tests |
| Warning | SIM-002, SIM-004, SIM-008 | Baseline for Warning + Block coexistence |
| Blocked | SIM-003, SIM-005, SIM-006, SIM-007 | Baseline for negative path extensions |

---

## 3. Out of Scope

| Item | Bucket |
|------|--------|
| S8-0 simulation execution | This document cycle |
| Scenario seed / runner creation | S8-1+ only, after plan approval |
| Official E1–E9 evidence production | S8-1+ execution phases |
| New product feature implementation | Not S8 goal |
| Production monitoring implementation | S9 Production Hardening |
| Grafana / Postgres audit schema | S9 / Before S10 |
| Agent observability implementation | Future Platform / S11 |
| ERP downstream integration | ERP / Procurement V2 |
| Production Readiness claim | S9/S10 separate gate |
| MVP Freeze claim | S10 separate gate |
| Operational Readiness re-claim | Requires separate closure review |
| Re-running full Sprint 7 eight-SIM matrix | N/A unless regression defect found |
| User management / RBAC product changes | Simulation planning only |

---

## 4. Simulation Types

| Type | Description | Sprint 8 Role |
|------|-------------|---------------|
| **Deterministic runner** | Single-script official run (Sprint 7B pattern) | Reference baseline only; not primary S8 method |
| **Co-worker persona simulation** | Multi-step human-action sequences with role context | **Primary S8 method** |
| **Negative path simulation** | Intentional wrong action, retry, or stale-state attempt | **Primary S8 method** |
| **Cross-user race simulation** | Two personas acting on same BOQ Version ID in overlapping windows | S8 Must Do (controlled) |
| **Evidence integrity check** | BOQ Version ID consistency, no prior SIM reuse | Mandatory per scenario |
| **False PASS detector (manual)** | E9 narrative + E2/E6/E7 cross-check | Mandatory per scenario; AI-04 automated tool deferred to BOQ V2 |

---

## 5. Co-worker Persona Matrix

| Persona | Role | Typical Actions | Risk to Test |
|---------|------|-----------------|--------------|
| **Engineer** | Creates / edits BOQ | Add lines, edit discipline, save draft, submit for review | Incomplete data, wrong discipline, stale cached validation, modify after submit |
| **Manager** | Stage approval | Approve at wrong stage, duplicate approve, approve with Warning present | Wrong stage approval, authority bypass attempt, duplicate approval |
| **Director** | Final lock | Final approval, revoke / reopen attempt | Final approval misuse, export after lock revoked |
| **Procurement** | Export / handoff consumer | Request export, initiate handoff, download artifacts | Export before readiness, export while BLOCK exists, handoff with missing target, wrong file trust |
| **Auditor / Reviewer** | Evidence review | Compare E2/E6/E7/E8, verify BOQ Version ID | Evidence mismatch, missing audit rows (M-03), report vs runtime conflict |
| **Admin / Ops** | Recovery / rerun | Rerun validation, clear cache, re-seed | Rerun contamination, stale cache false PASS, prior SIM ID reuse |

**Governance note:** Personas are simulation actors only. No user management or RBAC product changes in S8-0.

---

## 6. Negative Path Themes

Minimum themes evaluated — full classification in [S8_SCENARIO_CANDIDATE_MATRIX.md](S8_SCENARIO_CANDIDATE_MATRIX.md):

| # | Theme | Primary Personas |
|---|-------|------------------|
| 1 | Duplicate approval attempt | Manager, Director |
| 2 | Wrong role approval attempt | Engineer, Procurement |
| 3 | Export attempt while BLOCK exists | Procurement, Engineer |
| 4 | Handoff attempt with missing target | Procurement, Engineer |
| 5 | Re-open or modify BOQ after approval | Engineer, Director |
| 6 | Export after approval revoked | Procurement, Director |
| 7 | Warning + Block coexistence | Engineer, Manager |
| 8 | Multiple BLOCK causes at once | Engineer |
| 9 | Stale validation / cached readiness | Admin/Ops, Engineer |
| 10 | Retry after rejected action | All personas |
| 11 | Evidence artifact missing or mismatched BOQ Version ID | Auditor |
| 12 | Cross-user workflow race condition | Engineer + Manager, Manager + Procurement |

---

## 7. Scenario Candidate List

Proposed S8 scenario IDs (planning names — not yet seeded):

| ID | Theme | Risk | Must Do in S8? | Timing |
|----|-------|------|----------------|--------|
| SIM-CW-001 | Duplicate approval attempt | Medium | Yes | S8 Must Do |
| SIM-CW-002 | Wrong role approval attempt | High | Yes | S8 Must Do |
| SIM-CW-003 | Export while BLOCK exists | High | Yes | S8 Must Do |
| SIM-CW-004 | Handoff with missing target | High | Yes | S8 Must Do |
| SIM-CW-005 | Modify BOQ after approval | High | Yes | S8 Must Do |
| SIM-CW-006 | Export after approval revoked | High | Yes | S8 Must Do |
| SIM-CW-007 | Warning + Block coexistence | High | Yes | S8 Must Do |
| SIM-CW-008 | Multiple BLOCK causes | Medium | Yes | S8 Must Do |
| SIM-CW-009 | Stale validation / cached readiness | High | Yes | S8 Must Do |
| SIM-CW-010 | Retry after rejected action | Medium | Optional | S8 Optional |
| SIM-CW-011 | Evidence BOQ Version ID mismatch check | Medium | Optional | S8 Optional |
| SIM-CW-012 | Cross-user workflow race | High | Yes | S8 Must Do |

Detail matrix: [S8_SCENARIO_CANDIDATE_MATRIX.md](S8_SCENARIO_CANDIDATE_MATRIX.md)

**S8 Must Do count: 10** · **S8 Optional: 2** — deliberate cap to avoid over-expansion.

---

## 8. Evidence Strategy

Full pattern: [S8_EVIDENCE_STRATEGY.md](S8_EVIDENCE_STRATEGY.md)

Summary — reuse E1–E9 with co-worker adaptations:

| Artifact | Purpose (S8) |
|----------|--------------|
| E1 | Seed / starting state (fresh BOQ Version ID per scenario) |
| E2 | Validation snapshot after persona action |
| E3 | Workflow state after action sequence |
| E4 | Action attempt / approval evidence (including rejections) |
| E5 | Handoff or blocked handoff evidence |
| E6 | Readiness state |
| E7 | Export / blocked export / report evidence |
| E8 | Audit trail |
| E9 | Execution note + **human action narrative** (persona, attempted action, expected vs observed, false PASS check, evidence links) |

S8-0 produces **no official E1–E9 artifacts**.

---

## 9. Stop-on-Fail Rule

**Mandatory for all Sprint 8 execution (S8-1+).**

Stop immediately and escalate if any official run finds:

| Condition | Severity |
|-----------|----------|
| Unauthorized role can approve | **CRITICAL — STOP** |
| Export succeeds when BLOCK should prevent it | **CRITICAL — STOP** |
| Handoff succeeds with incomplete target | **CRITICAL — STOP** |
| BOQ Version ID contamination (prior SIM ID in bundle) | **CRITICAL — STOP** |
| Prior SIM evidence reused as current run evidence | **CRITICAL — STOP** |
| Stale validation / cached readiness causes false PASS | **CRITICAL — STOP** |
| Audit evidence contradicts runtime result | **CRITICAL — STOP** |
| Report/export status conflicts with actual workflow state | **CRITICAL — STOP** |

**Batch rule:** Do not continue batch execution after a false PASS is confirmed. Root-cause and re-baseline before next scenario.

**TD-7B-003 note:** Export allowed while handoff blocked (SIM-007 known gap) is **not** a stop condition if documented and expected — but must not be upgraded to PASS without alignment evidence. Unexpected export when validation BLOCK exists **is** a stop condition.

---

## 10. TD / Carry-over Considerations

Full review: [S8_CARRYOVER_IMPACT_REVIEW.md](S8_CARRYOVER_IMPACT_REVIEW.md)

| ID | S8 Impact |
|----|-----------|
| TD-7B-003 | Directly affects SIM-CW-003, SIM-CW-004, SIM-CW-006 — test and document layer behavior |
| M-03 | E4/E5/E7 capture rejections; E8 may be incomplete — document in E9, not blocker |
| M-07 | Trace via BOQ Version ID + timestamp; document limitation in E9 |
| TD-7A-009 | Monitor workflow interpretation in co-worker scenarios; do not resolve unless blocking |
| DOC-GAP-005-006 | Hygiene only — optional S8 doc task |

**S8 execution blockers from carry-over: none** (per Sprint 7 closure disposition).

---

## 11. AI Suggestion Intake Handling

Continue Sprint 7 discipline. Any new ARB / Pulse / agent suggestion must be classified before entering S8 execution scope:

| Bucket | Meaning |
|--------|---------|
| Adopt Now | Implement only with explicit PO approval outside S8-0 |
| S8 Candidate | May become a co-worker scenario or evidence check |
| Before S10 | Production freeze prerequisite |
| S9 Production Hardening | Hardening sprint work |
| BOQ V2 | Next-generation platform |
| ERP / Procurement V2 | Downstream integration |
| Future Platform | S11+ |
| Not Now | Explicit deferral |

**Rule:** A good suggestion does not automatically become S8 scope. SIM-CW list is capped at 10 Must Do + 2 Optional for S8-0.

Known deferred items (unchanged from Sprint 7):

| Item | Classification |
|------|----------------|
| AI-01 Unified Block Reason Catalog | BOQ V2 (design reference only in S8) |
| AI-04 Automated False PASS Detector | BOQ V2 |
| Postgres audit schema | S9 Production Hardening |
| Grafana observability | S9 Production Hardening |
| ERP-V2 downstream propagation | ERP / Procurement V2 |

---

## 12. Execution Order Recommendation

Recommended sequence for S8-1+ execution (after plan approval — **not authorized in S8-0**):

| Phase | Scenarios | Rationale |
|-------|-----------|-----------|
| **Phase A — Authority & approval negatives** | SIM-CW-002, SIM-CW-001, SIM-CW-005, SIM-CW-006 | Builds on SIM-006 authority block baseline |
| **Phase B — Export & handoff negatives** | SIM-CW-003, SIM-CW-004, SIM-CW-007 | Exercises TD-7B-003 layer behavior |
| **Phase C — Validation & readiness negatives** | SIM-CW-008, SIM-CW-009 | Multi-block and stale-state risk |
| **Phase D — Concurrency** | SIM-CW-012 | Highest complexity; run after single-user negatives proven |
| **Phase E — Optional** | SIM-CW-010, SIM-CW-011 | Retry and evidence integrity if capacity remains |

**Gate between phases:** Delta review + stop-on-fail check before next phase batch.

**Fresh seed rule:** Each SIM-CW scenario requires unique BOQ Version ID; no reuse of Sprint 7 SIM-001..008 seeds as official S8 evidence.

---

## 13. Final Recommendation

### **READY FOR S8-1**

| Statement | Decision |
|-----------|----------|
| Sprint 8 Entry Gate | **GO** |
| S8-0 planning deliverables | **Complete** |
| S8 simulation execution | **Not authorized** (S8-1 planning gate next) |
| Production Readiness | **NOT CLAIMED** |
| MVP Freeze | **NOT CLAIMED** |
| Operational Readiness | **Inherited from Sprint 7 closure only** |

Sprint 8 Entry Gate is acceptable. The team may proceed to **S8-1** detailed Co-worker Persona / Negative Path Planning (scenario scripts, seed design, execution gate — still no official runs until S8-1 gate approves).

End of Sprint 8 Simulation Plan.
