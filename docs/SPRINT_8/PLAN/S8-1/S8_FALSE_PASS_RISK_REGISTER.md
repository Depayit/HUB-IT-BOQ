# Sprint 8 False PASS Risk Register

| Field | Value |
|-------|-------|
| System | HUB IT BOQ V3 |
| Sprint | 8-1 — Detailed Co-worker Persona & Negative Path Planning |
| Document type | **PLAN / GOVERNANCE / DOCUMENTATION ONLY** |
| Branch | `s7b-sprint-7-closure` |
| HEAD at plan | `8826278c94e824d8c72c26e6d1d9e1eac2da560b` |
| Parent plan | [S8_SIMULATION_PLAN.md](S8_SIMULATION_PLAN.md) |
| Negative path library | [S8_NEGATIVE_PATH_LIBRARY.md](S8_NEGATIVE_PATH_LIBRARY.md) |
| Generated | 2026-06-12 |
| Status | **Register only — manual detection in S8; AI-04 deferred to BOQ V2** |

---

## 1. Purpose

Catalog false PASS mechanisms for Sprint 8 co-worker simulation. Mitigation via E2/E4/E6/E7/E8/E9 cross-check and stop-on-fail.

---

## 2. Severity Legend

| Severity | Action |
|----------|--------|
| **CRITICAL** | STOP immediately |
| **HIGH** | STOP or PASS WITH WARNING with PO disposition |
| **MEDIUM** | Document in E9 |

---

## 3. False PASS Risk Register

| Risk ID | Scenario | False PASS Mechanism | Mitigation |
|---------|----------|----------------------|------------|
| **FP-001** | NP-009 | **Stale data** — E2 Pass / E6 Ready after edit without re-validation | E2 timestamp after last edit; compare E2 with E1 payload |
| **FP-002** | NP-002 | **Wrong approval** — unauthorized role HTTP 200 | E4 shows 403; E3 unchanged; STOP |
| **FP-003** | NP-001 | **Wrong approval (duplicate)** — second approve advances stage | E4 attempt log; E3 single advance |
| **FP-004** | NP-003 | **Export mismatch** — export 200 while validation BLOCK | E7 no artifacts; E6 Blocked |
| **FP-005** | NP-004 | **Handoff mismatch** — handoff record without target | E5 = 0 records; E4 shows 403 |
| **FP-006** | NP-003/004 | **Handoff/export layer mismatch (TD-7B-003)** — reported full PASS without warning | E9 TD-7B-003 section; PASS WITH WARNING max |
| **FP-007** | NP-006 | **Export mismatch (revoke)** — export after approval revoked | E3 revoke before E7; export blocked |
| **FP-008** | NP-007 | **Stale tier logic** — E6 Ready when E2 has BLOCK | Cross-check E2 BLOCK vs E6 |
| **FP-009** | NP-005 | **Export mismatch (stale approved)** — export uses pre-edit snapshot | E2 post-edit; E7 blocked |
| **FP-010** | NP-011 | **Evidence mismatch** — E1 ID ≠ E7/E8 ID | Contamination deny-list; Auditor checklist |
| **FP-011** | All | **BOQ Version contamination** — Sprint 7 ID in S8 E1 | Deny-list in S8_EVIDENCE_STRATEGY §6 |
| **FP-012** | NP-010 | **Retry contamination** — retry succeeds without state fix | E4 sequential attempts; E3 unchanged |
| **FP-013** | NP-002/010 | **Audit mismatch (M-03)** — E8 omits rejections in E4 | E9 M-03 note; compare E4 vs E8 |
| **FP-014** | NP-012 | **Race false PASS** — concurrent actions inconsistent E3/E7 | E9 timestamp sequence; STOP |
| **FP-015** | NP-008 | **Partial block** — workflow advances with BLOCK remaining | E2 lists all BLOCK codes |
| **FP-016** | NP-012 | **Trace gap (M-07)** — race hard to correlate | E9 persona timestamps; defer requestId S9 |
| **FP-017** | Admin/Ops | **Prior SIM evidence reused** — E1 copied from closed SIM | Fresh seed attestation |
| **FP-018** | NP-007 | **Report vs runtime conflict** — E7 Ready while E6 Blocked | E6/E7 cross-check in E9 |

---

## 4. Required Mechanism Coverage

| Mechanism | Risk ID(s) |
|-----------|------------|
| Stale data | FP-001, FP-008, FP-009 |
| Wrong approval | FP-002, FP-003 |
| Export mismatch | FP-004, FP-007, FP-009, FP-018 |
| Handoff mismatch | FP-005, FP-006 |
| Evidence mismatch | FP-010, FP-011 |
| Retry contamination | FP-012 |
| BOQ Version contamination | FP-011, FP-017 |
| Audit mismatch | FP-013 |

**Coverage: 8/8 required mechanisms registered.**

---

## 5. Top 5 Risks

| Rank | ID | Mechanism | Scenario |
|------|-----|-----------|----------|
| 1 | FP-002 | Unauthorized approve 200 | NP-002 |
| 2 | FP-004 | Export 200 while BLOCK | NP-003 |
| 3 | FP-001 | Stale validation / cached Ready | NP-009 |
| 4 | FP-014 | Cross-user race inconsistent state | NP-012 |
| 5 | FP-006 | TD-7B-003 mismatch as full PASS | NP-003, NP-004 |

---

## 6. Carry-over Alignment

| ID | Treatment |
|----|-----------|
| TD-7B-003 | **Test in S8** — FP-006 PASS WITH WARNING max |
| M-03 | **Observe in S8** — **Defer fix S9** |
| M-07 | **Observe in S8** — **Defer fix S9** |

---

## 7. Verdict

False PASS register complete. **READY FOR S8-2**.

End of Sprint 8 False PASS Risk Register.
