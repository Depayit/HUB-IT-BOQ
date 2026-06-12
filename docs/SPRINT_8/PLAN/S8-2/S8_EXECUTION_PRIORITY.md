# Sprint 8 Execution Priority — Negative Path Scenarios

| Field | Value |
|-------|-------|
| System | HUB IT BOQ V3 |
| Sprint | 8-2 — Negative Path Scenario Matrix & Execution Prioritization |
| Document type | **PLAN / GOVERNANCE / DOCUMENTATION ONLY** |
| Branch | `s7b-sprint-7-closure` |
| HEAD at plan | `8826278c94e824d8c72c26e6d1d9e1eac2da560b` |
| Parent matrix | [S8_NEGATIVE_PATH_MATRIX.md](S8_NEGATIVE_PATH_MATRIX.md) |
| Execution waves | [S8_EXECUTION_WAVES.md](S8_EXECUTION_WAVES.md) |
| Generated | 2026-06-12 |
| Status | **Priority plan only — not executed** |

---

## 1. Purpose

Define execution priority order for Sprint 8 negative path scenarios. Priority reflects **risk to production trust**, **false PASS potential**, **Sprint 7 baseline coverage**, and **dependency order** (single-user before concurrency).

**No simulation execution is authorized by this document.**

---

## 2. Priority Tiers

| Tier | Meaning | Action |
|------|---------|--------|
| **P0 — Critical gate** | CRITICAL risk or CRITICAL false PASS; stop-on-fail | Execute in Wave 1–2; never defer |
| **P1 — High gate** | HIGH risk; core S8 proof | Execute in Wave 2; MUST DO |
| **P2 — Standard MUST DO** | Required closure; moderate risk | Execute in Wave 1–3 per wave plan |
| **P3 — OPTIONAL** | Capacity-dependent | Execute in Wave 4 if time remains |

---

## 3. Master Priority Ranking

Ranked by combined **operational risk + false PASS potential + Sprint 8 closure necessity**. Lower rank number = higher priority.

| Rank | Scenario | Tier | Risk | False PASS | Wave | Classification |
|------|----------|------|------|------------|------|----------------|
| 1 | **NP-002** | P0 | Critical | Critical | 1 | S8 MUST DO |
| 2 | **NP-003** | P0 | Critical | Critical | 2 | S8 MUST DO |
| 3 | **NP-006** | P0 | Critical | Critical | 2 | S8 MUST DO |
| 4 | **NP-007** | P0 | High | Critical | 2 | S8 MUST DO |
| 5 | **NP-009** | P0 | Critical | Critical | 3 | S8 MUST DO |
| 6 | **NP-012** | P0 | Critical | Critical | 3 | S8 MUST DO |
| 7 | **NP-004** | P1 | High | High | 2 | S8 MUST DO |
| 8 | **NP-005** | P1 | High | High | 2 | S8 MUST DO |
| 9 | **NP-001** | P2 | Medium | Medium | 1 | S8 MUST DO |
| 10 | **NP-008** | P2 | Medium | Medium | 1 | S8 MUST DO |
| 11 | **NP-011** | P3 | Medium | High | 4 | S8 OPTIONAL (SHOULD DO) |
| 12 | **NP-010** | P3 | Medium | Medium | 4 | S8 OPTIONAL |

---

## 4. Sprint Classification Summary

| Classification | Scenarios | Count |
|----------------|-----------|-------|
| **S8 MUST DO** | NP-001, NP-002, NP-003, NP-004, NP-005, NP-006, NP-007, NP-008, NP-009, NP-012 | **10** |
| **S8 OPTIONAL** | NP-010, NP-011 | **2** |
| **S9 Production Hardening** | M-03 fix, M-07 fix, TD-7B-003 code alignment (if scenario proves gap) | — |
| **Before S10** | TD-7A-009 consolidation (if ambiguity blocks interpretation) | — |
| **BOQ V2** | AI-01, AI-04 | — |
| **ERP / Procurement V2** | Downstream block propagation | — |
| **Not Now** | Full idempotency framework | — |

---

## 5. Deferral Decisions

| Scenario | Defer? | Rationale |
|----------|--------|-----------|
| NP-001..NP-009, NP-012 | **No — MUST DO** | Required for S8 closure per S8-0 cap and S8-1 library |
| NP-010 | **Defer if no capacity** | Retry behavior partially exercised by NP-001/NP-002/NP-004 rejection paths |
| NP-011 | **Defer only if Auditor E9 sign-off enforced on all MUST DO runs** | Contamination drill; strongly recommended for governance closure |
| TD-7B-003 code fix | **Defer to S9** | Test in S8; fix only if scenario outcome unacceptable |
| M-03 / M-07 fixes | **Defer to S9** | Observe and document in E9 |

---

## 6. Execution Sequence (Within S8-3+)

Recommended run order within waves (see [S8_EXECUTION_WAVES.md](S8_EXECUTION_WAVES.md)):

```
Wave 1:  NP-002 → NP-001 → NP-008
Wave 2:  NP-003 → NP-004 → NP-007 → NP-005 → NP-006
Wave 3:  NP-009 → NP-012
Wave 4:  NP-011 → NP-010  (optional)
```

**Gate between waves:** Delta review + stop-on-fail check. Do not start Wave 3 until Wave 2 P0 scenarios pass.

**Fresh seed rule:** Unique BOQ Version ID per scenario; no Sprint 7 SIM-001..008 ID reuse.

---

## 7. Stop-on-Fail Triggers by Priority

| Priority | Scenario | Stop Condition |
|----------|----------|----------------|
| P0 | NP-002 | Unauthorized role receives HTTP 200 on approve |
| P0 | NP-003 | Export HTTP 200 while validation BLOCK active (not TD-7B-003 handoff-only documented case) |
| P0 | NP-006 | Export HTTP 200 after approval revoked |
| P0 | NP-007 | E6 Ready tier with unresolved BLOCK in E2 |
| P0 | NP-009 | E2 Pass or E6 Ready from stale cache after data change |
| P0 | NP-012 | Double approval advance or race export succeeds inconsistently |
| P1 | NP-004 | Handoff record created without valid target |
| P1 | NP-005 | Export succeeds on invalidated post-edit approval state |

---

## 8. Dependency Map

```
Sprint 7 baseline (SIM-001..008)
        │
        ▼
Wave 1 ─ NP-002 (authority) ─ NP-001 (duplicate) ─ NP-008 (multi-block)
        │
        ▼
Wave 2 ─ NP-003/004/007 (export/handoff/TD-7B-003) ─ NP-005/006 (state change)
        │
        ▼
Wave 3 ─ NP-009 (stale cache) ─ NP-012 (concurrency)
        │
        ▼
Wave 4 ─ NP-011 (contamination) ─ NP-010 (retry) [optional]
```

NP-012 **depends on** Wave 1–2 proving single-user gates. NP-009 **depends on** NP-008 establishing multi-block E2 baseline for comparison.

---

## 9. Verdict

Execution priority is defined. **10 MUST DO** scenarios are sequenced across 3 mandatory waves + 1 optional wave. **READY FOR S8-3** simulation preparation.

End of Sprint 8 Execution Priority.
