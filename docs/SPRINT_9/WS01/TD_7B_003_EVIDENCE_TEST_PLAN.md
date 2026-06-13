# TD-7B-003 Evidence and Test Plan — HUB IT BOQ V3

| Field | Value |
|-------|-------|
| System | HUB IT BOQ V3 |
| Sprint | 9-1B — WS-01A |
| Deliverable | Evidence and Test Plan |
| Document type | **GOVERNANCE / TEST STRATEGY ONLY** |
| Generated | 2026-06-13 |
| Parent analysis | [TD_7B_003_DISPOSITION_ANALYSIS.md](TD_7B_003_DISPOSITION_ANALYSIS.md) |
| Rollback reference | [ROLLBACK_TRIGGER_MATRIX.md](../WS07/ROLLBACK_TRIGGER_MATRIX.md) |
| Stop reference | [PRODUCTION_STOP_CONDITIONS.md](../WS07/PRODUCTION_STOP_CONDITIONS.md) |

---

## 1. Purpose

Define **test strategy** for WS-01B implementation. **No tests executed in WS-01A.**

Goals:

- SIM-007 proof not regressed
- NP-004 disposition correctly reflected (preserved or re-baselined)
- Export, handoff, reporting consistent
- False PASS count remains 0

---

## 2. Test Strategy by Signed Option

| Signed option | Primary regression | NP-004 expected change |
|---------------|-------------------|------------------------|
| **Option A** | Export blocked when handoff incomplete | `export_succeeded: false` |
| **Option B** | Visibility labels; behavior unchanged | `export_succeeded: true` preserved |
| **Option C** | Summary = NP-004; handoff mode blocked | Preserved + new handoff-mode scenario |

---

## 3. Regression Test Matrix

| Test ID | Test | Purpose | Expected (Option B baseline) | Expected (Option A) | Evidence |
|---------|------|---------|------------------------------|---------------------|----------|
| T-01 | SIM-007 replay | Handoff blocks missing target | HANDOFF_TARGET_REQUIRED; 0 records | Same + export blocked | `docs/SPRINT_9/WS01/evidence/SIM-007-rerun/` |
| T-02 | NP-004 replay | TD-7B-003 disposition | Handoff blocked; export succeeds | Export blocked | `docs/SPRINT_9/WS01/evidence/NP-004-rerun/` |
| T-03 | NP-003 | Export while BLOCK | EXPORT_BLOCKED; E6 Blocked | Same | NP-003 pattern |
| T-04 | NP-006 | Export after revoke | EXPORT_BLOCKED | Same | NP-006 pattern |
| T-05 | Happy path export | Clean validation + handoff complete | Export succeeds | Export when handoff complete | New seed path |
| T-06 | Warning path export | WARNING, no BLOCK | Export allowed | Per signed rules | NP-007-class |
| T-07 | Blocked validation export | Unresolved BLOCK | EXPORT_BLOCKED | Same | NP-003 |
| T-08 | Handoff target missing | `createHandoff` without target | HANDOFF_TARGET_REQUIRED | Same | NP-004 E5 |
| T-09 | Export after handoff blocked | Export after handoff rejection | Export succeeds (B); labels validation-only | Export blocked (A) | NP-004 E7 |
| T-10 | Reporting / readiness display | E6/E7 consistency | Composite handoff-not-ready shown | E6 not Ready when handoff incomplete | E6, E7 JSON |
| T-11 | E2/E6/E7 consistency | Cross-artifact alignment | E2 Pass → E6 Ready → E7 layer documented | All layers aligned | Compare artifacts |
| T-12 | Audit evidence | Rejection paths (M-03) | E4 capture; E8 per M-03 | Export rejection if blocked | E4, E8 |

### Option C additional tests

| Test ID | Test | Expected | Evidence |
|---------|------|----------|----------|
| T-C01 | Summary export mode | Same as NP-004 | E7 `export_mode: summary` |
| T-C02 | Handoff export — incomplete | Blocked | E7 `export_mode: handoff`, blocked |
| T-C03 | Handoff export — complete | Succeeds | E7 + E5 record |

---

## 4. Unit / Integration Test Expectations

| Area | Existing | WS-01B additions |
|------|----------|------------------|
| Export gate | `tests/export-gate.test.ts` | Per signed option |
| Handoff guard | `tests/handoff.test.ts` | Unchanged (B); handoff-export (C) |
| Readiness | `tests/readiness.test.ts` | Composite (B) or unified (A) |
| Reporting | `tests/reporting-governance.test.ts` | Label/mode tests |

**Baseline:** 131/131 tests PASS at Sprint 8 Wave 2 E0.

---

## 5. Stop-on-Fail Criteria

| Condition | Stop ID |
|-----------|---------|
| Export 200 while validation BLOCK | SC-09 |
| Wrong-role approve returns 200 | SC-04 |
| Handoff succeeds with missing target | SC-02 |
| Silent false PASS on NP-004 re-run | SC-05 |
| TD closed without sign-off + evidence | SC-10 |
| Rollback drill fails (A/C) | SC-06 |

---

## 6. Rollback Triggers

| Trigger | RT-ID |
|---------|-------|
| Export regression | RT-001 |
| Handoff corruption | RT-002 |
| Readiness mismatch | RT-004 |
| Deploy without drill | RT-012 |

---

## 7. Regression Suite Expectation

| Phase | Minimum suite |
|-------|---------------|
| WS-01B pre-merge | T-03, T-04, T-08 + option primary (T-02 or T-09) |
| WS-01B pre-close | T-01..T-12 (+ T-C* if Option C) |
| CI | `npm test` + typecheck green |

Full NP-001..NP-012 re-run **not required** unless regression found.

---

## 8. Required Final Green Check Structure

Path: `docs/SPRINT_9/WS01/FINAL_GREEN_CHECK.md`

| Section | Content |
|---------|---------|
| 1 | E0 baseline |
| 2 | Signed option + sign-off ref |
| 3 | Test matrix T-01..T-12 |
| 4 | E1–E9 completeness |
| 5 | TD-7B-003 disposition |
| 6 | False PASS count = 0 |
| 7 | Stop-on-fail status |
| 8 | Governance non-claims |
| 9 | PASS / PASS WITH WARNING / HOLD |

---

## 9. Evidence Artifact Index (WS-01B Target)

| Artifact | Path |
|----------|------|
| Sign-off record | `docs/SPRINT_9/WS01/signoff/TD_7B_003_DECISION.md` |
| NP-004 re-run | `docs/SPRINT_9/WS01/evidence/NP-004-rerun/` |
| SIM-007 re-run | `docs/SPRINT_9/WS01/evidence/SIM-007-rerun/` |
| Layer SSOT (Option B) | `docs/SPRINT_9/WS01/TD_7B_003_LAYER_SSOT.md` |
| Final green check | `docs/SPRINT_9/WS01/FINAL_GREEN_CHECK.md` |

---

## 10. Governance Statements

| Claim | Status |
|-------|--------|
| Tests executed in WS-01A | **NO** |
| TD-7B-003 closed | **NOT CLAIMED** |

End of TD-7B-003 Evidence and Test Plan.
