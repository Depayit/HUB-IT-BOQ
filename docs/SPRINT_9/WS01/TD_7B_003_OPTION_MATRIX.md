# TD-7B-003 Option Comparison Matrix — HUB IT BOQ V3

| Field | Value |
|-------|-------|
| System | HUB IT BOQ V3 |
| Sprint | 9-1B — WS-01A |
| Deliverable | Option Comparison Matrix |
| Document type | **GOVERNANCE / DOCUMENTATION ONLY** |
| Generated | 2026-06-13 |
| Parent analysis | [TD_7B_003_DISPOSITION_ANALYSIS.md](TD_7B_003_DISPOSITION_ANALYSIS.md) |

---

## 1. Classification Legend

| Rating | Meaning |
|--------|---------|
| **Recommended** | Best fit for Sprint 9 scope, evidence, and risk profile |
| **Acceptable** | Valid choice with documented trade-offs |
| **Risky** | Proceed only with explicit Product acceptance of named risks |
| **Not Recommended** | Fails safety, scope, or evidence alignment without strong override |

---

## 2. Option Comparison Matrix

| Criteria | Option A: Unify Gates | Option B: Layer-Separation SSOT | Option C: Hybrid / Export Mode Split |
|----------|----------------------|----------------------------------|--------------------------------------|
| **Safety** | **Recommended** — single forwardability gate | **Acceptable** — safe if visibility mandatory | **Recommended** — commercial controlled; handoff path strictly gated |
| **User clarity** | **Acceptable** — simple rule; may confuse blocked export | **Risky** without visibility — **Acceptable** with composite display | **Recommended** — named export modes |
| **Procurement impact** | **Risky** — blocks pre-handoff BOQ summary export | **Recommended** — preserves NP-004 workflow | **Recommended** — commercial export preserved |
| **Handoff integrity** | **Recommended** — completeness required for any export | **Acceptable** — handoff API enforces target | **Recommended** — handoff-mode export gated |
| **Reporting clarity** | **Recommended** — E6/E7 single gate | **Risky** alone — **Acceptable** with dual indicators | **Recommended** — mode in E7 metadata |
| **Export semantics** | Export = full forwardability | Export = validation-ready summary only | Mode determines gate |
| **Readiness semantics** | E6 reflects validation + handoff | E6 validation-ready + separate handoff indicator | Mode-specific or composite labels |
| **Implementation risk** | **Risky** — CC-HR core change | **Recommended** — CC-STD + CC-CTL | **Risky** — CC-HR new API/UI |
| **Regression risk** | **Risky** — NP-004 re-baseline required | **Recommended** — NP-004 preserved | **Acceptable** — summary = current |
| **Audit impact** | Low — single gate | Medium — layer SSOT required | Low — mode in audit/E7 |
| **Test complexity** | High — full re-baseline | Low–Medium — display tests | High — mode matrix |
| **Rollback complexity** | High — RT-001..RT-004 | Low (doc) / Medium (visibility) | High |
| **S10 freeze risk** | Medium | **Recommended** — fastest path | High — scope risk |
| **V2 extensibility** | Medium — rigid unified gate | Medium — layers documented | **Recommended** — export taxonomy |
| **ERP downstream impact** | Low false-positive | **Risky** without SSOT | **Recommended** — filter on export_mode |

---

## 3. Summary Classification by Option

| Option | Overall | Primary strength | Primary weakness |
|--------|---------|------------------|------------------|
| **A — Unify Gates** | **Acceptable** | Maximum safety | Procurement blocked; NP-004 changes |
| **B — Layer-Separation SSOT** | **Recommended** | Evidence-aligned; low risk | Requires visibility discipline |
| **C — Hybrid Export Mode Split** | **Acceptable** | Best long-term clarity | Highest S9 scope |

---

## 4. Decision Guidance

| If Product priority is… | Choose |
|-------------------------|--------|
| Fastest S9 disposition with minimal code | **Option B** (+ visibility CC-CTL) |
| Maximum safety — block all export until handoff complete | **Option A** |
| Clear export taxonomy without blocking commercial export | **Option C** |
| Preserve Sprint 7/8 evidence interpretation | **Option B** or **C** |
| Minimize S10 freeze risk | **Option B** |

---

## 5. Option C Inclusion Rationale

Option C included because:

- **Option A** over-corrects — blocks export procurement may require
- **Option B** accepts dual layers but lacks a **named** handoff-grade export channel

Option C is **not forced**. Product may approve Option B and defer mode split to BOQ V2.

---

## 6. Governance Statements

| Claim | Status |
|-------|--------|
| Option matrix complete | **YES** |
| Implementation authorized | **NO** — sign-off required |
| TD-7B-003 closed | **NOT CLAIMED** |

End of TD-7B-003 Option Comparison Matrix.
