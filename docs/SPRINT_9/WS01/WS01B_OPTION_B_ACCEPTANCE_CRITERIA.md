# WS-01B Option B — Acceptance Criteria — HUB IT BOQ V3

| Field | Value |
|-------|-------|
| System | HUB IT BOQ V3 — ERP-ready BOQ Cost Intelligence System |
| Sprint | 9-1B-2 — WS-01B-0 |
| Workstream | WS-01 — TD-7B-003 Resolution (Option B) |
| Document type | **GOVERNANCE / ACCEPTANCE CRITERIA** |
| Branch | `main` |
| Generated | 2026-06-13 |
| TD ID | **TD-7B-003** |
| TD status | **OPEN** — closure gated by this document |
| Product Owner decision | **APPROVE OPTION B WITH CONDITIONS** (2026-06-13) |
| Implementation boundary | [WS01B_OPTION_B_IMPLEMENTATION_BOUNDARY.md](WS01B_OPTION_B_IMPLEMENTATION_BOUNDARY.md) |
| Evidence test plan | [TD_7B_003_EVIDENCE_TEST_PLAN.md](TD_7B_003_EVIDENCE_TEST_PLAN.md) |
| Sign-off reference | [TD_7B_003_SIGNOFF_REQUEST.md](TD_7B_003_SIGNOFF_REQUEST.md) §10 |

---

## 1. Purpose

Define **acceptance criteria** that WS-01B implementation must satisfy before TD-7B-003 may be closed. These criteria are binding under Product Owner conditions (2026-06-13).

**WS-01B-0:** criteria defined only — **no tests executed**, **no code changed**.

---

## 2. Mandatory Visible States

All three states must be **defined, exposed, and independently readable** in reporting and/or export metadata:

| State | Definition | Must be visible when |
|-------|------------|---------------------|
| **Validation Ready** | Validation layer satisfied — 0 unresolved BLOCK; validation run complete; approval allowed per validation engine | Post-lock clean validation (NP-004 baseline) |
| **Export Eligible** | BOQ summary export permitted under validation-only gate (`isReportExportBlocked` false) | NP-004: export allowed while handoff blocked |
| **Handoff Ready** | Handoff payload complete — valid `handoff_target` and handoff rules pass | False when `handoff_target` missing (SIM-007 / NP-004) |

**Critical rule:** Export Eligible = true must **never** be displayed or labeled as Handoff Ready = true.

---

## 3. Acceptance Criteria

### AC-01 — Validation Ready visible and derived from validation state

| # | Criterion | Verification |
|---|-----------|--------------|
| AC-01.1 | Validation Ready is a distinct field or label — not collapsed into a single "Ready" that implies handoff | Report UI + E6 JSON |
| AC-01.2 | Derived from validation inputs: unresolved BLOCK count, validation run, `can_approve` | Unit test in `tests/readiness.test.ts` |
| AC-01.3 | When E6 tier = Ready and 0 BLOCK, Validation Ready = true | NP-004 E6 replay |
| AC-01.4 | When unresolved BLOCK > 0, Validation Ready = false | NP-003 pattern |

**Pass condition:** Validation Ready visible and traceable to validation layer only.

---

### AC-02 — Export Eligible visible and not confused with Handoff Ready

| # | Criterion | Verification |
|---|-----------|--------------|
| AC-02.1 | Export Eligible is a distinct field or label | Report UI + E7 JSON |
| AC-02.2 | Export Eligible = true when validation-only gate passes (0 unresolved BLOCK) | NP-004: `export_blocked: false` |
| AC-02.3 | UI and metadata use explicit wording (e.g. "Validation-Ready Export") — not "Handoff-Ready Export" | Export button label + file metadata |
| AC-02.4 | No single composite label implies all three states are true | Manual review + test assertion |

**Pass condition:** User cannot reasonably infer Handoff Ready from Export Eligible alone.

---

### AC-03 — Handoff Ready visible and false when handoff_target is missing

| # | Criterion | Verification |
|---|-----------|--------------|
| AC-03.1 | Handoff Ready is a distinct field or label | Report UI + E5/E6 context |
| AC-03.2 | Handoff Ready = false when `handoff_target` not provided | SIM-007 / NP-004 |
| AC-03.3 | Handoff API still returns `HANDOFF_TARGET_REQUIRED` (403) — guard unchanged | `tests/handoff.test.ts` |
| AC-03.4 | Handoff Ready = true only when target provided and handoff record creatable | Happy-path seed (T-05) |

**Pass condition:** Handoff Ready false in NP-004 scenario; visible on report.

---

### AC-04 — Report / export metadata must not imply handoff readiness when only export eligibility is true

| # | Criterion | Verification |
|---|-----------|--------------|
| AC-04.1 | Export file metadata includes authorization layer label (e.g. `validation-only`) | E7 artifact inspection |
| AC-04.2 | Report footer or summary section states export ≠ handoff-ready when Handoff Ready = false | Report HTML/PDF review |
| AC-04.3 | `ready_status` or successor fields do not use unqualified "Ready" without layer context | `boq-summary-report.service.ts` output |
| AC-04.4 | E7 JSON includes separated state fields | Evidence capture |

**Pass condition:** NP-004 export artifact explicitly labeled validation-only authorization.

---

### AC-05 — NP-004 remains PASS WITH WARNING or equivalent accepted layer-separation behavior

| # | Criterion | Verification |
|---|-----------|--------------|
| AC-05.1 | NP-004 replay: `handoff_blocked: true`, `handoff_block_code: HANDOFF_TARGET_REQUIRED` | T-02 evidence |
| AC-05.2 | NP-004 replay: `export_succeeded: true` (behavior preserved) | T-02 evidence |
| AC-05.3 | NP-004 replay: `export_blocked: false` | T-02 evidence |
| AC-05.4 | Result classification: PASS WITH WARNING or PASS — not silent false PASS | FINAL_GREEN_CHECK |

**Pass condition:** Layer separation preserved; ambiguity resolved via visibility only.

---

### AC-06 — SIM-007 behavior remains consistent

| # | Criterion | Verification |
|---|-----------|--------------|
| AC-06.1 | SIM-007 replay: HANDOFF_TARGET_REQUIRED (403) | T-01 evidence |
| AC-06.2 | SIM-007 replay: 0 handoff records | T-01 evidence |
| AC-06.3 | SIM-007 replay: E6 Ready with clean validation | T-01 evidence |
| AC-06.4 | Export gate allowed (validation-only) unless Product re-decides | T-01 E7 notes |

**Pass condition:** Handoff guard and validation readiness unchanged; visibility enhanced.

---

### AC-07 — E6 / E7 metadata shows separated states where applicable

| # | Criterion | Verification |
|---|-----------|--------------|
| AC-07.1 | E6 JSON includes Validation Ready and Handoff Ready (or equivalent named fields) | Evidence artifact |
| AC-07.2 | E7 JSON includes Export Eligible and authorization layer | Evidence artifact |
| AC-07.3 | E2/E6/E7 cross-artifact consistency documented | T-11 compare |
| AC-07.4 | Additive fields only — no removal of audit-relevant existing fields without approval | Governance review |

**Pass condition:** Evidence bundle shows all three states in E6/E7 where scenario applies.

---

### AC-08 — Tests cover all three states

| # | Criterion | Verification |
|---|-----------|--------------|
| AC-08.1 | Unit/integration tests assert Validation Ready derivation | `tests/readiness.test.ts` |
| AC-08.2 | Tests assert Export Eligible independent of Handoff Ready | `tests/export-gate.test.ts`, `tests/reporting-governance.test.ts` |
| AC-08.3 | Tests assert Handoff Ready false when target missing | `tests/handoff.test.ts`, reporting tests |
| AC-08.4 | Regression suite green: `npm test` + typecheck | CI |
| AC-08.5 | Minimum matrix T-01..T-12 per evidence test plan executed | WS-01B evidence folder |

**Pass condition:** All three states have dedicated test coverage; 0 false PASS.

---

### AC-09 — TD-7B-003 remains OPEN until WS-01B evidence passes

| # | Criterion | Verification |
|---|-----------|--------------|
| AC-09.1 | TD-7B-003 status = OPEN during WS-01B implementation | TD register |
| AC-09.2 | TD closure requires: all AC-01..AC-08 PASS + full §10 sign-off + FINAL_GREEN_CHECK | SC-10 |
| AC-09.3 | Layer SSOT document signed and archived | `docs/SPRINT_9/WS01/TD_7B_003_LAYER_SSOT.md` |
| AC-09.4 | Ops runbook published | Operations / Support sign-off |

**Pass condition:** TD closed only in dedicated closure prompt with evidence — not in WS-01B-0.

---

### AC-10 — No Production Readiness / MVP Freeze claim

| # | Criterion | Verification |
|---|-----------|--------------|
| AC-10.1 | WS-01B FINAL_GREEN_CHECK §8 states no Production Readiness claim | Green check doc |
| AC-10.2 | WS-01B FINAL_GREEN_CHECK §8 states no MVP Freeze claim | Green check doc |
| AC-10.3 | No document in WS-01 package claims Operational Readiness PASS | Governance scan |
| AC-10.4 | SC-12 not triggered | Stop condition log |

**Pass condition:** Governance non-claims explicit in closure artifacts.

---

## 4. Scenario Acceptance Matrix

| Scenario | Validation Ready | Export Eligible | Handoff Ready | Expected result |
|----------|-----------------|-----------------|---------------|-----------------|
| NP-004 (post-lock, no target) | true | true | **false** | PASS WITH WARNING — visibility fix required |
| SIM-007 (same class) | true | true (gate allowed) | **false** | Consistent with NP-004 |
| NP-003 (validation BLOCK) | false | false | false | Export blocked — unchanged |
| NP-006 (revoked) | n/a | false | false | Export blocked — unchanged |
| Happy path (target + handoff) | true | true | **true** | All states aligned |

---

## 5. Stop-on-Fail Criteria

| Condition | Stop ID | Action |
|-----------|---------|--------|
| Export 200 while validation BLOCK | SC-09 | Halt; rollback |
| Handoff succeeds without target | SC-02 | Halt; rollback |
| TD closed without evidence | SC-10 | Reopen TD |
| Silent false PASS on NP-004 re-run | SC-05 | Halt; investigate |
| Export Eligible displayed as Handoff Ready | **AC-02 fail** | Halt; fix visibility |
| NP-004 export behavior changed without re-baseline | **AC-05 fail** | Halt; Product re-decision |

---

## 6. Evidence Artifacts Required for Closure

| Artifact | Path | Required for |
|----------|------|--------------|
| NP-004 re-run | `docs/SPRINT_9/WS01/evidence/NP-004-rerun/` | AC-05 |
| SIM-007 re-run | `docs/SPRINT_9/WS01/evidence/SIM-007-rerun/` | AC-06 |
| Layer SSOT | `docs/SPRINT_9/WS01/TD_7B_003_LAYER_SSOT.md` | AC-09 |
| Final green check | `docs/SPRINT_9/WS01/FINAL_GREEN_CHECK.md` | AC-01..AC-10 |
| Decision record | `docs/SPRINT_9/WS01/signoff/TD_7B_003_DECISION.md` | AC-09 |

---

## 7. WS-01B-0 Governance Statements

| Claim | Status |
|-------|--------|
| Acceptance criteria defined | **YES** |
| Tests executed in WS-01B-0 | **NO** |
| Code changed in WS-01B-0 | **NO** |
| TD-7B-003 closed | **NOT CLAIMED** — **OPEN** |
| Production Readiness | **NOT CLAIMED** |
| MVP Freeze | **NOT CLAIMED** |

---

## 8. Sign-off Before Implementation

These criteria become **binding** when WS-01B code work starts. Prior to that:

| Role | Status | Required action |
|------|--------|-----------------|
| Product Owner | **SIGNED** — Option B with conditions | Conditions listed in §2 |
| Engineering Lead | **PENDING** | Confirm scope fits AC-01..AC-08 |
| Governance Reviewer | **PENDING** | Confirm evidence plan and SC-10 compliance |
| Operations / Support | **PENDING** | Confirm runbook requirement (AC-09.4) |

---

## 9. Final Status

| Field | Value |
|-------|-------|
| Document status | **COMPLETE** — criteria ready for WS-01B |
| Implementation authorized | **NO** — pending remaining §10 roles |
| TD-7B-003 | **OPEN** until all AC pass with evidence |

End of WS-01B Option B Acceptance Criteria.
