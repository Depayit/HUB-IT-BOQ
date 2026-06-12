# Sprint 8 Scenario Candidate Matrix — Co-worker / Negative Path

| Field | Value |
|-------|-------|
| System | HUB IT BOQ V3 |
| Sprint | 8-0 — Planning only |
| Branch | `s7b-sprint-7-closure` |
| Generated | 2026-06-12 |
| Parent plan | [S8_SIMULATION_PLAN.md](S8_SIMULATION_PLAN.md) |
| Status | **Candidate matrix — not seeded, not executed** |

---

## 1. Classification Legend

| Timing | Meaning |
|--------|---------|
| **S8 Must Do** | Required for Sprint 8 co-worker simulation closure |
| **S8 Optional** | Execute if capacity; not required for S8 closure |
| **S9 Production Hardening** | Defer to hardening sprint |
| **Before S10** | Required before production freeze gate |
| **BOQ V2** | Next-generation platform scope |
| **ERP / Procurement V2** | Downstream integration scope |
| **Not Now** | Explicit deferral |

| Risk | Meaning |
|------|---------|
| **High** | Could cause false PASS, data corruption, or unauthorized workflow advance |
| **Medium** | Incorrect UX or evidence gap; unlikely silent production escape |
| **Low** | Documentation or hygiene only |

---

## 2. Negative Path Candidate Matrix

| Scenario | Theme | Persona(s) | Risk | Must Do in S8? | Timing | Sprint 7 Baseline | Notes |
|----------|-------|------------|------|----------------|--------|-------------------|-------|
| **SIM-CW-001** | Duplicate approval attempt | Manager, Director | Medium | Yes | S8 Must Do | SIM-001 happy path | Second approve after success must not advance state or duplicate audit incorrectly |
| **SIM-CW-002** | Wrong role approval attempt | Engineer, Procurement | High | Yes | S8 Must Do | SIM-006 (`UNAUTHORIZED_ROLE`) | Extend SIM-006 with co-worker narrative; must remain 403 |
| **SIM-CW-003** | Export attempt while BLOCK exists | Procurement, Engineer | High | Yes | S8 Must Do | SIM-003, SIM-005, SIM-006 | Validation BLOCK must yield 400 `EXPORT_BLOCKED` |
| **SIM-CW-004** | Handoff attempt with missing target | Procurement, Engineer | High | Yes | S8 Must Do | SIM-007 (`HANDOFF_TARGET_REQUIRED`) | TD-7B-003: document readiness/export vs handoff layer |
| **SIM-CW-005** | Re-open or modify BOQ after approval | Engineer, Director | High | Yes | S8 Must Do | SIM-001 (inverse) | Edit after lock/approve must invalidate or block downstream |
| **SIM-CW-006** | Export after approval revoked | Procurement, Director | High | Yes | S8 Must Do | SIM-001 + revoke action | Export must not succeed if approval state revoked |
| **SIM-CW-007** | Warning + Block coexistence | Engineer, Manager | High | Yes | S8 Must Do | SIM-002/004/008 + SIM-003/005 | Unresolved BLOCK must dominate; Warning alone must not imply Ready |
| **SIM-CW-008** | Multiple BLOCK causes at once | Engineer | Medium | Yes | S8 Must Do | SIM-003 + SIM-005 composite | All block reasons reported; no partial advance |
| **SIM-CW-009** | Stale validation / cached readiness | Admin/Ops, Engineer | High | Yes | S8 Must Do | SIM-001 refresh path | E2/E6 must reflect fresh validation, not cached Pass/Ready |
| **SIM-CW-010** | Retry after rejected action | All personas | Medium | Optional | S8 Optional | SIM-003/006/007 retries | Idempotent reject; no state advance on retry |
| **SIM-CW-011** | Evidence artifact BOQ Version ID mismatch | Auditor | Medium | Optional | S8 Optional | Sprint 7 contamination checks | Deliberate mismatch detection drill; governance only |
| **SIM-CW-012** | Cross-user workflow race condition | Engineer + Manager; Manager + Procurement | High | Yes | S8 Must Do | None (new) | Overlapping approve + export/handoff; no double-advance |

---

## 3. Theme-to-Timing Summary (Prompt §7 Minimum Themes)

| # | Theme (from S8-0 prompt) | Mapped Scenario | Timing |
|---|--------------------------|-----------------|--------|
| 1 | Duplicate approval attempt | SIM-CW-001 | S8 Must Do |
| 2 | Wrong role approval attempt | SIM-CW-002 | S8 Must Do |
| 3 | Export attempt while BLOCK exists | SIM-CW-003 | S8 Must Do |
| 4 | Handoff attempt with missing target | SIM-CW-004 | S8 Must Do |
| 5 | Re-open or modify BOQ after approval | SIM-CW-005 | S8 Must Do |
| 6 | Export after approval revoked | SIM-CW-006 | S8 Must Do |
| 7 | Warning + Block coexistence | SIM-CW-007 | S8 Must Do |
| 8 | Multiple BLOCK causes at once | SIM-CW-008 | S8 Must Do |
| 9 | Stale validation / cached readiness | SIM-CW-009 | S8 Must Do |
| 10 | Retry after rejected action | SIM-CW-010 | S8 Optional |
| 11 | Evidence artifact missing or mismatched BOQ Version ID | SIM-CW-011 | S8 Optional |
| 12 | Cross-user workflow race condition | SIM-CW-012 | S8 Must Do |

---

## 4. Deferred Themes (Not S8 Must Do)

| Theme | Timing | Rationale |
|-------|--------|-----------|
| Unified Block Reason Catalog (AI-01) | BOQ V2 | Useful reference; not required for S8 proof |
| Automated False PASS Detector (AI-04) | BOQ V2 | Manual E9 false PASS check sufficient for S8 |
| Rejected API attempts in Postgres audit (M-03 fix) | S9 Production Hardening | Document in E9/E8 review; fix deferred |
| requestId / traceId on AppError (M-07) | S9 Production Hardening | BOQ Version ID trace sufficient for S8 |
| TD-7B-003 alignment fix (readiness/export/handoff) | S8 scenario **or** S9 fix | Test in SIM-CW-003/004; code fix optional S9 |
| ERP downstream block propagation | ERP / Procurement V2 | Out of BOQ V3 MVP scope |
| Production monitoring / 72-hour diagnostics | S9 Production Hardening | Not simulation scope |
| Idempotency framework (full) | Not Now | Fresh seed per SIM-CW sufficient for S8 |

---

## 5. S8 Scope Cap

| Category | Count |
|----------|-------|
| S8 Must Do scenarios | **10** |
| S8 Optional scenarios | **2** |
| Maximum planned S8 official runs | **12** |

Do not expand beyond 12 without Sprint 8 scope change review.

---

## 6. Stop-on-Fail Mapping

Each **S8 Must Do** scenario must define in its execution plan (S8-1+) explicit stop triggers from [S8_SIMULATION_PLAN.md](S8_SIMULATION_PLAN.md) §9. Highest-risk scenarios for false PASS:

| Scenario | Primary Stop Trigger |
|----------|---------------------|
| SIM-CW-002 | Unauthorized role receives 200 on approve |
| SIM-CW-003 | Export 200 while validation BLOCK active |
| SIM-CW-004 | Handoff record created without target |
| SIM-CW-006 | Export 200 after approval revoked |
| SIM-CW-007 | Ready tier with unresolved BLOCK |
| SIM-CW-009 | E6 Ready from stale cache after data change |
| SIM-CW-012 | Double approval or export race succeeds |

---

## 7. Matrix Verdict

**10 Must Do + 2 Optional** scenarios cover all 12 prompt themes without over-expanding S8. Candidate matrix is **READY FOR S8-1** detailed scenario design.

End of Sprint 8 Scenario Candidate Matrix.
