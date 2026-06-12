# NP-001 — Co-worker Execution Note (E9) — Sprint 8 Wave 1 OFFICIAL

| Field | Value |
|-------|-------|
| Sprint | 8-3 — Wave 1 Co-worker Simulation |
| Scenario | NP-001 |
| Persona | Manager |
| Started at | 2026-06-12T10:43:31.582Z |
| Finished at | 2026-06-12T10:44:08.292Z |
| Duration | 36710 ms |
| Project ID | 95b1325c-857a-4509-94c0-f90e81ead9a3 |
| BOQ Version ID | 9ed994d5-0d83-4fe3-8db5-d9412eb80f8a |
| Operational Readiness PASS | **NOT CLAIMED** |
| MVP Freeze | **NOT CLAIMED** |
| Production Readiness | **NOT CLAIMED** |

| Attempt 2 code | UNAUTHORIZED_ROLE |

## Persona Action

| Field | Value |
|-------|-------|
| Persona | Manager |
| Action attempted | Approve twice at Manager Approval (duplicate click) |
| Expected result | First succeeds; second rejected/no-op; no double advance |
| Actual result | Attempt1→Director Approval; Attempt2→UNAUTHORIZED_ROLE |

## False PASS Check

- [x] Single effective manager advance
- [x] Second attempt blocked/rejected
- [x] No duplicate audit corruption (E8 reviewed)
- [x] Workflow not at Final Lock after duplicate

## Lessons Learned

- Duplicate Manager click after success fails at next stage authority boundary.
- E4 attempt log required to prove idempotent behavior.

## Timeline

- 2026-06-12T10:43:39.040Z — E1 captured
- 2026-06-12T10:43:51.201Z — E2+E6 captured

## Step Results

- [PASS] E1: seed captured
  {"at":"2026-06-12T10:43:39.040Z"}
- [PASS] E2/E6: validation captured
  {"at":"2026-06-12T10:43:51.200Z"}
- [PASS] E3/E4: duplicate approval contained
  {"at":"2026-06-12T10:44:01.847Z","attempt2_code":"UNAUTHORIZED_ROLE"}

## Carry-over Notes

- M-03: Rejected attempts captured in E4; E8 may under-represent rejections.
- M-07: requestId/traceId not on AppError — BOQ Version ID + timestamp used.
- No PRE_GATE_DIAGNOSTIC artifact reuse.
- No Sprint 7 SIM BOQ Version ID contamination.

