# Technical Debt Register — HUB IT BOQ V3

Last updated: Sprint 7A Rev.1 / S7B-0 Baseline Reconciliation
Principle: **No Evidence = Not Done** · **Governance before Automation**

Status legend: `OPEN` · `IN PROGRESS` · `CLOSED` · `ACCEPTED (carry to S7B)`

| TD ID | Title | Owner | Action | Evidence to Close | Status |
|-------|-------|-------|--------|-------------------|--------|
| TD-7A-001 | Typecheck not green | Platform | Restore SSOT + governance module, clear stale build cache | `npm run typecheck` exit 0 | **CLOSED** (exit 0, re-applied via shell) |
| TD-7A-002 | `validation-rules.ts` truncated to cost-only | Validation | Restore full SSOT (DOC/DISCIPLINE/COST/GOVERNANCE + gate sets) | file `src/lib/validations/validation-rules.ts` + `tests/validation-rules.test.ts` | **CLOSED** |
| TD-7A-003 | `workflow-governance.ts` missing | Validation | Create governance module + re-export | file `src/lib/validations/workflow-governance.ts` + import resolves + `tests/workflow-governance.test.ts` | **CLOSED** |
| TD-7A-004 | Audit Framework not wired | Backend | Wire `auditService.append` into approval/handoff/validation | **runtime `audit_logs` rows from executed flow** | **IN PROGRESS** (code wired; runtime evidence pending S7B) |
| TD-7A-005 | Export BLOCK gate not enforced | Reporting | Block export on unresolved BLOCK; route → 400 | **captured 400 response for BLOCKed export** | **IN PROGRESS** (code wired; runtime evidence pending S7B) |
| TD-7A-006 | Readiness Warning tier missing (binary Ready/Not Ready) | Readiness | Add 3-tier Ready/Warning/Blocked aggregate + surface | test/screenshot/API of Warning tier | **OPEN** (carry to S7B-0) |
| TD-7A-007 | Test count claim (64+) unverified, no master snapshot | QA | Establish VCS baseline snapshot; reconcile count | git snapshot diff vs current | **OPEN** (measured = 59; no VCS/master snapshot exists to reconcile against) |
| TD-7A-008 | Stale `.next` types + `_tmp` recovery cruft | Platform | Remove `_tmp`, clear `.next` cache | `_tmp` removed, typecheck clean | **CLOSED** |
| TD-7A-009 | Dual workflow model drift (`workflow-authority` vs governance) | Architecture | Consolidate stage model; single source | design note + refactor + tests | **ACCEPTED (carry to S7B)** |
| TD-7A-010 | Handoff target schema absent (`handoff_records` has no `handoff_target`) | Backend | Decide handoff target model; migration + test | schema/migration + test | **OPEN** (carry to S7B-0) |
| TD-7A-011 | Reporting Governance uses `REPORT_*` not `GOV_*` (SSOT naming mismatch) | Reporting | Reconcile rule naming/spec; document SSOT | rule path + naming decision | **OPEN** (carry to S7B-0) |

## Reconciliation evidence (S7B-0, re-applied via shell)
- `npm run typecheck` → **exit 0**
- `npm test` → **59 passed / 9 files** (exit 0)
- No new approval/validation/readiness logic outside existing frameworks. Audit append-only guard untouched.
