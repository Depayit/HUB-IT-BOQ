# Sprint 8 Negative Path Scenario Matrix — Executable Plan

| Field | Value |
|-------|-------|
| System | HUB IT BOQ V3 |
| Sprint | 8-2 — Negative Path Scenario Matrix & Execution Prioritization |
| Document type | **PLAN / GOVERNANCE / DOCUMENTATION ONLY** |
| Branch | `s7b-sprint-7-closure` |
| HEAD at plan | `8826278c94e824d8c72c26e6d1d9e1eac2da560b` |
| Parent plan | [S8_SIMULATION_PLAN.md](S8_SIMULATION_PLAN.md) |
| S8-1 inputs | [S8_NEGATIVE_PATH_LIBRARY.md](S8_NEGATIVE_PATH_LIBRARY.md) · [S8_COWORKER_PERSONA_MATRIX.md](S8_COWORKER_PERSONA_MATRIX.md) · [S8_FALSE_PASS_RISK_REGISTER.md](S8_FALSE_PASS_RISK_REGISTER.md) |
| Generated | 2026-06-12 |
| Status | **Matrix only — not seeded, not executed** |

---

## 1. Purpose

Transform the S8-1 negative path library (NP-001..NP-012) into an executable Sprint 8 scenario matrix. Determine which scenarios must run in Sprint 8, which defer, highest risk, highest false PASS potential, grouping rationale, and minimum evidence per planned run.

**S8-2 does not execute simulation, seed scenarios, create runners, or produce E1–E9.**

---

## 2. Classification Legend

| Risk / False PASS | Meaning |
|-------------------|---------|
| **Low** | Unlikely silent production escape; evidence gap or hygiene only |
| **Medium** | Incorrect UX or partial evidence; unlikely unauthorized advance |
| **High** | Could cause unauthorized workflow advance or tier mismatch |
| **Critical** | Stop-on-fail trigger; false PASS would invalidate Sprint 8 proof |

| Complexity | Meaning |
|------------|---------|
| **Low** | Single persona, single action, deterministic expected outcome |
| **Medium** | Multi-step or composite state; moderate E2/E6/E7 cross-check |
| **High** | Multi-persona, race, cache, or TD-7B-003 layer ambiguity |

| Sprint classification | Meaning |
|-----------------------|---------|
| **S8 MUST DO** | Required for Sprint 8 co-worker simulation closure |
| **S8 OPTIONAL** | Execute if capacity; not required for S8 closure |
| **S9 Production Hardening** | Defer fix or hardening to S9 |
| **Before S10** | Required before production freeze gate |
| **BOQ V2** | Next-generation platform scope |
| **ERP / Procurement V2** | Downstream integration scope |
| **Not Now** | Explicit deferral |

---

## 3. Scenario Matrix

| Scenario | Description | Risk | False PASS Potential | Complexity | SIM-CW |
|----------|-------------|------|----------------------|------------|--------|
| **NP-001** | Duplicate approval attempt — second approve after success | Medium | Medium | Low | SIM-CW-001 |
| **NP-002** | Wrong role approval attempt — non-approver submits approve | Critical | Critical | Low | SIM-CW-002 |
| **NP-003** | Export while BLOCK exists — export during validation BLOCK | Critical | Critical | Medium | SIM-CW-003 |
| **NP-004** | Handoff without target — handoff with missing `handoff_target` | High | High | Medium | SIM-CW-004 |
| **NP-005** | Re-open approved BOQ — edit after lock/approve | High | High | Medium | SIM-CW-005 |
| **NP-006** | Export after approval revoked — export post-revoke | Critical | Critical | Medium | SIM-CW-006 |
| **NP-007** | Warning + Block together — unresolved BLOCK must dominate tier | High | Critical | Medium | SIM-CW-007 |
| **NP-008** | Multiple BLOCK causes — composite validation BLOCK set | Medium | Medium | Medium | SIM-CW-008 |
| **NP-009** | Stale validation snapshot — cached Pass/Ready after data change | Critical | Critical | High | SIM-CW-009 |
| **NP-010** | Retry rejected action — repeat failed approve/export/handoff | Medium | Medium | Low | SIM-CW-010 |
| **NP-011** | Evidence mismatch — deliberate BOQ Version ID contamination drill | Medium | High | Low | SIM-CW-011 |
| **NP-012** | Cross-user workflow conflict — overlapping approve/export/handoff | Critical | Critical | High | SIM-CW-012 |

---

## 4. Sprint Classification

| Scenario | Classification | Justification |
|----------|----------------|---------------|
| **NP-001** | **S8 MUST DO** | Core co-worker mistake; proves idempotent approval and audit integrity. Sprint 7 SIM-001 inverse. Low complexity warm-up. |
| **NP-002** | **S8 MUST DO** | Authority boundary is CRITICAL stop-on-fail. Extends proven SIM-006 baseline with co-worker narrative. |
| **NP-003** | **S8 MUST DO** | Export gate is production-critical. Exercises TD-7B-003 export layer; SIM-003/005/006 baseline. |
| **NP-004** | **S8 MUST DO** | Handoff gate regression risk vs SIM-007. TD-7B-003 must be documented, not silently closed. |
| **NP-005** | **S8 MUST DO** | Post-approval edit invalidation is core governance proof. SIM-001 happy-path inverse. |
| **NP-006** | **S8 MUST DO** | Revoke-then-export is high false PASS risk; no Sprint 7 dedicated inverse run. |
| **NP-007** | **S8 MUST DO** | Warning + Block coexistence required by S8-0 minimum themes. SIM-002/004/008 + blocked baseline. |
| **NP-008** | **S8 MUST DO** | Composite BLOCK reporting; prevents partial advance with remaining BLOCK codes. |
| **NP-009** | **S8 MUST DO** | Stale cache is highest silent false PASS class. Requires Admin/Ops + Engineer co-action. |
| **NP-010** | **S8 OPTIONAL** | Retry/idempotency valuable but covered partially by NP-001/NP-002/NP-004 reject paths. M-03 observation only. |
| **NP-011** | **S8 OPTIONAL** | Governance contamination drill; strongly recommended for Auditor persona closure but not blocking S8 if E9 cross-check enforced on all runs. |
| **NP-012** | **S8 MUST DO** | Only concurrency scenario; highest execution complexity. Must run after single-user negatives proven. |

**S8 planned execution cap:** 10 MUST DO + up to 2 OPTIONAL = **12 maximum** (unchanged from S8-0).

---

## 5. Persona Coverage Review

Planned scenarios = **10 MUST DO** + **2 OPTIONAL** (recommended).

| Persona | Covered Scenarios | Coverage Status |
|---------|-------------------|-----------------|
| **Engineer** | NP-003, NP-004, NP-005, NP-007, NP-008, NP-009, NP-012 | **COVERED** |
| **Reviewer** | NP-001, NP-007 | **COVERED** (readiness review step in Warning + Block scenario) |
| **Manager** | NP-001, NP-002, NP-007, NP-012 | **COVERED** |
| **Director** | NP-001, NP-005, NP-006, NP-012 | **COVERED** |
| **Procurement** | NP-003, NP-004, NP-006, NP-012 | **COVERED** |
| **Auditor** | NP-011 (primary); E9 false PASS checklist on **all** MUST DO runs (secondary) | **COVERED WITH CONDITION** — execute NP-011 OR assign Auditor sign-off on every E9 bundle |
| **Admin/Ops** | NP-009 (primary); NP-010, NP-011 (secondary) | **COVERED** |

### Persona Gaps

| Gap | Mitigation |
|-----|------------|
| **Auditor** has no dedicated MUST DO actor scenario | **Recommend NP-011 as S8 OPTIONAL → promoted to SHOULD DO** for Auditor closure. Fallback: mandatory Auditor E9 sign-off row on all 10 MUST DO execution reports. |
| **Reviewer** not primary in export/handoff scenarios | Acceptable — Reviewer role is read-heavy; NP-007 provides explicit review-tier false PASS check. |

---

## 6. Carry-over Alignment

| Item | Covered by S8? | How |
|------|----------------|-----|
| **TD-7B-003** | **Yes — test, do not fix** | NP-003, NP-004, NP-006, NP-007 exercise export/readiness/handoff layer separation. E7/E9 must document layer behavior. PASS WITH WARNING max if SIM-007-equivalent gap reproduced. Code alignment fix = **S9 Production Hardening** candidate. |
| **M-03** | **Yes — observe, do not fix** | All rejection scenarios (NP-002, NP-004, NP-010, NP-012). E4 captures rejections; E8 may under-represent. E9 must compare E4 vs E8 and note M-03 gap. Fix deferred **S9 Production Hardening**. |
| **M-07** | **Yes — observe, do not fix** | NP-012 cross-user race. E9 uses BOQ Version ID + persona timestamps for correlation. Document traceId limitation. Fix deferred **S9 Production Hardening**. |
| **TD-7A-009** | **Yes — monitor, do not fix** | NP-001, NP-002, NP-005, NP-012 authority interpretation. Log ambiguity in E9; do not resolve unless scenario blocked. Consolidation = S9 or Before S10. |

No carry-over item blocks S8 execution planning.

---

## 7. Evidence Requirements (Planned Execution Scenarios)

Minimum evidence per **S8 MUST DO** scenario. Optional scenarios included for completeness.

| Scenario | Required Evidence | Special Requirements |
|----------|-------------------|----------------------|
| **NP-001** | E1, E3, E4 (both attempts), E8, E9 | E4 attempt numbering; E3 shows single effective advance |
| **NP-002** | E1, E3, E4 (403), E8, E9 | **STOP** if E4 shows 200. TD-7A-009 note if authority ambiguous |
| **NP-003** | E1, E2 (BLOCK codes), E6 (Blocked), E7 (400/no artifacts), E9 | TD-7B-003 section in E9 if export/handoff tier diverges |
| **NP-004** | E1, E2, E5 (0 records), E4 (403), E6, E7, E9 | TD-7B-003: document E6/E7 vs E5 at attempt time |
| **NP-005** | E1, E2 (post-edit), E3 (lock/approval state), E4, E7 (blocked export), E9 | E2 must post-date edit action |
| **NP-006** | E1, E3 (revoke event), E4, E7 (blocked export), E6, E9 | E7 attempt must occur **after** E3 revoke timestamp |
| **NP-007** | E1, E2 (Warning + BLOCK codes), E6 (Blocked not Ready), E7 (blocked if export attempted), E9 | E2 BLOCK count vs E6 tier cross-check — **CRITICAL** |
| **NP-008** | E1, E2 (all BLOCK codes listed), E3, E6, E9 | E2 must enumerate every BLOCK cause; no partial advance in E3 |
| **NP-009** | E1, E2 (pre- and post-edit snapshots), E6, E9 | **Special:** E2 timestamp after last Engineer edit; Admin/Ops recovery narrative. Compare E1 payload hash vs E2 fields |
| **NP-010** | E1, E4 (sequential attempts), E3, E8, E9 | M-03: E4 vs E8 rejection row comparison |
| **NP-011** | E1–E8 bundle, E9, execution report | **Special:** deliberate ID mismatch detection; contamination deny-list sweep |
| **NP-012** | E1, E3, E4, E5, E6, E7, E8, E9 | **Special:** E9 persona timestamp sequence for concurrent actions; M-07 trace note |

### E1–E9 Minimum by Layer (All MUST DO)

| Layer | Artifacts |
|-------|-----------|
| Seed / identity | E1 (unique BOQ Version ID; no Sprint 7 reuse) |
| Validation | E2 after each material persona action |
| Workflow | E3 ordered action log |
| Action attempts | E4 including **failed** attempts |
| Handoff (if applicable) | E5 |
| Readiness | E6 aligned with E2 BLOCK state |
| Export (if applicable) | E7 |
| Audit | E8 + M-03 gap note in E9 |
| Narrative | E9 persona sequence + false PASS checklist |

---

## 8. Scenario Grouping Rationale

| Group | Scenarios | Rationale |
|-------|-----------|-----------|
| **Authority & approval** | NP-001, NP-002, NP-005, NP-006 | Builds on SIM-006 and SIM-001 baselines; establishes approval boundary before export layer |
| **Export & handoff gates** | NP-003, NP-004, NP-007 | Exercises TD-7B-003 layer behavior; export/handoff negative paths |
| **Validation & readiness** | NP-008, NP-009 | Multi-block and stale-state — highest silent false PASS class |
| **Concurrency** | NP-012 | Requires proven single-user negatives first |
| **Governance optional** | NP-010, NP-011 | Retry/idempotency and contamination drill if capacity remains |

Detail: [S8_EXECUTION_WAVES.md](S8_EXECUTION_WAVES.md) · Priority: [S8_EXECUTION_PRIORITY.md](S8_EXECUTION_PRIORITY.md)

---

## 9. Scope Control Confirmation

| Activity | S8-2 Status |
|----------|-------------|
| Scenario matrix & classification | **Complete** (this document) |
| Simulation execution | **NOT AUTHORIZED** |
| Scenario seed / runner | **NOT AUTHORIZED** |
| Official E1–E9 creation | **NOT AUTHORIZED** |
| Code / workflow / validation changes | **NOT AUTHORIZED** |
| Production Readiness claim | **NOT CLAIMED** |
| MVP Freeze claim | **NOT CLAIMED** |

---

## 10. Final Recommendation

### **READY FOR S8-3**

| Criterion | Status |
|-----------|--------|
| All 12 NP scenarios classified | **Complete** |
| 10 MUST DO + 2 OPTIONAL defined | **Complete** |
| Execution waves assigned with rationale | **Complete** — see [S8_EXECUTION_WAVES.md](S8_EXECUTION_WAVES.md) |
| False PASS priority ranked | **Complete** — see [S8_FALSE_PASS_PRIORITY_REGISTER.md](S8_FALSE_PASS_PRIORITY_REGISTER.md) |
| Persona coverage | **Complete with condition** — NP-011 recommended for Auditor |
| Carry-over alignment | **Complete** — test/observe only; no silent close |
| Evidence minimum defined | **Complete** |
| S8-3 first official co-worker simulation prep | **Authorized to plan** (seed design, execution gate — still no official runs until S8-3 gate) |

Sprint 8 execution order is clear. The team may proceed to **S8-3** co-worker simulation preparation.

End of Sprint 8 Negative Path Scenario Matrix.
