# WS-01B Option B — Engineering Review — HUB IT BOQ V3

| Field | Value |
|-------|-------|
| System | HUB IT BOQ V3 — ERP-ready BOQ Cost Intelligence System |
| Sprint | 9-1B-3 — WS-01B-0A |
| Workstream | WS-01 — TD-7B-003 Resolution (Option B) |
| Document type | **ENGINEERING REVIEW** |
| Branch | `main` |
| Generated | 2026-06-13 |
| TD ID | **TD-7B-003** |
| TD status | **OPEN** |
| Reviewer role | Engineering Lead (pre-sign-off assessment) |
| Parent boundary | [WS01B_OPTION_B_IMPLEMENTATION_BOUNDARY.md](WS01B_OPTION_B_IMPLEMENTATION_BOUNDARY.md) |
| Acceptance criteria | [WS01B_OPTION_B_ACCEPTANCE_CRITERIA.md](WS01B_OPTION_B_ACCEPTANCE_CRITERIA.md) |
| Sign-off reference | [TD_7B_003_SIGNOFF_REQUEST.md](TD_7B_003_SIGNOFF_REQUEST.md) §10 |

---

## 1. Purpose

Assess whether Option B is **technically implementable** within the documented boundary, whether the three mandatory visible states are **definable from existing code paths**, and whether WS-01B can proceed to human sign-off without RED engineering blockers.

**This document does not authorize implementation.** Human Engineering Lead sign-off in §10 is still required.

---

## 2. State Definitions Assessment

### 2.1 State Definition Table

| State | Proposed Meaning | Source of Truth | Expected Data Source | Ambiguity |
|-------|------------------|-----------------|----------------------|-----------|
| **Validation Ready** | BOQ validation layer satisfied — 0 unresolved BLOCK; validation run complete; approval permitted per validation engine | `deriveReadinessTier()` + `deriveValidationStatus()` in `src/lib/validations/readiness.ts`; E6 `ready_status` on report | `validationGate.unresolved_block_count`, `can_approve`, `inferValidationRun()`, `open_warning_count` from `validationService.getWorkflowGate()` and validation results | **Medium** — current E6 tier label `"Ready"` is validation-only but UI label `"Ready / Not Ready Status"` does not convey layer scope; users may equate Ready tier with full operational readiness |
| **Export Eligible** | BOQ summary export permitted under validation-only gate; **does not imply handoff readiness** | `isReportExportBlocked()` in `src/lib/validations/reporting.ts`; enforced in `export.service.ts` | `report.validation.unresolved_blocks` — export blocked when count > 0 | **Low** for gate predicate; **High** for user interpretation — export file currently labels `"Ready Status"` from E6 tier without authorization-layer qualifier |
| **Handoff Ready** | Handoff payload complete — valid `handoff_target` provided and handoff rules pass; handoff service can create record; **false when target missing** | `assertHandoffTargetProvided()` in `src/lib/validations/handoff.ts`; `createHandoff()` in `handoff.service.ts` | Payload `handoff_target` at handoff attempt; persisted `handoff_records`; report `project.handoff_status` | **High** — no distinct `handoff_ready` field exists today; `can_handoff` from workflow gate is **true** in SIM-007/NP-004 while target is missing; must not derive Handoff Ready from `can_handoff` or E6 tier alone |

### 2.2 Technical Definability Verdict

| State | Technically definable? | Notes |
|-------|------------------------|-------|
| Validation Ready | **YES** | Map to `deriveReadinessTier() === "Ready"` OR explicit boolean from same inputs; distinct from Handoff Ready |
| Export Eligible | **YES** | Map to `!isReportExportBlocked(unresolved_blocks)`; independent of handoff payload |
| Handoff Ready | **YES** (with new helper) | Requires new display derivation — check `handoff_target` presence + handoff guard preconditions; **must not** use `can_handoff` alone |

### 2.3 NP-004 Baseline Alignment

Post-lock, clean validation, missing `handoff_target` (NP-004 / SIM-007):

| State | Expected value | Current code behavior | Gap |
|-------|----------------|----------------------|-----|
| Validation Ready | **true** | E6 tier = Ready | Label ambiguity only |
| Export Eligible | **true** | `isReportExportBlocked(0)` = false; export succeeds | Metadata lacks `validation-only` authorization label |
| Handoff Ready | **false** | `HANDOFF_TARGET_REQUIRED` (403); 0 handoff records | Not exposed as distinct visible state |

---

## 3. Implementation Boundary Assessment

### 3.1 Boundary Clarity

| Question | Answer |
|----------|--------|
| Can WS-01B proceed without Option A gate unification? | **YES** — boundary §5 explicitly excludes `isReportExportBlocked()` handoff dimension |
| Can WS-01B proceed without Option C export mode split? | **YES** — no `summary` / `handoff` taxonomy in scope |
| Can WS-01B proceed without broad workflow rewrite? | **YES** — CC-STD + CC-CTL only |
| Can WS-01B proceed without migration? | **YES** — boundary §5 excludes `prisma/` unless separately approved |
| Will Sprint 7/8 evidence interpretation change? | **NO** — NP-004 `export_succeeded: true` preserved per AC-05 |
| Can TD-7B-003 be silently closed in WS-01B? | **NO** — SC-10; AC-09; boundary §5 |

**Verdict:** Implementation boundary is **clear and sufficient** for WS-01B scoped work.

### 3.2 Scope Creep Guards

| Out-of-scope item | Boundary reference | Engineering assessment |
|-------------------|-------------------|------------------------|
| Export gate predicate change | Boundary §7 | Correctly fenced — CC-HR |
| Handoff guard change | Boundary §7 | Correctly fenced — M-06 enforcement |
| `deriveReadinessTier()` tier rule change | Boundary §5 | Correctly fenced — E6 semantics risk |

---

## 4. Likely Technical Touchpoints

Analysis only — **no modifications in WS-01B-0A.**

### 4.1 Readiness / State Derivation

| Path | WS-01B likely change |
|------|---------------------|
| `src/lib/validations/readiness.ts` | Add composite state helpers: `deriveValidationReady()`, `deriveExportEligible()`, `deriveHandoffReady()` (or equivalent) |
| `src/lib/services/boq-summary-report.service.ts` | Expose three states on `BoqSummaryReportValidation`; replace ambiguous `ready_status`-only display |
| `src/lib/validations/reporting.ts` | Add state fields to `BoqConsolidatedReport`; **no** `isReportExportBlocked()` predicate change |

### 4.2 Export Metadata

| Path | WS-01B likely change |
|------|---------------------|
| `src/lib/services/export.service.ts` | Footer/metadata: `export_authorization_layer: validation-only`; relabel `"Ready Status"` rows |
| `src/lib/validations/export.ts` | Metadata type definitions |
| `src/app/api/projects/[projectId]/boq/[boqVersionId]/export/route.ts` | Pass-through if needed |
| `src/components/boq/summary-export-buttons.tsx` | User-facing label: validation-ready export |

### 4.3 Handoff Display (Not Guard)

| Path | WS-01B likely change |
|------|---------------------|
| `src/lib/services/handoff.service.ts` | Display helper only — **no** `assertHandoffTargetProvided()` change |
| `src/lib/validations/handoff.ts` | Unchanged |
| `src/components/boq/handoff-actions.tsx` | Handoff Ready indicator |

### 4.4 Reporting / UI

| Path | WS-01B likely change |
|------|---------------------|
| `src/components/boq/summary-report-sections.tsx` | Three-state composite display; remove unqualified "Ready" |
| `src/app/projects/[projectId]/boq/[boqVersionId]/summary/page.tsx` | Management-facing labels |
| `src/lib/actions/boq-summary.actions.ts` | Wire new report fields |

### 4.5 Tests (Future WS-01B)

| Path | WS-01B likely change |
|------|---------------------|
| `tests/readiness.test.ts` | Validation Ready derivation |
| `tests/export-gate.test.ts` | Gate unchanged; metadata assertions |
| `tests/handoff.test.ts` | Handoff Ready false when target missing |
| `tests/reporting-governance.test.ts` | Three-state separation |
| `tests/reporting-governance-warning.test.ts` | State consistency under WARNING tier |

### 4.6 Documentation Deliverables

| Path | Purpose |
|------|---------|
| `docs/SPRINT_9/WS01/TD_7B_003_LAYER_SSOT.md` | Signed layer-separation SSOT |
| `docs/SPRINT_9/WS01/evidence/NP-004-rerun/` | NP-004 replay |
| `docs/SPRINT_9/WS01/evidence/SIM-007-rerun/` | SIM-007 replay |

---

## 5. Engineering Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Export Eligible misread as Handoff Ready | **High** | AC-02/AC-04; distinct labels; export metadata `validation-only`; report footer when Handoff Ready = false; T-10 evidence |
| Handoff Ready derived from `can_handoff` or E6 tier instead of payload | **High** | Derive from `handoff_target` + handoff guard preconditions; AC-03.2; unit test in `handoff.test.ts`; document in layer SSOT |
| E6/E7 metadata inconsistency across artifacts | **Medium** | AC-07; T-11 cross-artifact compare; additive fields only |
| Regression of NP-004 / SIM-007 layer-separation behavior | **High** | AC-05/AC-06; T-01/T-02 replay; SC-09/SC-05 stop conditions; no export gate predicate change |
| Over-expansion into Option C (export mode split) | **Medium** | Boundary §5; change class CC-HR fence; implementation prompt scope check |
| `ready_status` label retained without layer context | **Medium** | AC-04.3; replace or qualify in export sheets and summary UI |
| WARNING tier + Export Eligible interaction | **Low** | `isReportExportBlocked` uses BLOCK count only; document WARNING-forwardable vs Handoff Ready separation |

---

## 6. Acceptance Criteria Completeness

| Area | Complete? | Gap / note |
|------|-----------|------------|
| AC-01 Validation Ready | **YES** | Clear derivation and visibility requirements |
| AC-02 Export Eligible | **YES** | Explicit anti-confusion rule |
| AC-03 Handoff Ready | **YES** | Clarify: derivation source is payload/guard, not `can_handoff` |
| AC-04 Metadata | **YES** | Authorization layer label specified |
| AC-05 NP-004 preservation | **YES** | Behavior baseline explicit |
| AC-06 SIM-007 consistency | **YES** | Handoff guard unchanged |
| AC-07 E6/E7 separation | **YES** | Cross-artifact consistency required |
| AC-08 Test coverage | **YES** | T-01..T-12 matrix defined |
| AC-09 TD closure gating | **YES** | SC-10 aligned |
| AC-10 Non-claims | **YES** | Production Readiness / MVP Freeze excluded |

**Verdict:** Acceptance criteria are **complete enough** to guide WS-01B implementation.

---

## 7. YELLOW Items (Non-Blocking)

| ID | Item | Resolution owner | When |
|----|------|------------------|------|
| Y-ENG-01 | Handoff Ready derivation must explicitly exclude `can_handoff` as sole input | Engineering Lead | WS-01B implementation design |
| Y-ENG-02 | Export xlsx/pdf currently embed unqualified `"Ready Status"` — replacement wording needed | Engineering Lead | WS-01B CC-CTL |
| Y-ENG-03 | `deriveHandoffReady()` helper design not yet in code — specification only | Engineering Lead | WS-01B first commit |

---

## 8. RED Blockers

| ID | Blocker | Status |
|----|---------|--------|
| — | None identified | **CLEAR** |

No engineering RED blockers prevent human sign-off or subsequent WS-01B implementation **after** §10 signatures.

---

## 9. Engineering Recommendation

| Field | Value |
|-------|-------|
| Recommendation | **ENGINEERING READY FOR SIGN-OFF** |
| Implementation authorized | **NO** — pending Engineering Lead §10 human signature |
| TD-7B-003 | **OPEN** |
| Code changed in WS-01B-0A | **NO** |

### Rationale

1. All three states are **technically definable** from existing validation, export, and handoff code paths.
2. Implementation boundary **clearly excludes** Option A/C scope creep, migrations, and gate predicate changes.
3. Acceptance criteria and evidence test plan provide **sufficient verification** for WS-01B.
4. Identified risks have **documented mitigations** aligned with PS-04 stop conditions.
5. YELLOW items are **implementation-detail clarifications**, not pre-sign-off blockers.

---

## 10. Governance Statements

| Claim | Status |
|-------|--------|
| Engineering review complete | **YES** |
| Engineering Lead human sign-off | **PENDING** |
| WS-01B implementation authorized | **NO** |
| TD-7B-003 closed | **NOT CLAIMED** — **OPEN** |
| Production Readiness | **NOT CLAIMED** |
| MVP Freeze | **NOT CLAIMED** |

End of WS-01B Engineering Review.
