# NP-011 — E9 — Sprint 8 Wave 4

| Persona | Auditor (+ Manager secondary) |
| BOQ Version ID | d977aaf5-8a3c-45d4-8f91-0473e4f52987 |
| Action | Cross-artifact governance integrity sweep + deliberate mismatch probes |
| Expected | Mismatch detected; governance closure blocked; scenario cannot close on contaminated bundle |
| Actual | Clean bundle PASS; 4/4 probes detected; closure BLOCKED |
| Duration | 238 ms |

## False PASS Checklist
- [x] E1/E7 BOQ Version match on clean bundle
- [x] E2/E7 consistency on clean bundle
- [x] E4/E8 consistency
- [x] E9 narrative consistency (no false PASS claim)
- [x] Deliberate mismatches detected — no silent false PASS
- [x] Governance closure blocked on contaminated evidence

## FALSE_PASS_ANALYSIS

| Check | Result | Evidence |
|-------|--------|----------|
| Silent false PASS? | No | All mismatch probes flagged; clean bundle only passes after cross-artifact sweep |
| Closure allowed incorrectly? | No | closure_allowed=false on all contaminated probes |
| Audit contradiction? | No | E8 ordering_check=true; rows=4 |
| Evidence contradiction? | No (detected in probes) | E1 BOQ Version ID differs from E7: detected=true; E2 and E7 reference different BOQ snapshots: detected=true; E4 rejection exists but E9 claims PASS: detected=true; E8 audit trail conflicts with chronology: detected=true |
| Retry inconsistency? | N/A | NP-011 scope |

## GOVERNANCE_INTEGRITY_MATRIX

| Check | Result |
|-------|--------|
| E1/E7 BOQ Version match | PASS |
| E2/E7 consistency | PASS |
| E4/E8 consistency | PASS |
| E9 narrative consistency | PASS |
| audit chronology | PASS |
| workflow state integrity | PASS |
| retry idempotency | PASS |

**Overall:** PASS — closure_allowed=true

## M-03 Trace Note
M-03: E4 rejection captured; E8 may under-represent rejection rows — E9 compares E4 vs E8.


## Lessons
- Auditor cross-artifact BOQ Version sweep prevents contamination false PASS.
- E4 rejection + E9 PASS narrative is detectable before scenario closure.
- E8 chronology check catches audit/workflow contradictions.

## Timeline
- 2026-06-12T12:27:49.039Z — [Auditor] E1 captured
- 2026-06-12T12:27:49.100Z — [Auditor] E2/E6 captured
- 2026-06-12T12:27:49.148Z — [Manager] E3/E4 captured — rejection documented
- 2026-06-12T12:27:49.205Z — [Auditor] E5/E7 captured
- 2026-06-12T12:27:49.212Z — [Auditor] Clean bundle governance sweep PASS
- 2026-06-12T12:27:49.212Z — [Auditor] All deliberate mismatch probes detected — closure blocked
