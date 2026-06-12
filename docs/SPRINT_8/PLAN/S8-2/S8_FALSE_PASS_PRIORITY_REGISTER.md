# Sprint 8 False PASS Priority Register

| Field | Value |
|-------|-------|
| System | HUB IT BOQ V3 |
| Sprint | 8-2 — Negative Path Scenario Matrix & Execution Prioritization |
| Document type | **PLAN / GOVERNANCE / DOCUMENTATION ONLY** |
| Branch | `s7b-sprint-7-closure` |
| HEAD at plan | `8826278c94e824d8c72c26e6d1d9e1eac2da560b` |
| S8-1 register | [S8_FALSE_PASS_RISK_REGISTER.md](S8_FALSE_PASS_RISK_REGISTER.md) |
| Parent matrix | [S8_NEGATIVE_PATH_MATRIX.md](S8_NEGATIVE_PATH_MATRIX.md) |
| Generated | 2026-06-12 |
| Status | **Priority register only — manual detection in S8 execution; AI-04 deferred to BOQ V2** |

---

## 1. Purpose

Rank NP scenarios by **likelihood of producing a false PASS** — a run that appears successful in summary evidence while violating governance rules. This register drives Wave 3 placement, E9 checklist emphasis, and stop-on-fail escalation.

Analysis basis: S8-1 FP-001..FP-018 mechanisms, Sprint 7 SIM baselines, TD carry-over impact, and co-worker simulation silent-failure patterns.

---

## 2. Ranking Methodology

| Factor | Weight |
|--------|--------|
| Silent failure (no obvious HTTP error) | High |
| Evidence layer disagreement (E2 vs E6 vs E7) | High |
| Sprint 7 baseline gap (no prior dedicated run) | Medium |
| TD-7B-003 documented gap vs unexpected success | Medium |
| M-03 audit under-reporting masking rejection | Medium |
| Execution complexity increasing miss probability | Medium |

**Severity action:** CRITICAL false PASS → STOP immediately. HIGH → STOP or PASS WITH WARNING with PO disposition.

---

## 3. False PASS Priority Ranking

| Rank | Scenario | Why Dangerous |
|------|----------|---------------|
| **1** | **NP-002** | Unauthorized role receiving HTTP 200 on approve is the highest-severity governance breach. A false PASS here means any co-worker could advance workflow without authority — undetectable from E6 alone without E4 inspection. SIM-006 baseline reduces likelihood but co-worker narrative adds retry/confusion vectors. |
| **2** | **NP-003** | Export HTTP 200 while validation BLOCK is active would ship invalid BOQ artifacts downstream. TD-7B-003 creates a secondary false PASS path: reporting export success while handoff layer blocked could be misclassified as full PASS instead of PASS WITH WARNING. |
| **3** | **NP-009** | Stale validation is the **most silent** false PASS class — UI and E6 may show Ready/Pass while E1 payload has changed. No failed HTTP response signals the defect. Requires timestamp and payload cross-check; easily missed in batch execution. |
| **4** | **NP-012** | Cross-user race can produce **internally inconsistent** E3/E7 states that each appear valid in isolation. Final state may look correct while an intermediate unauthorized advance occurred. M-07 trace gap increases correlation difficulty. |
| **5** | **NP-006** | Export after approval revoked mirrors NP-003 severity with added state-change timing ambiguity. E7 success after E3 revoke is CRITICAL STOP; false PASS means revoked BOQ reaches Procurement. |
| **6** | **NP-007** | E6 Ready tier coexisting with unresolved BLOCK in E2 is a tier-logic false PASS. Reviewer/Manager personas may trust summary tier without reading E2 detail — exactly the co-worker failure mode Sprint 8 must catch. |
| **7** | **NP-004** | Handoff record without valid target is CRITICAL STOP if it occurs. TD-7B-003 adds false PASS risk when E6/E7 show readiness/export success while E5 shows blocked handoff — must not upgrade to full PASS. |
| **8** | **NP-011** | Evidence BOQ Version ID mismatch across E1–E8 invalidates the entire proof bundle. False PASS occurs when Auditor accepts bundle without cross-artifact ID sweep — governance failure, not runtime failure. |
| **9** | **NP-005** | Post-approval edit with successful export on stale approved snapshot. Requires E2 post-edit freshness; false PASS if export uses pre-edit validation state. |
| **10** | **NP-001** | Duplicate approve advancing stage twice or corrupting audit. Lower silent-failure risk because second attempt typically returns visible rejection — but M-03 may hide rejection from E8. |
| **11** | **NP-008** | Partial BLOCK reporting — workflow advances while BLOCK codes remain. False PASS is visible if E2 is read; risk is incomplete E2 enumeration going unchecked. |
| **12** | **NP-010** | Retry succeeding without state fix (retry contamination). Medium risk; largely covered by NP-001/NP-002 rejection paths. M-03 amplifies audit false completeness. |

---

## 4. Top 5 Highest False PASS Scenarios

| Rank | Scenario | Mechanism | Primary Evidence Cross-check |
|------|----------|-----------|------------------------------|
| 1 | NP-002 | Wrong approval (200 to unauthorized role) | E4 HTTP status + E3 unchanged |
| 2 | NP-003 | Export mismatch (200 while BLOCK) | E2 BLOCK + E7 no artifacts + E6 Blocked |
| 3 | NP-009 | Stale data (cached Pass/Ready) | E2 timestamp vs last edit; E1 payload vs E2 fields |
| 4 | NP-012 | Race false PASS (inconsistent concurrent state) | E9 timestamp sequence; E3 final vs E4 attempt log |
| 5 | NP-006 | Export mismatch after revoke | E3 revoke event before E7 attempt |

---

## 5. Scenario ↔ False PASS Mechanism Map

| Mechanism | Scenarios (rank order) |
|-----------|------------------------|
| **Stale data** | NP-009, NP-007, NP-005 |
| **Wrong approval** | NP-002, NP-001 |
| **Export mismatch** | NP-003, NP-006, NP-005, NP-007 |
| **Handoff mismatch** | NP-004, NP-003 (TD-7B-003) |
| **Evidence mismatch** | NP-011, all runs (contamination) |
| **Retry contamination** | NP-010, NP-001 |
| **BOQ Version contamination** | NP-011, all runs (E1 deny-list) |
| **Audit mismatch (M-03)** | NP-002, NP-010, NP-012, all rejection paths |

All 8 required mechanisms from S8-1 §4 are covered.

---

## 6. E9 Checklist Emphasis by Rank

Scenarios ranked 1–5 require **expanded E9 False PASS section** with explicit STOP triggers checked before verdict:

| Rank | Mandatory E9 Checks |
|------|---------------------|
| 1–2 | Role authorization; Export gate |
| 3 | Cache freshness; E2 timestamp after last edit |
| 4 | E3/E7 consistency under concurrency; persona timestamp sequence |
| 5 | E3 revoke before E7; export blocked after revoke |

Scenarios ranked 6–8 require TD-7B-003 and tier cross-check sections.

---

## 7. Carry-over False PASS Interactions

| Item | False PASS Interaction | Register Impact |
|------|------------------------|-----------------|
| **TD-7B-003** | NP-003, NP-004, NP-007 may produce **documented** layer mismatch — false PASS only if reported as full PASS | Ranks 2, 7 — PASS WITH WARNING max |
| **M-03** | E8 completeness false PASS on all rejection scenarios | Amplifies ranks 1, 10, 12 |
| **M-07** | NP-012 correlation gap — not false PASS alone but increases miss risk | Amplifies rank 4 |
| **TD-7A-009** | NP-002 authority ambiguity could mask wrong-role success | Amplifies rank 1 |

---

## 8. Verdict

False PASS priority register complete. NP-009, NP-011, and NP-012 rank **3, 8, and 4** respectively — confirming they are top-tier concerns alongside NP-002 and NP-003. **READY FOR S8-3** with manual E9 detection (AI-04 deferred BOQ V2).

End of Sprint 8 False PASS Priority Register.
