# SIM-007 Handoff Guard Pre-check (Phase 3D)

| Field | Value |
|-------|-------|
| Generated | 2026-06-12 |
| Scenario | SIM-007 — Handoff Payload Incomplete |
| Manifest | `handoff_target: null` / missing required payload |
| Expected block | `HANDOFF_TARGET_REQUIRED` (403) |

---

## Current observed behavior (pre-fix)

Inspected `src/lib/services/handoff.service.ts` → `createHandoff()`:

- Calls `assertCanHandoff()` (lock + validation gate) ✓
- Persists `handoff_target: handoffTarget ?? null` — **allows null**
- Writes audit row `"Completed"` even when target is null
- **No guard** rejects missing `handoff_target` before insert

This matches Phase 3 plan gap **M-06** documented in `SIM_BLOCKED_PLAN.md`.

---

## Decision

**MICRO-FIX REQUIRED**

Official SIM-007 cannot proceed without rejecting null/missing `handoff_target`.

---

## Minimal micro-fix scope

| File | Change |
|------|--------|
| `src/lib/validations/handoff.ts` | Add `HANDOFF_TARGET_REQUIRED_CODE` + `assertHandoffTargetProvided()` |
| `src/lib/services/handoff.service.ts` | Call guard in `createHandoff()` before Prisma insert |
| `tests/handoff.test.ts` | Contract tests for guard (null/undefined/invalid → 403) |

Successful handoff with valid target (SIM-001 path) preserved — guard only runs at service entry.

---

## Official run can proceed?

**YES** — after micro-fix + `npm run typecheck` + `npm test` PASS.

---

## Out of scope (not required)

- Export gate changes
- Approval authority changes
- Readiness SSOT changes
- Handoff framework redesign
