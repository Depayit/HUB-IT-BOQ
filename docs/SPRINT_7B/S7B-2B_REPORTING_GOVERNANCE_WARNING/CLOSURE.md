# S7B-2B — Reporting Governance Warning Micro-fix Closure

| Field | Value |
|-------|-------|
| Scope | Add WARNING-tier reporting governance metadata rules for SIM-008 prep |
| Branch | `s7b-2b-reporting-governance-warning` |
| Commit | `e854759` |
| Generated | 2026-06-08 |

---

## 1. Summary

S7B-2B prepares the codebase for **SIM-008 — Reporting Governance Warning** by adding two WARNING rules through the Validation Engine SSOT:

- `GOV_REVISION_NUMBER`
- `GOV_READINESS_STATUS`

Missing report/export governance metadata now persists as **WARNING** (not BLOCK). Export remains allowed when `unresolved_block_count = 0`. Readiness aggregate becomes **Warning** when governance warnings exist and no BLOCK is present. Existing `REPORT_*` / `GOV_REPORT_*` BLOCK rules and `isReportExportBlocked` semantics are unchanged.

---

## 2. Scope

**In scope (completed):**

- Reporting governance WARNING evaluator SSOT
- Rule registry + persistence via `runValidation`
- Warning aggregator extension
- Unit / contract tests
- Evidence logs (typecheck + test)
- SIM-008 hook: `governanceMetadataOverrides` on `runValidation` + `buildReportingGovernanceMetadata` overrides

**Out of scope (preserved):**

- SIM-008 execution, seed, E1–E9
- Operational Readiness PASS claim
- Changes to SIM-001 / SIM-002 / SIM-004 evidence
- Export gate / readiness tier logic changes (already warning-tolerant from S7B-2A)

---

## 3. Files Changed

| File | Change |
|------|--------|
| [src/lib/validations/reporting-governance.ts](../../../src/lib/validations/reporting-governance.ts) | **NEW** — evaluator SSOT, metadata builder, overrides hook |
| [src/lib/validations/validation-rules.ts](../../../src/lib/validations/validation-rules.ts) | Register `GOV_REVISION_NUMBER`, `GOV_READINESS_STATUS` as WARNING |
| [src/lib/validations/validation-findings.ts](../../../src/lib/validations/validation-findings.ts) | `collectReportingGovernanceWarnings` + aggregator extension |
| [src/lib/services/validation.service.ts](../../../src/lib/services/validation.service.ts) | Wire governance warnings into `runValidation` |
| [src/lib/validations/reporting.ts](../../../src/lib/validations/reporting.ts) | Re-export governance WARNING codes (separate from `GOV_REPORT_*` BLOCK aliases) |
| [tests/reporting-governance-warning.test.ts](../../../tests/reporting-governance-warning.test.ts) | **NEW** — 12 S7B-2B contract tests |
| [tests/validation-rules.test.ts](../../../tests/validation-rules.test.ts) | +1 registry test for governance WARNING codes |
| [docs/SPRINT_7A/TECHNICAL_DEBT_REGISTER.md](../../../docs/SPRINT_7A/TECHNICAL_DEBT_REGISTER.md) | TD-7B-002 CLOSED |
| [docs/SPRINT_7B/S7B-2B_REPORTING_GOVERNANCE_WARNING/evidence/](evidence/) | typecheck + test evidence logs |

---

## 4. Rules Added

| Rule Code | Severity | Source / Function | Expected Use |
|-----------|----------|-------------------|--------------|
| `GOV_REVISION_NUMBER` | WARNING | `evaluateReportingGovernanceWarnings()` in `reporting-governance.ts` | Report/export governance metadata lacks revision number (`revision_number` / `boq_version_no`) |
| `GOV_READINESS_STATUS` | WARNING | `evaluateReportingGovernanceWarnings()` in `reporting-governance.ts` | Report/export governance metadata lacks readiness marker (`readiness_governance_marker` / `ready_status`) |

**Metadata mapping (existing fields, no new DB columns):**

| Governance field | Report/export canonical field |
|------------------|------------------------------|
| `revision_number` | `report.project.boq_version_no` ← `boq_versions.version_no` |
| `readiness_governance_marker` | export snapshot `ready_status` ← `deriveReadinessTier()` |

**SIM-008 hook:** `runValidation(boqVersionId, { governanceMetadataOverrides })` and `buildReportingGovernanceMetadata({ overrides })` allow future seed/execute to simulate incomplete governance metadata without schema migration.

---

## 5. Severity Mapping

```
Reporting content missing critical required data = BLOCK (existing REPORT_* / GOV_REPORT_*)
Reporting content complete but governance metadata incomplete = WARNING (GOV_REVISION_NUMBER / GOV_READINESS_STATUS)
```

Governance warnings evaluate only when `reportingGovernanceContentComplete === true` (no BLOCK failures in current validation run).

---

## 6. Export Gate Behavior

```
WARNING does not block export
BLOCK still blocks export
```

- `isReportExportBlocked(unresolvedBlockCount)` unchanged — blocks only when `unresolved_block_count > 0`
- Governance WARNING rows do not increment unresolved block count
- Future SIM-008 E7 can expose: `ready_status: "Warning"`, `warning_count: N`, `validation_status: "Pass"`, `unresolved_block_count: 0`

---

## 7. Readiness Behavior

Uses existing SSOT `deriveReadinessTier()`:

| Validation Result | Readiness |
|-------------------|-----------|
| 0 BLOCK, 0 WARNING | Ready |
| 0 BLOCK, >0 WARNING | Warning |
| >0 BLOCK | Blocked |

No separate readiness logic added in report/export services.

---

## 8. Tests & Evidence

| Check | Result | Evidence |
|-------|--------|----------|
| typecheck | **PASS** | [evidence/typecheck.log](evidence/typecheck.log) |
| npm test | **PASS** (16 files / 129 tests) | [evidence/test-summary.log](evidence/test-summary.log) |
| warning rule tests | **PASS** (12 tests) | [evidence/reporting-governance-warning-test.log](evidence/reporting-governance-warning-test.log) |
| export gate regression | **PASS** | `tests/export-gate.test.ts` (7 tests) — unchanged, green |
| S7B-2A regression | **PASS** | `tests/validation-warning-persistence.test.ts` (9 tests) — unchanged, green |
| GOV_REPORT_* regression | **PASS** | `tests/reporting-governance.test.ts` (10 tests) — unchanged, green |

**Test baseline delta:**

```
Previous baseline: 116 tests / 15 files (S7B-2A closure)
New baseline:      129 tests / 16 files
Delta:             +13 tests from tests/reporting-governance-warning.test.ts (+12) and tests/validation-rules.test.ts (+1)
```

---

## 9. Regression Check

| Scenario | Status |
|----------|--------|
| SIM-001 happy path (default metadata complete) | No new governance warnings on default `runValidation` path |
| SIM-002 / SIM-004 warning behavior | Existing cost/discipline WARNING tests remain green |
| `GOV_REPORT_*` / `REPORT_*` BLOCK aliases | Bijection tests pass |
| `isReportExportBlocked` | Unchanged; warning-only export allowed |
| `deriveReadinessTier` | Unchanged; governance warnings feed `open_warning_count` |

---

## 10. Architecture Drift Check

| Question | Answer |
|----------|--------|
| Validation logic outside SSOT? | **No** — evaluator in `reporting-governance.ts`, persisted via `validation.service.runValidation` |
| Reporting governance rules duplicated? | **No** — single evaluator; `GOV_REPORT_*` BLOCK aliases unchanged |
| Export gate uses SSOT predicate? | **Yes** — `isReportExportBlocked` in `reporting.ts` |
| Existing BLOCK rules intact? | **Yes** — `REPORT_*`, `GOV_REPORT_*`, approval/handoff BLOCK unchanged |
| Readiness uses SSOT? | **Yes** — `deriveReadinessTier` only |

**No new architecture drift introduced.**

---

## 11. Out of Scope Preserved

- SIM-008 **NOT STARTED**
- No seed SIM-008
- No `execute-sim-008-official.mjs`
- No E1–E9 for SIM-008
- No Operational Readiness PASS claim
- No edits to SIM-001 / SIM-002 / SIM-004 evidence
- TD-7A-011 **not reopened**

---

## 12. Final Recommendation

**S7B-2B PASS — ready for review + merge**

Next step after merge: plan and execute SIM-008 using `governanceMetadataOverrides` hook — not in this branch.

End of CLOSURE.md
