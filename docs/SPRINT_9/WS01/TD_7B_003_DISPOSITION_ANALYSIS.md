# TD-7B-003 Disposition Analysis — HUB IT BOQ V3

| Field | Value |
|-------|-------|
| System | HUB IT BOQ V3 — ERP-ready BOQ Cost Intelligence System |
| Sprint | 9-1B — WS-01A TD-7B-003 Resolution Analysis |
| Deliverable | Disposition Analysis (primary) |
| Document type | **ARCHITECTURE DECISION / GOVERNANCE / DOCUMENTATION ONLY** |
| Branch | `main` |
| Generated | 2026-06-13 |
| TD ID | **TD-7B-003** — Handoff readiness / export gate alignment |
| Status at analysis | **OPEN / HIGH** |
| Parent workstream | WS-01 — TD-7B-003 Resolution |
| Safety framework | [PS-01](../WS07/PRODUCTION_SAFETY_POLICY.md) through [PS-06](../WS07/PRODUCTION_SAFETY_SIGNOFF.md) |

---

## 1. Executive Summary

TD-7B-003 is a **confirmed architecture gap**, not an undetected runtime defect. Sprint 7 SIM-007 and Sprint 8 NP-004 independently prove the same behavior:

- Post-lock validation is **Pass**; E6 readiness tier is **Ready**
- Handoff layer correctly blocks with **HANDOFF_TARGET_REQUIRED** (403); 0 handoff records
- Export gate is **validation-oriented only** — export may succeed while handoff payload is incomplete

The gap is **semantic misalignment**: management reporting (E6/E7) can imply forward readiness without reflecting handoff payload completeness. Operations and procurement may treat "Ready + export succeeded" as handoff-ready when handoff has not occurred.

This analysis compares three disposition options. **No option is implemented in WS-01A.** WS-01B code work is blocked until Product / Governance sign-off ([TD_7B_003_SIGNOFF_REQUEST.md](TD_7B_003_SIGNOFF_REQUEST.md)).

**Recommended disposition:** **Option B — Signed Layer-Separation SSOT**, with **mandatory visibility enhancements** (composite readiness display, export metadata labeling, procurement/ops runbook). Option C is an **acceptable alternative** if Product requires differentiated export modes without full gate unification.

---

## 2. Confirmed Behavior

| Layer | Post-lock, clean validation, missing `handoff_target` | Code SSOT |
|-------|--------------------------------------------------------|-----------|
| **Validation (E2)** | Pass — 0 unresolved BLOCK | `validation.service.ts` |
| **Readiness (E6)** | Tier = **Ready** | `deriveReadinessTier()` — validation-only input |
| **Workflow gate** | `can_approve=true`, `can_handoff=true` | `getWorkflowGate()` — HANDOFF_BLOCK_RULES only |
| **Approval** | Locked BOQ (setup complete in scenarios) | `approval.service.ts` |
| **Handoff (E5)** | **Blocked** — `HANDOFF_TARGET_REQUIRED` 403 | `assertHandoffTargetProvided()` in `handoff.service.ts` |
| **Export (E7)** | **Allowed** — xlsx/pdf generated (NP-004) | `isReportExportBlocked(unresolved_blocks)` only |
| **Reporting** | `handoff_status` = "Not handed off"; `ready_status` = Ready | `boq-summary-report.service.ts` |

**Key code observation (read-only):**

Export gate checks unresolved validation BLOCK count only — not handoff payload completeness:

```294:302:src/lib/services/export.service.ts
    if (isReportExportBlocked(report.validation.unresolved_blocks)) {
      return {
        ok: false as const,
        blocked: true as const,
        error: `Export ถูกบล็อก — มี unresolved BLOCK ${report.validation.unresolved_blocks} รายการ ต้อง resolve ก่อน export`,
      };
    }
```

Handoff payload guard is enforced **only** at `createHandoff`, not at export:

```41:51:src/lib/validations/handoff.ts
export function assertHandoffTargetProvided(
  handoffTarget?: HandoffTarget | null,
): asserts handoffTarget is HandoffTarget {
  if (!isHandoffTarget(handoffTarget)) {
    throw new AppError(
      "Handoff ต้องระบุ handoff_target (Procurement, Construction, ClientHandover)",
      HANDOFF_TARGET_REQUIRED_CODE,
      403,
    );
  }
}
```

---

## 3. Evidence from SIM-007

| Field | Value |
|-------|-------|
| Scenario | SIM-007 — Handoff Payload Incomplete |
| Result | **PASS WITH WARNING** |
| BOQ Version ID | `68035a1f-6eb4-4fa8-8a57-4908e515af7e` |
| Evidence root | `docs/SPRINT_7B/evidence/SIM-007/` |
| Execution report | [SIM-007.md](../../SPRINT_7B/EXECUTION_REPORT/SIM-007.md) |
| Final green check | [FINAL_GREEN_CHECK.md](../../SPRINT_7B/PHASE3_SIM-007/FINAL_GREEN_CHECK.md) |

### SIM-007 findings

| Check | Result |
|-------|--------|
| Handoff block code | `HANDOFF_TARGET_REQUIRED` (403) ×2 |
| Handoff records | 0 |
| Post-lock validation | Pass |
| E6 readiness tier | Ready |
| Export artifacts (official run) | None generated; gate **allowed** (validation-only) |
| False Completed handoff | **Not observed** |
| Operational Readiness PASS | **NOT CLAIMED** |

E7 metadata: *"Export gate is validation-only; export technically allowed post-lock while handoff payload incomplete."*

SIM-007 proves **handoff layer enforcement** (M-06 guard). It does **not** prove export and handoff share a unified forwardability gate.

---

## 4. Evidence from NP-004

| Field | Value |
|-------|-------|
| Scenario | NP-004 — Handoff Without Target |
| Result | **PASS WITH WARNING** |
| Persona | Procurement |
| BOQ Version ID | `290e2839-2b0e-46f6-8af4-20a128bd48ac` |
| Evidence root | `docs/SPRINT_8/WAVE2/evidence/NP-004/` |
| Execution report | [NP-004.md](../../SPRINT_8/WAVE2/EXECUTION_REPORT/NP-004.md) |

### NP-004 observed state (E9 JSON)

```json
{
  "e6_readiness_tier": "Ready",
  "e6_unresolved_blocks": 0,
  "handoff_blocked": true,
  "handoff_block_code": "HANDOFF_TARGET_REQUIRED",
  "handoff_record_count": 0,
  "export_blocked": false,
  "export_succeeded": true
}
```

NP-004 **CONFIRMS** SIM-007 layer separation — not a one-off bug. Wave 2 final green check: TD-7B-003 **remains OPEN**.

Sources: [FINAL_GREEN_CHECK.md](../../SPRINT_8/WAVE2/FINAL_GREEN_CHECK.md) §6; [TD_AND_CARRYOVER_REVIEW.md](../../SPRINT_8/CLOSURE/TD_AND_CARRYOVER_REVIEW.md) §2.

---

## 5. Current Gate Chain

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Validation  │────▶│  Readiness   │────▶│   Approval   │────▶│   Handoff    │────▶│    Export    │
│  E2 findings │     │  E6 tier     │     │  E4 stages   │     │  E5 record   │     │  E7 files    │
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
       │                    │                    │                    │                    │
  BLOCK rules          deriveReadiness      role authority      handoff_target        unresolved
  WARNING rules        (validation-only)    + lock              required (M-06)       BLOCK count
                                                                                     (validation-only)
```

**Divergence point (TD-7B-003):** After approval + lock with clean validation, **handoff payload completeness** is enforced only at the Handoff API — not reflected in E6 tier or export gate.

---

## 6. Problem Interpretation

### 6.1 What TD-7B-003 is

| Classification | Rationale |
|----------------|-----------|
| **Architecture / semantics gap** | Layers intentionally separate; export SSOT predates handoff payload guard (M-06) |
| **Not a silent false PASS** | Sprint 8 false PASS count = 0; NP-004 documented as PASS WITH WARNING |
| **Not a handoff enforcement failure** | HANDOFF_TARGET_REQUIRED works; 0 records |
| **Operational safety risk** | Management/procurement may over-interpret E6 Ready + export success |

### 6.2 What TD-7B-003 is not

- Not an export BLOCK bypass on validation BLOCK (NP-003 proves export blocks correctly)
- Not a post-revoke export leak (NP-006 proves revoke blocks export)
- Not missing handoff schema (TD-7A-010 closed — `handoff_target` enum exists)
- Not a reason to invalidate Sprint 7/8 evidence — evidence correctly captured actual architecture

### 6.3 Root cause (technical)

| Component | Behavior |
|-----------|----------|
| `deriveReadinessTier()` | Inputs: validation blocks, warnings, `can_approve` — **no handoff payload dimension** |
| `getWorkflowGate().can_handoff` | True when no HANDOFF_BLOCK_RULE validation findings — **not** when `handoff_target` provided |
| `exportService.loadReportForExport()` | Blocks on `unresolved_blocks > 0` only |
| `handoffService.createHandoff()` | Blocks on missing `handoff_target` — **downstream of readiness/export path** |

---

## 7. Option A — Unify Gates

### Definition

Export, readiness, and handoff forwardability use a **unified gate**. If handoff payload is incomplete, export is blocked and readiness tier reflects handoff-incomplete state.

### Implementation sketch (WS-01B — not executed here)

- Extend `isReportExportBlocked()` or export pre-check to include handoff completeness predicate
- Extend `deriveReadinessTier()` or add composite tier input for handoff payload state
- Align E6/E7 with handoff block semantics
- NP-004 expected outcome **changes**: `export_blocked: true`

### Pros

- Strongest operational safety — no export while handoff incomplete
- Eliminates E6 Ready vs handoff-block ambiguity
- Aligns with PS-01 default rule without SSOT exception
- Clear auditor interpretation

### Cons

- **Changes established NP-004 behavior** — regression suite must be re-baselined
- May block legitimate procurement **commercial BOQ export** before handoff target is known
- CC-HR — touches export gate + readiness semantics
- Higher rollback and regression risk (RT-001, RT-004)

---

## 8. Option B — Signed Layer-Separation SSOT

### Definition

Export and handoff are **separate layers by design**:

- **Export layer** = validation-oriented BOQ summary export (commercial / internal reporting)
- **Handoff layer** = operational transfer requiring `handoff_target` + completed handoff record
- Export may proceed when validation/export criteria pass, even if handoff payload is incomplete
- Behavior must be **explicit, visible, documented** — not implied by E6 Ready alone

### Implementation sketch (WS-01B — not executed here)

**Documentation (CC-STD):**

- Signed layer-separation SSOT document (product acceptance)
- Update PS-01 §12 with explicit exception (already anticipated)
- Procurement / ops runbook: "Export ≠ Handoff-ready"

**Visibility enhancements (CC-CTL):**

- Composite readiness display: separate `validation_ready` vs `handoff_ready` indicators
- Export file metadata/footer: `export_authorization_layer: validation-only`
- UI labels on export button: "BOQ Summary Export (Validation-Ready)"
- E6 evidence capture: add `handoff_payload_complete` flag

### Pros

- Preserves Sprint 7/8 proven behavior — NP-004 remains valid evidence
- Lower implementation risk than full gate unification
- Matches current code architecture (intentional layer separation per E7 notes)
- Faster S9 disposition — documentation + visibility vs deep gate refactor
- Procurement can export BOQ summary for costing while handoff target TBD

### Cons

- Requires **disciplined visibility** — without UI/report changes, ambiguity persists
- Management may still misread if composite display not implemented
- PS-01 §12 exception must be signed — governance overhead
- Does not add new export mode differentiation (see Option C)

### Mandatory conditions (non-negotiable for Option B acceptance)

1. E6/E7 must **not** label BOQ as "Handoff-Ready" when `handoff_target` missing
2. Export artifacts must carry **validation-only authorization** label
3. Product Owner signs layer-separation SSOT
4. NP-004 re-run post-visibility changes confirms no silent false PASS
5. TD-7B-003 closed only with sign-off + evidence — not documentation alone

---

## 9. Option C — Hybrid / Export Mode Split

### Definition

Introduce **export mode taxonomy**:

| Mode | Gate | Use case |
|------|------|----------|
| **Commercial / Summary Export** | Validation-only (current) | Procurement costing, internal review |
| **Handoff / Client-Handover Export** | Validation + handoff completeness | Client delivery, construction handover packages |

Export API or UI selects mode. Handoff-mode export blocked until `handoff_target` provided and handoff rules pass. Commercial mode retains current NP-004 behavior with explicit labeling.

### Why Option C may be warranted

Option A over-blocks commercial export. Option B accepts divergence but does not provide a **named** handoff-grade export path. Option C resolves both without collapsing layers.

### Pros

- Best user clarity and procurement ergonomics
- Strong handoff integrity for client-handover path
- V2/ERP extensibility — downstream can key off export mode
- Does not require reinterpreting Sprint 7/8 evidence (commercial mode = current)

### Cons

- **Highest implementation scope** in S9 — new API surface, UI, tests
- CC-HR for handoff-mode gate; CC-CTL for labeling
- Risk of mode confusion if UI not distinct
- May touch S10 freeze timeline if scope expands

**Status:** Acceptable alternative — not forced.

---

## 10. Risk Analysis

| Risk ID | Risk | Option A | Option B | Option C |
|---------|------|----------|----------|----------|
| R-01 | Management misreads E6 Ready as handoff-ready | Low | Medium (mitigated by visibility) | Low |
| R-02 | Procurement blocked from pre-handoff export | High | Low | Low |
| R-03 | Regression / false PASS | Medium | Low | Medium |
| R-04 | S10 freeze delay | Medium | Low | High |
| R-05 | ERP downstream assumes export = handoff | Medium | Medium (mitigated by SSOT) | Low |
| R-06 | Fix incorrectly — silent TD close | Low | Low (if sign-off enforced) | Low |
| R-07 | Not fixed — TD remains OPEN at S10 | High | Low (if signed) | Low |

Inherited register: [R-S9-001](../PLAN/S9_RISK_REGISTER.md)

---

## 11. Change Classification

Per [CHANGE_CLASSIFICATION_MATRIX.md](../WS07/CHANGE_CLASSIFICATION_MATRIX.md) (PS-02):

| Option | WS-01B classification | Approval | Rollback | Regression | Evidence |
|--------|----------------------|----------|----------|------------|----------|
| **A — Unify gates** | **CC-HR** | Reviewer + Manager + Product | RT-001..RT-004 mandatory | NP-003, NP-004, NP-006, NP-007, SIM-007 | E1–E9 NP-004 re-baseline |
| **B — SSOT doc only** | **CC-STD** | Reviewer | Git revert | None for doc | Signed SSOT + PS-01 §12 update |
| **B — SSOT + visibility** | **CC-CTL** | Reviewer + Manager notify | RT-010 | NP-004, reporting display | E6/E7 enhanced capture |
| **C — Hybrid implementation** | **CC-HR** | Reviewer + Manager + Product | RT-001, RT-002 | Full Wave 2 export/handoff subset + SIM-007 | New export_mode evidence |

**WS-01A (this package):** CC-STD — documentation only.

### Applicable stop conditions (PS-04)

| Stop ID | Applies if |
|---------|------------|
| SC-09 | Option A/C implemented incorrectly — export 200 on validation BLOCK |
| SC-10 | Any option closes TD without evidence + sign-off |
| SC-06 | Option A/C deploy without rollback drill |
| SC-12 | Option claims Production Readiness as part of fix |

---

## 12. Recommended Disposition

| Field | Value |
|-------|-------|
| **Primary recommendation** | **Option B — Signed Layer-Separation SSOT** |
| **Required with Option B** | Mandatory visibility enhancements (composite readiness, export labeling) — CC-CTL wave |
| **Alternative** | **Option C** if Product prioritizes named export modes over faster SSOT disposition |
| **Not recommended as primary** | **Option A** — valid on safety grounds but high procurement impact and NP-004 behavior change |

### Rationale

1. Sprint 7/8 evidence treats layer separation as **documented architecture**, not defect
2. NP-004 CONFIRMS current code intent — unification would **change** proven behavior
3. PS-01 already defines Option B path (signed SSOT updates §12)
4. Option B closes TD-7B-003 at governance level with lower regression risk
5. Visibility enhancements address the real harm (ambiguous readiness)
6. Option C remains available if Product rejects implicit dual-layer semantics

---

## 13. Required Sign-off

| Role | Decision required |
|------|-------------------|
| **Product Owner** | Approve Option A, B, or C (or Hold) |
| **Engineering Lead** | Confirm implementation scope and CC classification |
| **Governance Reviewer** | Confirm no silent TD closure; evidence plan acceptable |
| **Operations / Support** | Confirm runbook and display changes operable |

Sign-off table: [TD_7B_003_SIGNOFF_REQUEST.md](TD_7B_003_SIGNOFF_REQUEST.md)

**WS-01B blocked until decision recorded.**

---

## 14. Out of Scope (WS-01A)

| Item | Status |
|------|--------|
| Code changes | **NOT PERFORMED** |
| Export / handoff service edits | **NOT PERFORMED** |
| Migration | **NOT PERFORMED** |
| Simulation / test execution | **NOT PERFORMED** |
| TD-7B-003 closure | **NOT CLAIMED** |
| Production Readiness | **NOT CLAIMED** |
| MVP Freeze | **NOT CLAIMED** |
| Sprint 10 | **NOT STARTED** |

---

## 15. Final Recommendation

| Field | Value |
|-------|-------|
| **Disposition package** | **COMPLETE** |
| **Recommended option** | **Option B** (+ mandatory visibility enhancements) |
| **TD-7B-003 status** | **OPEN** — awaiting Product / Governance sign-off |
| **WS-01A outcome** | **READY FOR PRODUCT SIGN-OFF** |
| **Next workstream** | WS-01B — implementation per signed option only |

> TD-7B-003 is a confirmed, documented architecture gap. This analysis does **not** fix it and does **not** close it. Product must choose Option A, B, or C before WS-01B begins.

End of TD-7B-003 Disposition Analysis.
