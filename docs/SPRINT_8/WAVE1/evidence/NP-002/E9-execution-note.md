# NP-002 — Co-worker Execution Note (E9) — Sprint 8 Wave 1 OFFICIAL

| Field | Value |
|-------|-------|
| Sprint | 8-3 — Wave 1 Co-worker Simulation |
| Scenario | NP-002 |
| Persona | Manager |
| Started at | 2026-06-12T10:42:49.945Z |
| Finished at | 2026-06-12T10:43:26.004Z |
| Duration | 36059 ms |
| Project ID | 77a323fa-9638-42f2-81e6-5534599bf3e0 |
| BOQ Version ID | 5b4a3f95-23de-4bce-a197-93e4bb842381 |
| Operational Readiness PASS | **NOT CLAIMED** |
| MVP Freeze | **NOT CLAIMED** |
| Production Readiness | **NOT CLAIMED** |

| Required role at stage | Director |
| Attempt code | UNAUTHORIZED_ROLE |

## Persona Action

| Field | Value |
|-------|-------|
| Persona | Manager |
| Action attempted | Advance Director Approval (Director-only stage) |
| Expected result | 403 UNAUTHORIZED_ROLE; no workflow progression |
| Actual result | UNAUTHORIZED_ROLE (403) |

## False PASS Check

- [x] Unauthorized role blocked (403)
- [x] No workflow stage advance on wrong role
- [x] E3 consistent with E4 rejection
- [x] No export artifacts
- [x] No handoff records
- [x] BOQ Version ID consistent E1–E8

## Lessons Learned

- Manager cannot advance from Director Approval stage — authority gate holds.
- Co-worker retry after seeing Director stage does not bypass role check.

## Timeline

- 2026-06-12T10:42:57.659Z — E1 captured
- 2026-06-12T10:43:09.492Z — E2+E6 captured

## Step Results

- [PASS] E1: seed captured
  {"at":"2026-06-12T10:42:57.659Z"}
- [PASS] E2/E6: validation + readiness captured
  {"at":"2026-06-12T10:43:09.491Z","tier":"Blocked"}
- [PASS] Setup: workflow at Director Approval
  {"at":"2026-06-12T10:43:17.687Z","stage":"Director Approval"}
- [PASS] E3/E4: unauthorized role blocked
  {"at":"2026-06-12T10:43:19.334Z","code":"UNAUTHORIZED_ROLE"}
- [PASS] E5: handoff blocked
  {"at":"2026-06-12T10:43:20.441Z","code":"BOQ_NOT_LOCKED"}
- [PASS] E7: export blocked
  {"at":"2026-06-12T10:43:25.430Z","code":"EXPORT_BLOCKED"}
- [PASS] E8: audit trail captured
  {"at":"2026-06-12T10:43:26.004Z"}

## Carry-over Notes

- M-03: Rejected attempts captured in E4; E8 may under-represent rejections.
- M-07: requestId/traceId not on AppError — BOQ Version ID + timestamp used.
- No PRE_GATE_DIAGNOSTIC artifact reuse.
- No Sprint 7 SIM BOQ Version ID contamination.

