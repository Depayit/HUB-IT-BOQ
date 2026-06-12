# NP-009 — E9 — Sprint 8 Wave 3

| Persona | Engineer + Admin/Ops |
| BOQ Version ID | 24533b31-da9e-4bf9-864b-4ed7f9ff8c47 |
| Action | Use stale validation after BOQ edit; Admin/Ops recovery re-validation |
| Expected | Stale detected; no silent false PASS; fresh validation blocks forward action |
| Actual | Stale detected; probe blocked; post-recovery tier=Blocked; blocks=CRITICAL_LINE_ZERO_COST,COST_LAYER_MISSING,HANDOFF_WITHOUT_LOCK |
| Duration | 445 ms |

## False PASS Checklist
- [x] Stale state observed (E2 timestamps vs edit)
- [x] No silent false PASS on stale probe
- [x] Admin/Ops recovery re-validation performed
- [x] E6 recalculated to Blocked after recovery
- [x] Export blocked post-recovery
- [x] E2/E3/E6/E7 consistent post-recovery

## FALSE_PASS_ANALYSIS

| Check | Result | Evidence |
|-------|--------|----------|
| Stale state observed? | Yes | stale_by_timestamp=true; live_critical=1 |
| Silent false PASS observed? | No | Live stale gate blocked approval/export during stale window |
| Approval inconsistency? | No | {"succeeded":false,"blocked":true,"code":"VALIDATION_BLOCK","status":403,"message":"Stale validation — live BOQ data has 1 critical line failure(s); re-run validation before approval","timestamp":"2026-06-12T12:13:50.827Z","at":"2026-06-12T12:13:50.827Z"} |
| Export inconsistency? | No | EXPORT_BLOCKED |
| Audit inconsistency? | No | E8 ordering valid |
| Workflow inconsistency? | No | E3 unchanged during stale probe |



## Lessons
- Persisted validation_results can lag live BOQ line state — stale window is observable via timestamp and live mismatch.
- getWorkflowGate live stale guard blocks approval/export when critical line failures exist without persisted CRITICAL_LINE_ZERO_COST.
- Admin/Ops runValidation is the recovery path; E2 post-edit timestamp follows last edit.

## Timeline
- 2026-06-12T12:13:50.703Z — [Engineer] E1 captured
- 2026-06-12T12:13:50.796Z — [Engineer] E2 pre-edit validation captured
- 2026-06-12T12:13:50.804Z — [Engineer] Engineer edit: line 1 marked critical, cost removed
- 2026-06-12T12:13:50.912Z — [Engineer] Stale-window probe: approval + export attempted without re-validation
- 2026-06-12T12:13:50.912Z — [Admin/Ops] Admin/Ops re-runs validation (recovery)
