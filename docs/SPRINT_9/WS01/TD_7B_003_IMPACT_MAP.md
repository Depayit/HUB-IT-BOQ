# TD-7B-003 Impact Map — HUB IT BOQ V3

| Field | Value |
|-------|-------|
| System | HUB IT BOQ V3 |
| Sprint | 9-1B — WS-01A |
| Deliverable | Impact Map |
| Document type | **GOVERNANCE / DOCUMENTATION ONLY** |
| Generated | 2026-06-13 |
| Parent analysis | [TD_7B_003_DISPOSITION_ANALYSIS.md](TD_7B_003_DISPOSITION_ANALYSIS.md) |

---

## 1. Layer Impact Matrix

| Layer | Current Behavior | Option A Impact | Option B Impact | Option C Impact |
|-------|------------------|-----------------|-----------------|-----------------|
| **Validation** | BLOCK/WARNING/PASS from validation engine | No rule change | No change | No rule change |
| **Readiness** | E6 from `deriveReadinessTier()` — validation-only; NP-004 shows Ready while handoff blocked | Tier includes handoff completeness | Composite: `validation_ready` + `handoff_ready` | Mode-specific labels |
| **Approval** | Role authority + lock | No change | No change | No change |
| **Handoff** | `HANDOFF_TARGET_REQUIRED` blocks `createHandoff` | Rules unchanged; export aligned | No gate change; SSOT documents separation | Handoff export mode adds export-side check |
| **Export** | `isReportExportBlocked(unresolved_blocks)` only | Blocked when handoff incomplete | Unchanged; metadata labels | Summary (current) + handoff (gated) modes |
| **Reporting** | `ready_status`, `handoff_status`, `can_handoff` | Unified readiness | Dual indicators + labels | `export_mode` in report |
| **Audit** | Handoff rejections in E4; M-03 E8 gap | More export rejections | Unchanged paths | Mode-specific audit rows |
| **Procurement downstream** | Export before handoff target known (NP-004) | Blocked until handoff complete | Training: export ≠ handoff-ready | Commercial preserved |
| **ERP downstream** | Out of S9 scope | Only handoff-complete exports | SSOT required | Filter on `export_mode=handoff` |
| **User / Management display** | E6 Ready may imply full forwardability | Single aligned state | Dual indicators mandatory | Mode-labeled UI |
| **Evidence E1–E9** | SIM-007, NP-004 document gap | NP-004 E7 re-baseline | Preserved; additive E6/E7 fields | NP-004 preserved + new handoff-mode tests |
| **Operational controls** | PS-01 §12 default; TD exception pending | Default rule applies | Signed SSOT exception | Mode-specific rules |

---

## 2. Code Touchpoint Map (Analysis Only)

| File / Module | Current role | Option A | Option B | Option C |
|---------------|--------------|----------|----------|----------|
| `export.service.ts` | Validation-only export gate | Handoff completeness check | Metadata labeling | Mode branch |
| `reporting.ts` | `isReportExportBlocked()` | Extend predicate | Doc only | `isHandoffExportBlocked()` new |
| `readiness.ts` | `deriveReadinessTier()` | Handoff input dimension | Composite display helper | Mode-aware labels |
| `handoff.service.ts` | `assertHandoffTargetProvided()` | Unchanged | Unchanged | Reused by handoff export |
| `validation.service.ts` | `getWorkflowGate()` | Possible `can_handoff` extend | Display hook only | Unchanged |
| `boq-summary-report.service.ts` | Report assembly | Unified fields | Dual indicators | Mode metadata |

---

## 3. Mandatory Impact Questions

| # | Question | Option A | Option B | Option C |
|---|----------|----------|----------|----------|
| 1 | Changes validation semantics? | **No** | **No** | **No** |
| 2 | Changes export eligibility? | **Yes** — blocked when handoff incomplete | **No** eligibility; **Yes** labeling | **Yes** — mode-dependent |
| 3 | Changes handoff eligibility? | **No** | **No** | **No** API; handoff export gated |
| 4 | Changes management readiness display? | **Yes** — unified tier | **Yes** — composite mandatory | **Yes** — mode labels |
| 5 | Affects Sprint 7/8 evidence? | **Yes** — NP-004 re-baseline | **No** — preserved | **Partial** — new handoff-mode tests |
| 6 | Requires migration? | Unlikely | **No** | Unlikely |
| 7 | Requires UI wording changes? | **Yes** | **Yes** — mandatory | **Yes** — two actions |
| 8 | Requires new tests? | **Yes** — NP-004 re-baseline | **Yes** — display tests | **Yes** — mode matrix |

---

## 4. Cross-Workstream Impact

| Workstream | Option A | Option B | Option C |
|------------|----------|----------|----------|
| WS-07 PS-01 §12 | Default unified rule | Signed SSOT exception | Mode-specific rules |
| WS-02 M-03 | More export rejection rows | Unchanged | New handoff-mode rejections |
| WS-04 Audit | E4/E8 export rejections increase | Minimal | Mode-specific rows |
| WS-06 Monitoring | Export reject rate changes | Label compliance | Per-mode metrics |
| WS-08 Pre-freeze | Close with CC-HR evidence | Close with sign-off + visibility | Close with mode evidence |

---

## 5. NP-004 Evidence Preservation

| Option | NP-004 `export_succeeded: true` remains valid? |
|--------|-----------------------------------------------|
| A | **No** |
| B | **Yes** |
| C | **Yes** (summary mode) |

---

## 6. Governance Statements

| Claim | Status |
|-------|--------|
| Impact map complete | **YES** |
| Code modified | **NO** |
| TD-7B-003 closed | **NOT CLAIMED** |

End of TD-7B-003 Impact Map.
