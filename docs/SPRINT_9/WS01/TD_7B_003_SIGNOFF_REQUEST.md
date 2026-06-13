# TD-7B-003 Product / Governance Sign-Off Request — HUB IT BOQ V3

| Field | Value |
|-------|-------|
| System | HUB IT BOQ V3 — ERP-ready BOQ Cost Intelligence System |
| Sprint | 9-1B — WS-01A |
| Deliverable | Sign-Off Request |
| Document type | **GOVERNANCE / DECISION REQUEST** |
| Generated | 2026-06-13 |
| TD ID | **TD-7B-003** |
| Status | **OPEN / HIGH** |
| Analysis package | [TD_7B_003_DISPOSITION_ANALYSIS.md](TD_7B_003_DISPOSITION_ANALYSIS.md) |

---

## 1. Decision Required

Product Owner and Governance must select **one** disposition path:

| Option | Short name |
|--------|------------|
| **A** | Unify gates — export blocked when handoff incomplete |
| **B** | Signed layer-separation SSOT + mandatory visibility enhancements |
| **C** | Hybrid export mode split (summary vs handoff export) |

**WS-01B is blocked until §10 is completed.**

Allowed: Approve A / B / C · Approve with Conditions · Hold · Reject

---

## 2. Summary of Confirmed Gap

Post-lock BOQ with clean validation (0 unresolved BLOCK):

1. Handoff API returns **HANDOFF_TARGET_REQUIRED** (403) when `handoff_target` missing
2. E6 readiness tier shows **Ready**
3. Export gate allows BOQ summary export (NP-004: `export_succeeded: true`)
4. **Layer separation gap** — confirmed by SIM-007 and NP-004; not silent false PASS

**Risk if ignored:** "Ready + export OK" misread as handoff-ready.

---

## 3. Option A Summary — Unify Gates

| Field | Value |
|-------|-------|
| Intent | Single forwardability gate |
| User impact | Export disabled until handoff complete |
| Code scope | CC-HR |
| NP-004 | Behavior **changes** |
| Best for | Maximum safety |

---

## 4. Option B Summary — Layer-Separation SSOT

| Field | Value |
|-------|-------|
| Intent | Document intentional separation; fix ambiguity via visibility |
| User impact | Export remains (validation-ready); handoff separate |
| Code scope | CC-STD (doc) + CC-CTL (labels, composite display) |
| NP-004 | Behavior **preserved** |
| Mandatory | Dual readiness indicators; export metadata labels; ops runbook; Product sign-off |
| Best for | Fastest S9 disposition aligned with Sprint 7/8 evidence |

**Engineering recommendation: Option B**

---

## 5. Option C Summary — Hybrid Export Mode Split

| Field | Value |
|-------|-------|
| Intent | `summary` vs `handoff` export modes |
| User impact | Two export paths with distinct gates |
| Code scope | CC-HR |
| NP-004 | Preserved as summary mode |
| Best for | Long-term clarity without blocking commercial export |

**Status:** Acceptable alternative.

---

## 6. Recommended Option

| Field | Value |
|-------|-------|
| Recommendation | **Option B** — Layer-Separation SSOT + mandatory visibility |
| Alternative | Option C if Product requires export taxonomy in S9 |

---

## 7. Risk If Not Fixed

| Risk | Severity |
|------|----------|
| TD-7B-003 OPEN at S10 freeze | **High** |
| Management misreads E6 Ready | **High** |
| Procurement assumes export = handoff package | **Medium** |
| ERP wrong downstream trigger | **Medium** |

---

## 8. Risk If Fixed Incorrectly

| Risk | Severity | Mitigation |
|------|----------|------------|
| Export 200 on validation BLOCK | **Critical** | SC-09; NP-003 |
| Silent TD closure | **High** | SC-10; sign-off |
| Option B without visibility | **High** | Mandatory conditions §4 |
| Option A blocks procurement | **Medium** | Product workflow confirm |
| Option C scope creep | **Medium** | Phased delivery |

---

## 9. Required Approval Roles

| Role | Responsibility |
|------|----------------|
| Product Owner | Select option; accept workflow impact |
| Engineering Lead | Confirm scope and CC class |
| Governance Reviewer | Evidence plan; no silent closure |
| Operations / Support | Runbook and display operability |

---

## 10. Sign-Off Table

| Role | Name | Decision | Date | Notes |
|------|------|----------|------|-------|
| Product Owner | | | | |
| Engineering Lead | | | | |
| Governance Reviewer | | | | |
| Operations / Support | | | | |

### Allowed decisions

- [ ] **Approve Option A**
- [ ] **Approve Option B** (recommended)
- [ ] **Approve Option C**
- [ ] **Approve with Conditions** — specify: _______________
- [ ] **Hold** — reason: _______________
- [ ] **Reject** — reason: _______________

### Conditions (if applicable)

| Condition | Owner | Due |
|-----------|-------|-----|
| | | |

---

## 11. Post-Decision Actions

| Decision | WS-01B work |
|----------|-------------|
| Option A | Gate unification; NP-004 re-baseline |
| Option B | SSOT doc + composite display + export labels |
| Option C | Export mode API + UI + dual tests |
| Hold / Reject | No WS-01B; TD remains OPEN |

---

## 12. Supporting Documents

| Document | Path |
|----------|------|
| Disposition analysis | [TD_7B_003_DISPOSITION_ANALYSIS.md](TD_7B_003_DISPOSITION_ANALYSIS.md) |
| Option matrix | [TD_7B_003_OPTION_MATRIX.md](TD_7B_003_OPTION_MATRIX.md) |
| Impact map | [TD_7B_003_IMPACT_MAP.md](TD_7B_003_IMPACT_MAP.md) |
| Evidence test plan | [TD_7B_003_EVIDENCE_TEST_PLAN.md](TD_7B_003_EVIDENCE_TEST_PLAN.md) |
| Production safety policy | [PRODUCTION_SAFETY_POLICY.md](../WS07/PRODUCTION_SAFETY_POLICY.md) |

---

## 13. Governance Statements

| Claim | Status |
|-------|--------|
| Decision recorded | **PENDING** |
| WS-01B authorized | **NO** |
| TD-7B-003 closed | **NOT CLAIMED** |
| Production Readiness | **NOT CLAIMED** |
| MVP Freeze | **NOT CLAIMED** |

> **No WS-01B code work until §10 sign-off table is completed.**

End of TD-7B-003 Sign-Off Request.
