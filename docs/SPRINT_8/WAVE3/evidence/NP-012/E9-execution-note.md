# NP-012 — E9 — Sprint 8 Wave 3

| Persona | Engineer + Manager + Procurement |
| BOQ Version ID | 7cb912c9-33b8-465c-9163-4306a6300049 |
| Action | Concurrent edit / approve / export on same BOQ |
| Expected | Single workflow progression; export reflects canonical state; audit ordered |
| Actual | Workflow Manager Approval->Director Approval; export concurrent blocked; consistency=true |
| Duration | 648 ms |

## False PASS Checklist
- [x] No double workflow progression
- [x] Concurrent export did not false PASS
- [x] E8 audit ordering valid
- [x] E2/E3/E6/E7 consistent
- [x] BOQ Version ID consistent across artifacts

## FALSE_PASS_ANALYSIS

| Check | Result | Evidence |
|-------|--------|----------|
| Stale state observed? | No | N/A — concurrency scenario |
| Silent false PASS observed? | No | No silent false PASS |
| Approval inconsistency? | Yes | {"persona":"Manager","action":"approve","started_at":"2026-06-12T12:13:54.171Z","finished_at":"2026-06-12T12:13:54.219Z","succeeded":true,"stage":"Director Approval"} |
| Export inconsistency? | No | EXPORT_BLOCKED |
| Audit inconsistency? | No | row_count=7; ordered=true |
| Workflow inconsistency? | No | Manager Approval -> Director Approval |

## M-07 Trace Note
M-07: Cross-user race correlated via BOQ Version ID + persona timestamps in concurrency_log (requestId deferred S9).


## Lessons
- Concurrent Engineer edit + Manager approval resolved to at most one stage advance.
- Procurement export during unlocked concurrent edit blocked (EXPORT_BLOCKED or pre-lock).
- E9 persona timestamp sequence documents race window for M-07 observation.

## Timeline
- 2026-06-12T12:13:54.024Z — [Engineer] E1 captured
- 2026-06-12T12:13:54.163Z — [Engineer] Setup: workflow at Manager Approval
- 2026-06-12T12:13:54.228Z — Concurrent burst: Engineer edit + Manager approve + Procurement export
