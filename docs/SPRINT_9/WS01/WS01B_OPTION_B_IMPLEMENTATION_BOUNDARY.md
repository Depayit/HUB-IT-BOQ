# WS-01B Option B — Implementation Boundary — HUB IT BOQ V3

| Field | Value |
|-------|-------|
| System | HUB IT BOQ V3 — ERP-ready BOQ Cost Intelligence System |
| Sprint | 9-1B-2 — WS-01B-0 |
| Workstream | WS-01 — TD-7B-003 Resolution (Option B) |
| Document type | **GOVERNANCE / IMPLEMENTATION BOUNDARY** |
| Branch | `main` |
| Generated | 2026-06-13 |
| TD ID | **TD-7B-003** |
| TD status | **OPEN** |
| Product Owner decision | **APPROVE OPTION B WITH CONDITIONS** (2026-06-13) |
| Parent analysis | [TD_7B_003_DISPOSITION_ANALYSIS.md](TD_7B_003_DISPOSITION_ANALYSIS.md) |
| Sign-off reference | [TD_7B_003_SIGNOFF_REQUEST.md](TD_7B_003_SIGNOFF_REQUEST.md) §10 |
| Acceptance criteria | [WS01B_OPTION_B_ACCEPTANCE_CRITERIA.md](WS01B_OPTION_B_ACCEPTANCE_CRITERIA.md) |
| Change class | CC-STD (SSOT doc) + CC-CTL (visibility labels) |

---

## 1. Purpose

Define the **safe implementation boundary** for WS-01B Option B after Product Owner sign-off. This document does **not** authorize code changes by itself. WS-01B code work begins only after:

1. Engineering Lead, Governance Reviewer, and Operations / Support complete §10 sign-off in [TD_7B_003_SIGNOFF_REQUEST.md](TD_7B_003_SIGNOFF_REQUEST.md), and
2. A separate WS-01B implementation prompt is issued.

**WS-01B-0 status:** boundary and acceptance criteria recorded only — **no implementation executed**.

---

## 2. Product Owner Decision Summary

| Field | Value |
|-------|-------|
| Selected option | **Option B** — Signed Layer-Separation SSOT + Mandatory Visibility Enhancements |
| Decision | **APPROVE OPTION B WITH CONDITIONS** |
| Date | 2026-06-13 |

### Mandatory conditions (non-negotiable)

WS-01B must define and expose **three separate visible states**:

| State | Meaning (intended) |
|-------|-------------------|
| **Validation Ready** | Validation layer satisfied — no unresolved BLOCK; E6 tier may show Ready |
| **Export Eligible** | BOQ summary export permitted under validation-only gate — **does not imply handoff readiness** |
| **Handoff Ready** | Handoff payload complete — `handoff_target` provided and handoff rules pass; false when target missing |

TD-7B-003 must **not** be closed until evidence proves these states are visible, consistent, and do not mislead users into interpreting **Export Eligible** as **Handoff Ready**.

---

## 3. Architectural Intent (Option B)

Layer separation is **intentional and preserved**:

```
Validation ──▶ Readiness (E6) ──▶ Approval ──▶ Handoff (E5) ──▶ Export (E7)
     │                │                              │              │
  BLOCK rules    deriveReadinessTier()         handoff_target    isReportExportBlocked()
                 (validation-only)              required          (validation-only)
```

**WS-01B adds visibility — not gate unification.** NP-004 behavior (`export_succeeded: true` while `HANDOFF_TARGET_REQUIRED`) remains valid evidence of layer separation unless Product re-decides.

---

## 4. In Scope for WS-01B

| # | Work item | Notes |
|---|-----------|-------|
| 1 | Define separate state labels | Validation Ready / Export Eligible / Handoff Ready — SSOT naming in doc + code |
| 2 | Layer-separation SSOT document | Signed product acceptance; update PS-01 §12 exception path |
| 3 | Reporting / summary visibility | Composite display on BOQ summary report and related UI |
| 4 | Export metadata labeling | Footer or metadata field: e.g. `export_authorization_layer: validation-only` |
| 5 | E6/E7 evidence fields | Additive metadata capturing all three states where applicable |
| 6 | User-facing wording | Labels such as "BOQ Summary Export (Validation-Ready)" where export UI exists |
| 7 | Ops runbook | Document export ≠ handoff-ready semantics for Operations / Support |
| 8 | Tests | Prove state separation; NP-004 replay; SIM-007 replay per [TD_7B_003_EVIDENCE_TEST_PLAN.md](TD_7B_003_EVIDENCE_TEST_PLAN.md) |
| 9 | Preserve layer behavior | No export block solely because `handoff_target` is missing |
| 10 | Preserve NP-004 | `export_succeeded: true` with handoff blocked remains accepted baseline |

---

## 5. Out of Scope for WS-01B

| Item | Reason |
|------|--------|
| Option A gate unification | Product rejected; export must not block on missing handoff target alone |
| Option C export mode split | Not selected; no `summary` / `handoff` export taxonomy unless separately approved |
| Blocking summary export when handoff target missing | Violates Option B layer separation |
| Changing `isReportExportBlocked()` predicate to include handoff completeness | Option A scope (CC-HR) |
| Changing `assertHandoffTargetProvided()` behavior | Handoff guard remains; visibility only |
| Changing `deriveReadinessTier()` tier rules without Product approval | E6 semantics change risk |
| Database migration | Not approved in WS-01B boundary unless later explicitly approved |
| Broad workflow rewrite | Beyond CC-CTL visibility scope |
| TD-7B-003 closure without evidence | SC-10 stop condition |
| Production Readiness claim | Out of WS-01 scope |
| MVP Freeze claim | Out of WS-01 scope |
| Sprint 10 work | Not started |

---

## 6. Likely Touchpoints (Future WS-01B — Do Not Edit in WS-01B-0)

Analysis only. Actual repo paths confirmed read-only at WS-01B-0 baseline.

### 6.1 Readiness / validation state

| Path | Current role | WS-01B likely change |
|------|--------------|---------------------|
| `src/lib/validations/readiness.ts` | `deriveReadinessTier()`, E6 SSOT | Add composite helpers or separate state derivations for Validation Ready |
| `src/lib/services/boq-summary-report.service.ts` | Assembles report; sets `ready_status`, `handoff_status` | Expose Validation Ready / Export Eligible / Handoff Ready on report model |
| `src/lib/validations/reporting.ts` | Report types, `isReportExportBlocked()` | Add state fields to `BoqConsolidatedReport`; doc-only for export gate predicate |
| `src/lib/services/validation.service.ts` | `getWorkflowGate()` | Possible read-only hook for Handoff Ready display (not gate change) |

### 6.2 Export metadata / report generation

| Path | Current role | WS-01B likely change |
|------|--------------|---------------------|
| `src/lib/services/export.service.ts` | Validation-only export gate; file generation | Export metadata/footer labeling only — **not** gate predicate change |
| `src/lib/validations/export.ts` | Export validation types | Metadata field definitions |
| `src/app/api/projects/[projectId]/boq/[boqVersionId]/export/route.ts` | Export API route | Pass-through metadata if needed |
| `src/components/boq/summary-export-buttons.tsx` | Export UI | User-facing label: validation-ready export |

### 6.3 Handoff readiness status

| Path | Current role | WS-01B likely change |
|------|--------------|---------------------|
| `src/lib/services/handoff.service.ts` | `createHandoff()`, `assertHandoffTargetProvided()` | **Display helpers only** — no guard change |
| `src/lib/validations/handoff.ts` | `HANDOFF_TARGET_REQUIRED` guard | Unchanged unless bug fix separately approved |
| `src/lib/actions/handoff.actions.ts` | Server actions | Possible status surfacing |
| `src/components/boq/handoff-actions.tsx` | Handoff UI | Handoff Ready indicator |

### 6.4 Reporting summary / UI

| Path | Current role | WS-01B likely change |
|------|--------------|---------------------|
| `src/components/boq/summary-report-sections.tsx` | Summary report sections | Three-state composite display |
| `src/components/boq/summary-totals.tsx` | Totals display | Possible readiness strip |
| `src/app/projects/[projectId]/boq/[boqVersionId]/summary/page.tsx` | Summary page | Management-facing state labels |
| `src/lib/actions/boq-summary.actions.ts` | Summary actions | Wire new report fields |

### 6.5 Tests

| Path | Current role | WS-01B likely change |
|------|--------------|---------------------|
| `tests/readiness.test.ts` | Readiness tier tests | Validation Ready derivation |
| `tests/export-gate.test.ts` | Export gate tests | Confirm gate unchanged; metadata tests |
| `tests/handoff.test.ts` | Handoff guard tests | Handoff Ready false when target missing |
| `tests/reporting-governance.test.ts` | Reporting governance | Three-state separation |
| `tests/reporting-governance-warning.test.ts` | Warning path reporting | State consistency |
| `tests/reporting-validation.test.ts` | Report validation | Label completeness |

### 6.6 Documentation (WS-01B deliverables)

| Path | Purpose |
|------|---------|
| `docs/SPRINT_9/WS01/TD_7B_003_LAYER_SSOT.md` | Signed layer-separation SSOT (Option B) |
| `docs/SPRINT_9/WS01/signoff/TD_7B_003_DECISION.md` | Final decision record post full §10 |
| `docs/SPRINT_9/WS01/evidence/NP-004-rerun/` | NP-004 replay evidence |
| `docs/SPRINT_9/WS01/evidence/SIM-007-rerun/` | SIM-007 replay evidence |
| `docs/SPRINT_9/WS01/FINAL_GREEN_CHECK.md` | WS-01B closure green check |

---

## 7. Files That Must Not Be Touched (Without Separate Approval)

| Category | Paths / scope | Reason |
|----------|---------------|--------|
| Export gate predicate | `isReportExportBlocked()` handoff dimension | Option A — CC-HR |
| Handoff guard | `assertHandoffTargetProvided()` in `handoff.ts` | M-06 enforcement; not visibility |
| Prisma schema / migrations | `prisma/` | Not approved in WS-01B boundary |
| Approval service | `src/lib/services/approval.service.ts` | Out of TD-7B-003 scope |
| Validation engine rules | BLOCK/WARNING rule definitions | Out of scope |
| Sprint 7/8 evidence archives | `docs/SPRINT_7B/`, `docs/SPRINT_8/` | Read-only reference |
| Production safety policy core | PS-01..PS-06 except §12 SSOT update | Governance-controlled |

---

## 8. Change Classification

Per [CHANGE_CLASSIFICATION_MATRIX.md](../WS07/CHANGE_CLASSIFICATION_MATRIX.md):

| Work package | Class | Approval required |
|--------------|-------|-------------------|
| Layer SSOT document | CC-STD | Governance Reviewer |
| Visibility labels / composite display | CC-CTL | Engineering Lead + Manager notify |
| Any export gate predicate change | **CC-HR — OUT OF SCOPE** | N/A |
| Any handoff guard change | **CC-HR — OUT OF SCOPE** | N/A |

---

## 9. Stop Conditions (PS-04)

| Stop ID | Trigger if WS-01B violates boundary |
|---------|--------------------------------------|
| SC-09 | Export 200 while validation BLOCK |
| SC-10 | TD closed without evidence + full sign-off |
| SC-05 | Silent false PASS on NP-004 re-run |
| SC-12 | Production Readiness claimed as part of fix |

---

## 10. Governance Statements

| Claim | Status |
|-------|--------|
| WS-01B-0 implementation executed | **NO** |
| Code modified in WS-01B-0 | **NO** |
| Product Owner decision recorded | **YES** |
| Engineering / Governance / Ops sign-off | **PENDING** |
| TD-7B-003 closed | **NOT CLAIMED** — **OPEN** |
| Production Readiness | **NOT CLAIMED** |
| MVP Freeze | **NOT CLAIMED** |
| NP-004 behavior change authorized | **NO** |

---

## 11. Entry Criteria for WS-01B Code Work

Before any WS-01B implementation prompt executes code changes:

1. Engineering Lead §10 sign-off — scope and CC class confirmed
2. Governance Reviewer §10 sign-off — evidence plan acceptable; no silent TD closure
3. Operations / Support §10 sign-off — runbook operability confirmed
4. This boundary document and [WS01B_OPTION_B_ACCEPTANCE_CRITERIA.md](WS01B_OPTION_B_ACCEPTANCE_CRITERIA.md) reviewed and accepted
5. Rollback drill plan for CC-CTL visibility changes per [ROLLBACK_TRIGGER_MATRIX.md](../WS07/ROLLBACK_TRIGGER_MATRIX.md)

---

## 12. Final Status

| Field | Value |
|-------|-------|
| WS-01B-0 outcome | **BOUNDARY PREPARED** |
| WS-01B code authorized | **NO** — pending remaining §10 roles |
| Next step | Engineering / Governance / Ops sign-off → WS-01B implementation prompt |

End of WS-01B Option B Implementation Boundary.
