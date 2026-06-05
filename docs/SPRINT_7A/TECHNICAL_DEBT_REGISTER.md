# Technical Debt Register — HUB IT BOQ V3

Last updated: Sprint 7A Rev.1 / S7B-0 Baseline Reconciliation (gates cleared)
Principle: **No Evidence = Not Done** · **Governance before Automation**

Status legend: `OPEN` · `IN PROGRESS` · `CLOSED` · `ACCEPTED (carry to S7B)`

| TD ID | Title | Owner | Action | Evidence to Close | Status |
|-------|-------|-------|--------|-------------------|--------|
| TD-7A-001 | Typecheck not green | Platform | Restore SSOT + governance module, clear stale build cache | `npm run typecheck` exit 0 | **CLOSED** (exit 0, re-applied via shell) |
| TD-7A-002 | `validation-rules.ts` truncated to cost-only | Validation | Restore full SSOT (DOC/DISCIPLINE/COST/GOVERNANCE + gate sets) | file `src/lib/validations/validation-rules.ts` + `tests/validation-rules.test.ts` | **CLOSED** |
| TD-7A-003 | `workflow-governance.ts` missing | Validation | Create governance module + re-export | file `src/lib/validations/workflow-governance.ts` + import resolves + `tests/workflow-governance.test.ts` | **CLOSED** |
| TD-7A-004 | Audit Framework not wired | Backend | Wire `auditService.append` into approval/handoff/validation | `tests/audit-service.test.ts` (E5) — append payload + correction + immutability; live rows during SIM-001 | **CLOSED** (wired + test evidence; live rows = execution-time) |
| TD-7A-005 | Export BLOCK gate not enforced | Reporting | Block export on unresolved BLOCK; route → 400 | `tests/export-gate.test.ts` (E6) — blocked→throw→route 400; SSOT `isReportExportBlocked` | **CLOSED** (enforced + test evidence; live 400 = execution-time) |
| TD-7A-006 | Readiness Warning tier missing (binary Ready/Not Ready) | Readiness | Add 3-tier Ready/Warning/Blocked aggregate + surface | `src/lib/validations/readiness.ts` + `tests/readiness.test.ts` (E7); wired into summary report | **CLOSED** |
| TD-7A-007 | Test count claim (64+) unverified | QA | Establish VCS baseline snapshot; reconcile count | git commit --trailer "Co-authored-by: Cursor <cursoragent@cursor.com>" 128761b (9 test files / 59 tests) | **CLOSED** (snapshot established; count reconciled to 59) |
| TD-7A-008 | Stale `.next` types + `_tmp` recovery cruft | Platform | Remove `_tmp`, clear `.next` cache | `_tmp` removed, typecheck clean | **CLOSED** |
| TD-7A-009 | Dual workflow model drift (`workflow-authority` vs governance) | Architecture | Consolidate stage model; single source | design note + refactor + tests | **ACCEPTED (carry to S7B)** |
| TD-7A-010 | Handoff target schema absent (`handoff_records` has no `handoff_target`) | Backend | Decide handoff target model; migration + test | enum `handoff_target` + field + migration `0003_handoff_target` + `src/lib/validations/handoff.ts` + `tests/handoff.test.ts` (E9) | **CLOSED** |
| TD-7A-011 | Reporting Governance uses `REPORT_*` not `GOV_*` (SSOT naming mismatch) | Reporting | Reconcile rule naming/spec; document SSOT | `GOV_*` SSOT mapping `REPORT_TO_GOV` in `reporting.ts` + `tests/reporting-governance.test.ts` (E8) | **CLOSED** |

## Reconciliation evidence (S7B-0, all 5 remaining gates cleared)
- `npm run typecheck` → **exit 0** (E3)
- `npm test` → **82 passed / 14 files** (exit 0) (E4)
- New SSOT modules: `validations/readiness.ts` (3-tier), GOV_* mapping in `validations/reporting.ts`, `validations/handoff.ts` + enum/field/migration `0003_handoff_target` (prisma client regenerated).
- Per-gate evidence logs: E5 audit, E6 export-block, E7 readiness, E8 reporting-governance, E9 handoff (`docs/SPRINT_7A/evidence/`).
- No new approval/validation/readiness logic outside existing frameworks. Audit append-only guard untouched. No SIM executed; no operational-readiness PASS claimed.
- Open carry-overs to S7B: **TD-7A-009** (dual workflow model) ACCEPTED; live runtime confirmation for audit rows + HTTP 400 to be captured during SIM-001.
