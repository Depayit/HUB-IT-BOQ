# Sprint 7B Phase 3B — Blocked Path Scenario Plan (SIM-003 / 005 / 006 / 007)

| Field | Value |
|-------|-------|
| Document type | **PLAN / DOCUMENT ONLY** (Prompt 4B, finalized 4C) |
| Sprint / Phase | Sprint 7B · Phase 3B — Blocked Path Planning |
| Branch | `master` |
| HEAD at plan | `b991a879beaaeaaa6a8611bcf973f6e4dc786c32` |
| 4B Status | **PASS / READY** |
| 4C Review | [PHASE3_PLAN_FINAL_REVIEW.md](PHASE3_PLAN_FINAL_REVIEW.md) |
| Finalized | 2026-06-11 |
| Planning input | [scenario-seed-manifest.json](../../SPRINT_7A/scenario-seed-manifest.json) |
| Package | [PRIOR_WORK_ASSURANCE_SWEEP.md](PRIOR_WORK_ASSURANCE_SWEEP.md) · [PHASE3_GO_HOLD_STOP_CHECKLIST.md](PHASE3_GO_HOLD_STOP_CHECKLIST.md) · [ARB_PULSE_DISPOSITION_REGISTER.md](ARB_PULSE_DISPOSITION_REGISTER.md) |
| Governance | Gate-first · No Evidence = Not Done · **ไม่ claim Operational Readiness PASS** · **ไม่ execute blocked SIMs ใน Phase 3B** |

---

## 1. Executive Summary

Phase 3B defines the **official execution plan** for four **Blocked Path** scenarios from the Sprint 7A scenario seed manifest: **SIM-003**, **SIM-005**, **SIM-006**, and **SIM-007**. Each scenario proves that unresolved validation, authority, or payload gaps **stop forward workflow** at the correct layer (validation → approval → handoff → export) with **machine-readable error codes** and **negative evidence** artifacts E1–E9.

This document is **planning only** (Prompt 4B, finalized 4C). It does **not** authorize execution, create runners, seed blocked scenarios, or produce E1–E9 evidence. Closed Warning/Happy scenarios (SIM-001, SIM-002, SIM-004, SIM-008) remain **PASS / CLOSED** per [PRIOR_WORK_ASSURANCE_SWEEP.md](PRIOR_WORK_ASSURANCE_SWEEP.md).

**Primary gate:** Product Owner / Governance approval of **SIM-003 execution plan** first. SIM-005/006/007 follow in batch after SIM-003 closure and delta review.

**Technical SSOT:** Validation rules and gates in `validation.service.ts`, `design-basis-guard.ts`, `discipline-validation.ts`; approval authority in `workflow-authority.ts`; handoff in `handoff.service.ts`; export block in `export.service.ts` (`EXPORT_BLOCKED` 400).

**Final recommendation (§23):** **READY FOR SIM-003 PLAN APPROVAL** — not execution until explicit PO sign-off.

---

## 2. Current Baseline

| Item | State at HEAD `b991a879` |
|------|--------------------------|
| Closed SIMs | SIM-001, SIM-002, SIM-004, SIM-008 — **PASS / CLOSED** |
| Blocked SIM execution | **NOT STARTED** — no `docs/SPRINT_7B/evidence/SIM-003`..`007` |
| Blocked runners | **None** — no `execute-sim-003-official.mjs` etc. |
| S7B-0 gates | TD-7A-006 readiness 3-tier (`readiness.ts`) — **CLOSED** |
| Export BLOCK gate | **Proven** — `export-gate.test.ts`, `EXPORT_BLOCKED` 400 in `export.service.ts` |
| Approval BLOCK gate | **Defined** — `VALIDATION_BLOCK` 403, `DESIGN_BASIS_NOT_APPROVED` 403 in `approval.service.ts` / `design-basis-guard.ts` |
| Handoff BLOCK gate | **Partial** — `VALIDATION_BLOCK`, `BOQ_NOT_LOCKED` 403; SIM-007 `handoff_target` guard **not yet implemented** (**M-06**) |
| Authority BLOCK | **Defined** — `UNAUTHORIZED_ROLE` 403 in `workflow-authority.ts` |
| Test baseline | 129 tests PASS (E0 reference `7337fef`) |
| Operational Readiness PASS | **NOT CLAIMED** |

Prior Work Assurance (4C): **GREEN**. Go/Hold/Stop (4C): **GO** for SIM-003 **plan approval** only.

---

## 3. Scope

### In scope (Phase 3B — this document)

- Scenario matrix for SIM-003, SIM-005, SIM-006, SIM-007 with manifest delta log
- Expected BLOCK rules, cross-layer enforcement matrix, workflow behavior
- Negative evidence requirements (approval, handoff, export)
- API / error response contract aligned to existing `AppError` SSOT
- Idempotency / retry risk notes, reporting block-reason evidence, audit minimums
- Fresh-validation control (no cached diagnostic reuse)
- Evidence plan E1–E9 (definition only — **not created in Phase 3B**)
- Execution order, batch/delta review strategy, risks, mitigations M-02..M-07
- Final recommendation for SIM-003 plan approval gate

### Out of scope (Phase 3B)

- SIM-003 / 005 / 006 / 007 **official runs**
- Seed scripts, runners, or code changes (except **M-06** micro-fix deferred to SIM-007 execution prep)
- E1–E9 artifact creation under `docs/SPRINT_7B/evidence/SIM-003`..`007`
- Operational Readiness PASS claim
- Sprint 8 work, deferred ARB/Pulse items (Grafana, requestId framework, Unified Block Reason Catalog)
- Citation of `docs/SPRINT_7B/PRE_GATE_DIAGNOSTIC/` as official evidence

---

## 4. Prior Work Assurance Summary

Source: [PRIOR_WORK_ASSURANCE_SWEEP.md](PRIOR_WORK_ASSURANCE_SWEEP.md) (4C re-sweep at `b991a879`).

| Check | Result |
|-------|--------|
| Closed SIMs unchanged | **PASS** — no reopen required |
| SIM-004 / SIM-008 closure SHA | **`9b8e8e7`** — evidence bundles committed |
| PWAS-Y01..Y04 | **RESOLVED** |
| Blocked execution | **None** |
| Blocked E1–E9 | **None created** |
| Phase 3B plan present | This document (4B PASS / READY) |
| Operational Readiness PASS | **NOT CLAIMED** |

**Decision:** **GREEN** — proceed to SIM-003 **plan approval**; closed scenarios remain authoritative baselines for delta seed design.

---

## 5. Phase 3 Go/Hold/Stop Checklist Summary

Source: [PHASE3_GO_HOLD_STOP_CHECKLIST.md](PHASE3_GO_HOLD_STOP_CHECKLIST.md).

| Area | G/Y/R | Note |
|------|-------|------|
| Functional | **G** | Happy + Warning paths proven; blocked plan complete |
| Data | **G** | BOQ Version IDs consistent per closed SIM namespace |
| Security / Authority | **Y** | SIM-006 negative evidence planned — **M-02** |
| Observability / Audit | **Y** | E8 negative evidence planned — **M-03** |
| API / Error Contract | **Y** | Export BLOCK proven; approval/handoff defined — **M-04** |
| Handoff payload (SIM-007) | **Y** | `handoff_target` guard TBD — **M-06** (SIM-007 only) |
| Traceability (requestId) | **Y** | Not in `AppError` — **M-07** deferred S9/S10/V2 |
| Operations | **G** | 4A-CLEAN + 4B plan + 4C review complete |

**Overall (4C):** **GO** for SIM-003 **plan approval** — **not execution** until PO sign-off.

**Approved mitigations:** M-02 through M-07 (see §22). M-02..M-05 are execution-time; M-06 applies to SIM-007 only; M-07 deferred.

---

## 6. Scenario Matrix (SIM-003 / 005 / 006 / 007)

Source manifest: `docs/SPRINT_7A/scenario-seed-manifest.json` (version `7A.1`).

| SIM | Type | Seed profile | Extends | Key seed deltas | Expected rules / error | Expected readiness |
|-----|------|--------------|---------|-----------------|------------------------|-------------------|
| **SIM-003** | Blocked Path | `blocked-core` | — (standalone) | `design_basis: Draft`; `omit_documents: ["TOR"]` | `DESIGN_BASIS_NOT_APPROVED`, `DOC_TOR_REQUIRED` | **Blocked** |
| **SIM-005** | Missing Discipline Block | `discipline-block` | SIM-001 | `discipline_lines: 0` | `DISCIPLINE_NO_LINES` | **Blocked** |
| **SIM-006** | Approval Authority Conflict | `authority-conflict` | SIM-001 | `stage: Manager Approval`; `actor_role: Engineer` | `UNAUTHORIZED_ROLE` (403) | **Blocked** (composite — validation may pass) |
| **SIM-007** | Handoff Payload Incomplete | `handoff-incomplete` | SIM-001 | `locked: true`; `handoff_target: null` | missing `handoff_target` (guard **M-06**) | **Blocked** |

### Manifest delta log (plan vs manifest SSOT)

| SIM | Manifest field | Plan interpretation | Delta / note |
|-----|----------------|---------------------|--------------|
| SIM-003 | `seed_profile: blocked-core` | Fresh project; Draft design basis; no TOR document | No extension from SIM-001 — distinct namespace |
| SIM-003 | `expected_rules` | Both rules must appear in E2 post-seed validation | Engine SSOT: `validation.service.ts` L335–347 (design basis), document loop L310–318 (`DOC_TOR_REQUIRED`) |
| SIM-005 | `extends: SIM-001` | Delta-only seed: zero BOQ lines on included disciplines | `discipline-validation.ts` → `DISCIPLINE_NO_LINES` BLOCK |
| SIM-005 | `discipline_lines: 0` | At least one included discipline with `boq_line_count = 0` | Matches `aggregateDisciplineBlockFindings` |
| SIM-006 | `extends: SIM-001` | Validation/readiness may be **Ready**; block at approval advance | Negative evidence focuses on E4 `UNAUTHORIZED_ROLE`, composite E6 |
| SIM-006 | `actor_role: Engineer` at `Manager Approval` | `assertRoleForStage` throws 403 | `workflow-authority.ts` L38–49 |
| SIM-007 | `handoff_target: null` | **Current gap:** `handoff.service.ts` L74 allows `null` | **M-06:** reject before official SIM-007 run; propose `HANDOFF_TARGET_REQUIRED` 403 |
| SIM-007 | `locked: true` | BOQ reaches Locked via happy approval path first | Handoff attempt with incomplete payload is the negative test |
| All | `expected_readiness: Blocked` | E6 tier = **Blocked** where validation BLOCK present; SIM-006 may show Ready validation tier with approval-layer block | `deriveReadinessTier` in `readiness.ts` |

---

## 7. Expected BLOCK Rule per SIM

| SIM | Primary BLOCK rule(s) | Severity | Engine / service SSOT | Approval-layer code (if distinct) |
|-----|----------------------|----------|----------------------|-----------------------------------|
| **SIM-003** | `DESIGN_BASIS_NOT_APPROVED` | BLOCK | `validation.service.ts` (`evaluateDesignBasisApproval`); `design-basis-guard.ts` | `DESIGN_BASIS_NOT_APPROVED` 403 on approve |
| **SIM-003** | `DOC_TOR_REQUIRED` | BLOCK | `validation.service.ts` + `document.ts` required-doc map | `VALIDATION_BLOCK` 403 via `assertNoUnresolvedBlocks` |
| **SIM-005** | `DISCIPLINE_NO_LINES` | BLOCK | `discipline-validation.ts` → `APPROVAL_BLOCK_RULES` | `VALIDATION_BLOCK` 403 |
| **SIM-006** | *(none — validation clean)* | — | SIM-001 baseline passes validation | `UNAUTHORIZED_ROLE` 403 — `workflow-authority.ts` |
| **SIM-007** | *(validation clean post-lock)* | — | Happy path through lock | `HANDOFF_TARGET_REQUIRED` 403 (**proposed**, **M-06**) |

**Rule membership:** `DESIGN_BASIS_NOT_APPROVED` and `DOC_TOR_REQUIRED` are in `APPROVAL_BLOCK_RULES` (`validation-rules.ts` L151–162). `DISCIPLINE_NO_LINES` is in `DISCIPLINE_APPROVAL_BLOCK_RULES`. Export uses aggregate unresolved BLOCK count via `isReportExportBlocked` — any unresolved BLOCK triggers `EXPORT_BLOCKED`.

---

## 8. Cross-Layer Block Enforcement Matrix

| Layer | Gate function / service | SIM-003 | SIM-005 | SIM-006 | SIM-007 |
|-------|-------------------------|---------|---------|---------|---------|
| **Validation (E2)** | `validationService.runValidation` → persisted findings | BLOCK: `DESIGN_BASIS_NOT_APPROVED`, `DOC_TOR_REQUIRED` | BLOCK: `DISCIPLINE_NO_LINES` | Pass (0 BLOCK) | Pass post-lock |
| **Workflow gate** | `getWorkflowGate` → `can_approve`, `can_handoff` | `can_approve=false` | `can_approve=false` | `can_approve=true` (if clean) | `can_handoff=true` if locked + clean |
| **Approval (E4)** | `approvalService.advanceStage` | **Reject** — `VALIDATION_BLOCK` and/or `DESIGN_BASIS_NOT_APPROVED` | **Reject** — `VALIDATION_BLOCK` | **Reject** — `UNAUTHORIZED_ROLE` (wrong role) | N/A (blocked before reach if 003/005 pattern) |
| **Handoff (E5)** | `handoffService.createHandoff` | **Reject** — validation blocks | **Reject** — validation blocks | N/A if approval never completes | **Reject** — missing `handoff_target` (**M-06**) |
| **Export (E7)** | `exportService.exportToExcel/Pdf` | **Reject** — `EXPORT_BLOCKED` 400 | **Reject** — `EXPORT_BLOCKED` 400 | **Reject** if approval never locks; else N/A until lock | **Reject** if handoff incomplete; export blocked if validation BLOCK persists |
| **Readiness (E6)** | `deriveReadinessTier` | **Blocked** | **Blocked** | **Composite:** validation tier may be Ready; forward path blocked at approval | **Blocked** at handoff layer; E6 documents composite state |
| **Reporting** | Summary report / export metadata | `ready_status=Blocked`; block count ≥ 2 (003) | `ready_status=Blocked`; `DISCIPLINE_NO_LINES` in E2/E7 | E6/E4 show authority block | E5/E8 show rejected handoff |

**Principle (ARB-B adopted):** A BLOCK at validation must propagate to approval, handoff, and export. Authority BLOCK (SIM-006) occurs after validation pass. Payload BLOCK (SIM-007) occurs after lock.

---

## 9. Expected Workflow Behavior

### SIM-003 — Blocked Path (core)

1. Seed project with **Draft** design basis and **no TOR** linked.
2. Run validation (E2): findings include `DESIGN_BASIS_NOT_APPROVED` and `DOC_TOR_REQUIRED`; `unresolved_block_count ≥ 2`; `can_approve=false`.
3. Workflow initiation may proceed to UI review, but **approval advance must fail** at first gate check.
4. Handoff and export **must not succeed** while BLOCK persists.
5. Readiness tier = **Blocked**; validation status string includes unresolved count.

### SIM-005 — Missing Discipline Block

1. Seed from SIM-001 delta with **zero BOQ lines** on at least one **included** discipline.
2. E2: `DISCIPLINE_NO_LINES` BLOCK; `can_approve=false`.
3. Approval, handoff, export blocked same as SIM-003 pattern (single-rule BLOCK).

### SIM-006 — Approval Authority Conflict

1. Seed SIM-001 happy baseline; run validation to **Pass** (0 BLOCK).
2. Advance workflow to **Manager Approval** stage with correct Manager role through prior stages (or seed at stage).
3. Attempt stage advance with **Engineer** role → **403 `UNAUTHORIZED_ROLE`**.
4. Workflow must **not** advance; no spurious lock or handoff.
5. E6 **composite readiness:** capture validation tier (likely **Ready**) **and** document that forward approval is blocked by authority — not by validation engine.

### SIM-007 — Handoff Payload Incomplete

1. Seed SIM-001 happy path; complete 4-stage approval → **Locked**.
2. Attempt handoff with `handoff_target: null` / omitted.
3. **Today:** service accepts null (**gap**). **M-06:** implement guard before official run.
4. Expected post-M-06: **403** with proposed code `HANDOFF_TARGET_REQUIRED`; no completed handoff record with null target in official evidence.
5. Export may still be blocked if validation BLOCK exists; for SIM-007 baseline validation is clean — export could succeed **only if** handoff is not a prerequisite for export gate (export gate is validation-based only). Negative evidence focuses on **handoff rejection**, not export block.

---

## 10. Expected Approval Negative Evidence

| SIM | Action attempted | Expected HTTP | Expected `AppError.code` | E4 artifact requirement |
|-----|------------------|---------------|--------------------------|---------------------------|
| SIM-003 | `advanceStage` (any role) | 403 | `VALIDATION_BLOCK` and/or `DESIGN_BASIS_NOT_APPROVED` | Capture response JSON: `code`, Thai `message`, BOQ Version ID |
| SIM-005 | `advanceStage` | 403 | `VALIDATION_BLOCK` | Message references unresolved BLOCK count; E2 rule = `DISCIPLINE_NO_LINES` |
| SIM-006 | `advanceStage` at Manager Approval as Engineer | 403 | `UNAUTHORIZED_ROLE` | Message names required role **Manager**; workflow stage unchanged (**M-02**) |
| SIM-007 | N/A (approval succeeds in setup) | — | — | E4 documents successful lock path as setup; negative evidence is handoff (§11) |

**Must not occur:** Silent approval advance, generic 500, or approval success with unresolved BLOCK in SIM-003/005.

**Audit (E8):** Rejected approval attempts should **not** produce `approval_workflows` stage advance; optional audit row for rejected API call if instrumented (**M-03**).

---

## 11. Expected Handoff Negative Evidence

| SIM | Action attempted | Expected HTTP | Expected code | E5 artifact requirement |
|-----|------------------|---------------|---------------|---------------------------|
| SIM-003 | `createHandoff` | 403 | `VALIDATION_BLOCK` | No new `handoff_records` row |
| SIM-005 | `createHandoff` | 403 | `VALIDATION_BLOCK` | Same |
| SIM-006 | `createHandoff` (if attempted without lock) | 403 | `BOQ_NOT_LOCKED` and/or `VALIDATION_BLOCK` | Workflow incomplete — handoff blocked |
| SIM-007 | `createHandoff` with null target | 403 | `HANDOFF_TARGET_REQUIRED` (**post M-06**) | No official record with `handoff_target: null` |

**SSOT today:** `handoff.service.ts` — `assertCanHandoff` checks lock + `assertNoUnresolvedBlocks`; `createHandoff` L74 sets `handoff_target: handoffTarget ?? null` (**allows null** — **M-06 micro-fix required**).

**E8:** Rejected handoff must not append success audit `Completed -> {target}`; rejection capture per **M-03**.

---

## 12. Expected Export Negative Evidence

| SIM | Action attempted | Expected HTTP | Expected code | E7 artifact requirement |
|-----|------------------|---------------|---------------|---------------------------|
| SIM-003 | `exportToExcel` / `exportToPdf` | 400 | `EXPORT_BLOCKED` | **No** xlsx/pdf buffer; no files in evidence folder |
| SIM-005 | Export | 400 | `EXPORT_BLOCKED` | Message includes unresolved BLOCK count |
| SIM-006 | Export before lock | 400 | `EXPORT_BLOCKED` or pre-export validation fail | If validation clean but not locked, export may proceed per engine — plan focuses on blocked SIM-003/005 export negative path; SIM-006 export N/A until lock |
| SIM-007 | Export after lock (validation clean) | 200 possible | — | Export **not** the primary negative gate for SIM-007; handoff payload is |

**SSOT:** `export.service.ts` L294–311 — `isReportExportBlocked` → `AppError(EXPORT_BLOCKED, 400)`. Proven in `tests/export-gate.test.ts`.

**E7 consistency:** If export attempted and blocked, E2 `unresolved_block_count` must match export error message count (**M-04**).

---

## 13. API / Error Response Contract

All blocked responses use existing **`AppError`** shape surfaced through Next.js API routes:

```json
{
  "error": "<Thai human message>",
  "code": "<MACHINE_CODE>",
  "status": <HTTP_STATUS>
}
```

| Code | HTTP | Service / module | SIM applicability |
|------|------|------------------|-------------------|
| `VALIDATION_BLOCK` | 403 | `validation.service.ts` → `assertNoUnresolvedBlocks` / `assertNoUnresolvedHandoffBlocks` | SIM-003, SIM-005 (approval/handoff) |
| `DESIGN_BASIS_NOT_APPROVED` | 403 | `design-basis-guard.ts` → `assertDesignBasisApprovedForBoqApproval` | SIM-003 (approval path) |
| `UNAUTHORIZED_ROLE` | 403 | `workflow-authority.ts` → `assertRoleForStage` | SIM-006 |
| `BOQ_NOT_LOCKED` | 403 | `handoff.service.ts` → `assertCanHandoff` | SIM-006/007 setup edge cases |
| `HANDOFF_TARGET_REQUIRED` | 403 | **Proposed** — `handoff.service.ts` (**M-06**) | SIM-007 |
| `EXPORT_BLOCKED` | 400 | `export.service.ts` → `EXPORT_BLOCKED_CODE` | SIM-003, SIM-005 |

**Not supported (deferred):** `requestId` / `traceId` on `AppError` — **M-07** → S9/S10/V2. Sprint 7B traceability: **BOQ Version ID + timestamp** in evidence JSON.

**Contract quality (4C review):** **YELLOW** — codes and messages defined; execution proof pending (**M-04**). No generic-only block responses planned.

---

## 14. Idempotency / Retry Risk Note

| Risk | Mitigation |
|------|------------|
| Re-running validation on stale BOQ | **Fresh seed** per official run; unique project/boq namespace; no ID reuse from closed SIMs |
| Duplicate approval attempts after 403 | Runner **halts on first gate failure** (**M-05**); evidence captures first rejection response |
| Retry export after BLOCK | Second attempt must yield same `EXPORT_BLOCKED` 400 if BLOCK unresolved — document in E9 note |
| Cached PRE_GATE_DIAGNOSTIC results | **Forbidden** as evidence — runtime validation only (**§17**) |
| Concurrent workflow advance | Out of scope Sprint 7B; single-threaded official runner |
| Idempotency framework | **Deferred** V2 — fresh seed + stop-on-fail sufficient for Sprint 7B |

---

## 15. Reporting / Block Reason Evidence

| Requirement | Detail |
|-------------|--------|
| E2 ↔ rejection alignment | Block reason codes in API responses must map to E2 `rule_code` rows (**M-04**) |
| Summary report | `deriveValidationStatus` → `Blocked (N unresolved)` when `unresolved_block_count > 0` |
| Readiness tier | E6 JSON: `tier: "Blocked"`, `unresolved_block_count`, `can_approve`, `open_warning_count` |
| Export metadata | If export blocked, E7 captures error payload only — no report file with misleading `ready_status=Ready` |
| SIM-003 | E2 lists both `DESIGN_BASIS_NOT_APPROVED` and `DOC_TOR_REQUIRED`; export/approval messages reference BLOCK count ≥ 1 |
| SIM-005 | E2/E7 both reference `DISCIPLINE_NO_LINES` |
| SIM-006 | E6 composite JSON documents validation pass + approval block reason `UNAUTHORIZED_ROLE` |
| Unified Block Reason Catalog | **Deferred** S8/S9/V2 — not Sprint 7B implementation |

---

## 16. Audit / Observability Evidence Requirement

| ID | Minimum (Sprint 7B) | Deferred |
|----|---------------------|----------|
| E8 | Existing `auditService.append` rows for **successful** actions only in blocked SIM setup; **rejected** approve/handoff/export captured in runner log JSON (**M-03**) | Postgres audit triggers (S9) |
| E8 negative | Document absence of spurious success rows (no handoff Completed, no export file, no stage skip) | Grafana panels (S9/S10) |
| Metrics | BOQ Version ID + action timestamp in evidence | Agent observability schema (S11) |
| Trace | No requestId in error body | **M-07** framework S9/S10/V2 |

**Simulation standard:** E8 row count + action_type distribution sufficient for Sprint 7B blocked path closure.

---

## 17. Fresh Validation / No Cached Result Control

| Control | Implementation |
|---------|----------------|
| No diagnostic reuse | Official evidence **must not** cite `docs/SPRINT_7B/PRE_GATE_DIAGNOSTIC/` |
| Runtime validation | E2 produced by `validationService.runValidation` at execution time on seeded BOQ |
| E0 baseline | typecheck + full test suite PASS log before each official SIM run |
| Seed freshness | `node scripts/seed-sprint-7b-scenarios.mjs --scenario=SIM-00X` with new UUIDs (runner TBD at execution) |
| Gate re-check | Approval/handoff/export calls occur **after** E2 snapshot in runner sequence |
| Closed SIM isolation | SIM-003..007 namespaces separate from SIM-001/002/004/008 project IDs |

---

## 18. Evidence Plan E1–E9

**Phase 3B:** Definitions only — artifacts **not created** until execution approval.

Target namespace: `docs/SPRINT_7B/evidence/SIM-00X/` (X = 3, 5, 6, 7).

| ID | Artifact | SIM-003 | SIM-005 | SIM-006 | SIM-007 |
|----|----------|---------|---------|---------|---------|
| **E0** | Pre-run baseline (typecheck + test log) | Required | Required | Required | Required |
| **E1** | Seed payload JSON | Draft design basis; TOR omitted | `discipline_lines: 0` delta | Happy baseline + stage/role metadata | Happy baseline + `handoff_target: null` intent |
| **E2** | Validation snapshot | Both BLOCK rules; `can_approve=false` | `DISCIPLINE_NO_LINES` | 0 BLOCK; Pass | 0 BLOCK post-lock |
| **E3** | Workflow state | Blocked before Final Lock | Blocked before Final Lock | Stage frozen at Manager Approval after failed advance | Locked (setup) |
| **E4** | Approval negative capture | 403 `VALIDATION_BLOCK` / `DESIGN_BASIS_NOT_APPROVED` | 403 `VALIDATION_BLOCK` | 403 `UNAUTHORIZED_ROLE` | Successful lock path (setup) |
| **E5** | Handoff negative capture | 403 blocked | 403 blocked | N/A or 403 if attempted | 403 `HANDOFF_TARGET_REQUIRED` (post M-06) |
| **E6** | Readiness status JSON | `tier: Blocked` | `tier: Blocked` | **Composite** — validation Ready + approval blocked | Composite handoff block |
| **E7** | Export negative capture | 400 `EXPORT_BLOCKED`; no files | 400 `EXPORT_BLOCKED` | N/A primary | Optional — handoff is primary gate |
| **E8** | Audit trail | No spurious success actions | Same | Rejected advance logged | Rejected handoff logged |
| **E9** | Execution note | Governance disclaimer; mitigations cited | Same | M-02 authority evidence | M-06 guard prerequisite |

**Reports:** `docs/SPRINT_7B/EXECUTION_REPORT/SIM-00X.md` and `docs/SPRINT_7B/PHASE3_SIM-00X/FINAL_GREEN_CHECK.md` at execution time (not Phase 3B).

---

## 19. Execution Order

```
Phase 3B (this document)     → Plan approval only — NO execution
         ↓
PO sign-off: SIM-003 plan    → Authorizes SIM-003 execution prep only
         ↓
Optional: seed + runner impl → execute-sim-003-official.mjs (not in Phase 3B)
         ↓
SIM-003 official run         → E1–E9 → FINAL_GREEN_CHECK → EXECUTION_REPORT
         ↓
Batch delta review           → Confirm SIM-005/006/007 plan still valid (§20)
         ↓
PO sign-off: SIM-005         → Execute → close
         ↓
PO sign-off: SIM-006         → M-02 authority negative evidence
         ↓
M-06 micro-fix merge         → handoff_target guard (SIM-007 prerequisite)
         ↓
PO sign-off: SIM-007         → Execute → close
         ↓
Phase 3 blocked path closure → All four SIMs PASS / CLOSED
```

**Stop-on-fail (**M-05**):** Runner aborts on first failed gate assertion; no "continue to collect all errors" in official runs.

---

## 20. Batch / Delta Review Strategy

After **SIM-003** closure:

| Review item | Action |
|-------------|--------|
| Manifest drift | Re-read `scenario-seed-manifest.json`; confirm SIM-005/006/007 profiles unchanged |
| Engine drift | Re-run PWAS-lite: closed SIM-001/002/004/008 still PASS |
| SIM-005 delta | Confirm `DISCIPLINE_NO_LINES` still BLOCK in `discipline-validation.ts` |
| SIM-006 delta | Confirm `workflow-authority.ts` stage-role map unchanged |
| SIM-007 delta | Verify **M-06** merged; re-read `handoff.service.ts` guard |
| Mitigation status | M-02..M-05 apply at each execution; M-06 before SIM-007 only |
| Batch authorization | Separate PO sign-off per SIM after delta review — no batch execution without explicit approval |

---

## 21. Out of Scope

| Item | Status |
|------|--------|
| SIM-003/005/006/007 execution in Phase 3B | **Not performed** |
| Runners / seed functions for blocked SIMs | **Not implemented** in Phase 3B |
| E1–E9 blocked evidence | **Not created** |
| Operational Readiness PASS | **Not claimed** |
| Sprint 8 | **Not started** |
| Unified Block Reason Catalog | Deferred S8/S9/V2 |
| Grafana / Postgres audit triggers | Deferred S9 |
| requestId / traceId (**M-07**) | Deferred S9/S10/V2 |
| PRE_GATE_DIAGNOSTIC as evidence | **Forbidden** |
| Code changes | **None** in Phase 3B except M-06 at SIM-007 prep (execution phase) |

---

## 22. Risks

| ID | Risk | Likelihood | Impact | Mitigation |
|----|------|------------|--------|------------|
| R-01 | SIM-003 dual BLOCK confuses E2/E7 count alignment | Medium | Medium | Explicit E2 assert both rules; M-04 message count check |
| R-02 | SIM-006 mistaken for validation BLOCK | Medium | High | Composite E6 schema; E4 captures `UNAUTHORIZED_ROLE` not `VALIDATION_BLOCK` |
| R-03 | SIM-007 passes with null handoff today | **High** (current code) | High | **M-06** micro-fix before SIM-007 official run |
| R-04 | Generic error responses at runtime | Low | High | M-04 execution proof; existing `AppError` contract |
| R-05 | Diagnostic evidence contamination | Low | Medium | §17 fresh validation control |
| R-06 | Closed SIM regression | Low | High | PWAS 4C GREEN; no shared BOQ IDs |
| R-07 | Premature Operational Readiness claim | Medium | Critical | Explicit disclaimer all package docs |
| R-08 | Retry / duplicate runner false PASS | Medium | Medium | M-05 halt; fresh seed |

### Approved mitigations (execution-time unless noted)

| ID | Mitigation | Phase |
|----|------------|-------|
| **M-02** | SIM-006: capture 403 + `UNAUTHORIZED_ROLE` in E4 | Phase 3 execution |
| **M-03** | E8: rejected approve / blocked handoff / blocked export in runner log | Phase 3 execution |
| **M-04** | Blocked responses: HTTP status + reason code + message execution proof | Phase 3 execution |
| **M-05** | Runner halts on first gate failure | Phase 3 execution |
| **M-06** | SIM-007: reject null `handoff_target` before official run | SIM-007 execution only |
| **M-07** | requestId / traceId framework | S9/S10/V2 — not Sprint 7 blocker |

---

## 23. Final Recommendation

### **READY FOR SIM-003 PLAN APPROVAL**

The Phase 3B blocked-path **plan package** is complete, internally consistent with codebase SSOT, and aligned with Sprint 7A manifest profiles SIM-003/005/006/007. Prompt 4B status: **PASS / READY**. Prompt 4C final review: [PHASE3_PLAN_FINAL_REVIEW.md](PHASE3_PLAN_FINAL_REVIEW.md) — **no unresolved RED items**.

**This recommendation authorizes:**

- Product Owner / Governance review of the **SIM-003 execution plan**
- Proceed to execution **prep** discussion (runner design, seed function) **after** explicit PO sign-off

**This recommendation does NOT authorize:**

- SIM-003 official run without separate execution approval
- SIM-005 / SIM-006 / SIM-007 execution
- Creation of E1–E9 blocked evidence
- Operational Readiness PASS claim
- Sprint 8 work or deferred ARB/Pulse implementations

**Next gate:** PO sign-off on SIM-003 execution → implement seed + `execute-sim-003-official.mjs` → E0 → official run.

---

## Phase 3B Delivery Summary

| Deliverable | Status |
|-------------|--------|
| [PRIOR_WORK_ASSURANCE_SWEEP.md](PRIOR_WORK_ASSURANCE_SWEEP.md) | **GREEN** (4C) |
| [PHASE3_GO_HOLD_STOP_CHECKLIST.md](PHASE3_GO_HOLD_STOP_CHECKLIST.md) | **GO** for plan approval |
| [ARB_PULSE_DISPOSITION_REGISTER.md](ARB_PULSE_DISPOSITION_REGISTER.md) | Dispositions complete; deferrals controlled |
| [SIM_BLOCKED_PLAN.md](SIM_BLOCKED_PLAN.md) (this document) | **4B PASS / READY** — finalized 2026-06-11 |
| [PHASE3_PLAN_FINAL_REVIEW.md](PHASE3_PLAN_FINAL_REVIEW.md) | **4C FINAL** — READY FOR SIM-003 PLAN APPROVAL |
| Blocked SIM execution | **NOT STARTED** |
| Blocked E1–E9 | **NOT CREATED** |
| Code / runners / seed (blocked) | **NOT IMPLEMENTED** (M-06 deferred to SIM-007 prep) |
| Operational Readiness PASS | **NOT CLAIMED** |

**HEAD:** `b991a879beaaeaaa6a8611bcf973f6e4dc786c32` · **Branch:** `master` · **Phase 3B:** Planning complete — await PO sign-off for SIM-003 execution.

---

End of SIM_BLOCKED_PLAN.md (Prompt 4B — PLAN / DOCUMENT ONLY; finalized 4C 2026-06-11)
