# Technical Debt Register — HUB IT BOQ V3

Last updated: Sprint 7A Rev.1 / S7B-0 Baseline Reconciliation
Principle: **No Evidence = Not Done** · **Governance before Automation**

Status legend: `OPEN` · `IN PROGRESS` · `CLOSED` · `ACCEPTED (carry to S7B)`

| TD ID | Title | Owner | Action | Evidence to Close | Status |
|-------|-------|-------|--------|-------------------|--------|
| TD-7A-001 | Typecheck not green | Platform | Restore SSOT + governance module, clear stale build cache | `npm run typecheck` exit 0 | **CLOSED** (exit 0, re-applied via shell) |
| TD-7A-002 | `validation-rules.ts` truncated to cost-only | Validation | Restore full SSOT (DOC/DISCIPLINE/COST/GOVERNANCE + gate sets) | file `src/lib/validations/validation-rules.ts` + `tests/validation-rules.test.ts` | **CLOSED** |
| TD-7A-003 | `workflow-governance.ts` missing | Validation | Create governance module + re-export | file `src/lib/validations/workflow-governance.ts` + import resolves + `tests/workflow-governance.test.ts` | **CLOSED** |
| TD-7A-004 | Audit Framework not wired | Backend | Wire `auditService.append` into approval/handoff/validation | **runtime `audit_logs` rows from executed flow** | **CLOSED** (S7B-0 contract test — `tests/audit-service.test.ts` 6 tests PASS; cite `docs/SPRINT_7B/S7B-0_GATE_CLOSURE/evidence/TD-7A-004-audit-test.log`; commit `f2fe30f`) |
| TD-7A-005 | Export BLOCK gate not enforced | Reporting | Block export on unresolved BLOCK; route → 400 | **captured 400 response for BLOCKed export** | **CLOSED** (S7B-0 — `export.service` throws `AppError(EXPORT_BLOCKED, 400)`; route handler maps to HTTP 400 + body `code`; `tests/export-gate.test.ts` 6 tests PASS; cite `docs/SPRINT_7B/S7B-0_GATE_CLOSURE/evidence/TD-7A-005-export-gate-test.log`; commit `fb791b0`) |
| TD-7A-006 | Readiness Warning tier missing (binary Ready/Not Ready) | Readiness | Add 3-tier Ready/Warning/Blocked aggregate + surface | test/screenshot/API of Warning tier | **CLOSED** (S7B-0 — `src/lib/validations/readiness.ts` 3-tier SSOT wired into summary report; `tests/readiness.test.ts` 10 tests PASS; cite `docs/SPRINT_7B/S7B-0_GATE_CLOSURE/evidence/TD-7A-006-readiness-test.log`; commit `c621596`) |
| TD-7A-007 | Test count claim (64+) unverified | QA | Establish VCS baseline snapshot; reconcile count | git commit --trailer "Co-authored-by: Cursor <cursoragent@cursor.com>" 128761b (9 test files / 59 tests) | **CLOSED** (snapshot established; count reconciled to 59) |
| TD-7A-008 | Stale `.next` types + `_tmp` recovery cruft | Platform | Remove `_tmp`, clear `.next` cache | `_tmp` removed, typecheck clean | **CLOSED** |
| TD-7A-009 | Dual workflow model drift (`workflow-authority` vs governance) | Architecture | Consolidate stage model; single source | design note + refactor + tests | **ACCEPTED (carry to S7B)** |
| TD-7A-010 | Handoff target schema absent (`handoff_records` has no `handoff_target`) | Backend | Decide handoff target model; migration + test | schema/migration + test | **CLOSED** (S7B-0 — `prisma/migrations/0004_handoff_target/migration.sql` applied; `src/lib/validations/handoff.ts` SSOT; `tests/handoff.test.ts` 7 tests PASS; cite `docs/SPRINT_7B/S7B-0_GATE_CLOSURE/evidence/TD-7A-010-handoff-test.log`; commit `5ade0be`) |
| TD-7A-011 | Reporting Governance uses `REPORT_*` not `GOV_*` (SSOT naming mismatch) | Reporting | Reconcile rule naming/spec; document SSOT | rule path + naming decision | **CLOSED** (S7B-0 — `GOV_REPORTING_RULE_CODES` + bijective `REPORT_TO_GOV`/`GOV_TO_REPORT` SSOT in `reporting.ts`; `isReportExportBlocked` predicate consumed by `export.service.ts`; `tests/reporting-governance.test.ts` 10 tests PASS; cite `docs/SPRINT_7B/S7B-0_GATE_CLOSURE/evidence/TD-7A-011-governance-test.log`; commit `dd85db4`) |
| TD-7B-002 | Reporting Governance Warning metadata rules (`GOV_REVISION_NUMBER`, `GOV_READINESS_STATUS`) | Reporting | Add WARNING-tier governance metadata rules + persistence + tests | evaluator SSOT + `runValidation` wire + tests green | **CLOSED** (S7B-2B — `src/lib/validations/reporting-governance.ts`; `GOV_REVISION_NUMBER` / `GOV_READINESS_STATUS` in `validation-rules.ts`; `tests/reporting-governance-warning.test.ts` 12 tests PASS; cite `docs/SPRINT_7B/S7B-2B_REPORTING_GOVERNANCE_WARNING/evidence/test-summary.log`; branch `s7b-2b-reporting-governance-warning`) |

## Reconciliation evidence (S7B-0, re-applied via shell)
- `npm run typecheck` → **exit 0**
- `npm test` → **59 passed / 9 files** (exit 0)
- No new approval/validation/readiness logic outside existing frameworks. Audit append-only guard untouched.

## Pre-Gate Diagnostic Run (INC-S7B-002)
> **Diagnostic only. Not valid for official Sprint 7B PASS evidence.**
- Diagnostic report: `docs/SPRINT_7B/PRE_GATE_DIAGNOSTIC/SIM-001-DIAGNOSTIC.md`
- Diagnostic evidence: `docs/SPRINT_7B/PRE_GATE_DIAGNOSTIC/evidence-SIM-001/` — captured during run executed before Entry Gate cleared (5 FAIL still BLOCKED at run time)
- Incident record: `docs/INCIDENTS/INC-S7B-002.md`
- ไม่ใช้เป็น evidence ปิด TD ใด ๆ

## S7B-0 Baseline Reconciliation Gate Closure (branch `s7b-0-gate-closure`)
- Closure summary: `docs/SPRINT_7B/S7B-0_GATE_CLOSURE/CLOSURE.md`
- Baseline (5 FAIL immutable): `docs/SPRINT_7B/S7B-0_GATE_CLOSURE/BASELINE.md`
- Re-check (post-closure 11/11): `docs/SPRINT_7B/S7B-0_GATE_CLOSURE/RE-CHECK.md`
- TD-7A-004/005/006/010/011 closed via contract tests + code/migration/SSOT (no SIM execution); evidence logs in `docs/SPRINT_7B/S7B-0_GATE_CLOSURE/evidence/`
- TD-7A-009 still ACCEPTED carry to S7B (out of scope for Phase B)

## Register summary (TD-7A-001..011)

→ **10 CLOSED + 1 ACCEPTED + 0 OPEN / IN PROGRESS**
