# S7B-2A — Validation WARNING Persistence Closure

| Field | Value |
|-------|-------|
| Scope | Wire WARNING findings into validation engine persistence |
| Prerequisite for | SIM-002 Official Run (not executed in this branch) |
| Generated | 2026-06-07 |
| Governance | Gate-first · ไม่ใช้ SIM execution ปิด TD |

---

## Guardrails (approved)

1. **BLOCK-only preserved** — `findCostLayerValidationFailures` unchanged; WARNING cost findings via `validation-findings.ts` collector
2. **Discipline SSOT** — `discipline-validation.ts` is single evaluator; UI imports same module (no duplicate logic)
3. **Severity split** — mandatory missing line mapping = `DISCIPLINE_NO_LINES` (BLOCK); optional missing scope text = `DISCIPLINE_MISSING_SCOPE` (WARNING)
4. **Contract tests** — WARNING persist, readiness = Warning, block count = 0, forward/export allowed with warning flag
5. **SIM-002 gate** — Official run blocked until this branch merges + E0 baseline PASS

---

## Changes

| Area | File | Action |
|------|------|--------|
| Discipline SSOT | [src/lib/validations/discipline-validation.ts](../../../src/lib/validations/discipline-validation.ts) | New — engine + UI shared evaluator |
| Unified aggregator | [src/lib/validations/validation-findings.ts](../../../src/lib/validations/validation-findings.ts) | WARNING collectors + persist mapping |
| Workflow UI shim | [src/lib/validations/discipline-workflow.ts](../../../src/lib/validations/discipline-workflow.ts) | Re-exports SSOT; workflow status only |
| Rule registry | [src/lib/validations/validation-rules.ts](../../../src/lib/validations/validation-rules.ts) | All `DISCIPLINE_*` from `discipline-rules` SSOT |
| Engine wiring | [src/lib/services/validation.service.ts](../../../src/lib/services/validation.service.ts) | Persist WARNING + discipline BLOCK via aggregator |

---

## Evidence

| Check | Result | Log |
|-------|--------|-----|
| `npm run typecheck` | **PASS** | [evidence/S7B-2A-typecheck.log](evidence/S7B-2A-typecheck.log) |
| `npm test` | **PASS** (15 files / 116 tests) | [evidence/S7B-2A-test-summary.log](evidence/S7B-2A-test-summary.log) |

### New / updated tests

| File | Tests | Coverage |
|------|-------|----------|
| [tests/validation-warning-persistence.test.ts](../../../tests/validation-warning-persistence.test.ts) | 9 | Aggregator, SSOT, readiness Warning, forward/export |
| [tests/export-gate.test.ts](../../../tests/export-gate.test.ts) | +1 | Export allowed with warnings, 0 blocks |
| [tests/validation-rules.test.ts](../../../tests/validation-rules.test.ts) | +2 | Discipline codes in engine registry |
| [tests/discipline-workflow.test.ts](../../../tests/discipline-workflow.test.ts) | +1 | No MISSING_SCOPE when NO_LINES BLOCK |

---

## TD impact

| TD | Status |
|----|--------|
| TD-7B-001 (D-06 carry) Validation WARNING persistence | **CLOSED** (this branch) |

---

## Next step (blocked until merge)

1. Merge S7B-2A to `master`
2. E0 baseline on `master` (typecheck + test logs → `PHASE2_SIM-002/evidence/E0-pre-run-baseline/`)
3. **Then** seed `--scenario=SIM-002` + `execute-sim-002-official.mjs` (E1–E9)

Out of scope unchanged: SIM-004/008, Blocked scenarios, Operational Readiness PASS claim.

End of CLOSURE.md
