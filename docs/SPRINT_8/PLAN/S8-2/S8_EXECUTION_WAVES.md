# Sprint 8 Execution Waves — Negative Path Scenarios

| Field | Value |
|-------|-------|
| System | HUB IT BOQ V3 |
| Sprint | 8-2 — Negative Path Scenario Matrix & Execution Prioritization |
| Document type | **PLAN / GOVERNANCE / DOCUMENTATION ONLY** |
| Branch | `s7b-sprint-7-closure` |
| HEAD at plan | `8826278c94e824d8c72c26e6d1d9e1eac2da560b` |
| Parent matrix | [S8_NEGATIVE_PATH_MATRIX.md](S8_NEGATIVE_PATH_MATRIX.md) |
| Priority | [S8_EXECUTION_PRIORITY.md](S8_EXECUTION_PRIORITY.md) |
| Generated | 2026-06-12 |
| Status | **Wave plan only — not executed** |

---

## 1. Purpose

Group Sprint 8 negative path scenarios into execution waves by **operational risk**, **false PASS potential**, **complexity**, and **dependency order**. Waves enforce stop-on-fail gates between batches.

**No simulation execution is authorized by this document.**

---

## 2. Wave Design Principles

| Principle | Application |
|-----------|-------------|
| **Prove gates before stress** | Authority and validation gates (Wave 1) before export/handoff (Wave 2) |
| **Single-user before concurrent** | All single-actor negatives complete before NP-012 race |
| **Sprint 7 baseline first** | Scenarios with strong SIM-001..008 inverse run early to establish confidence |
| **Silent false PASS last among MUST DO** | NP-009 and NP-012 in Wave 3 — highest miss risk requires proven E9 discipline |
| **Governance optional last** | NP-010/NP-011 in Wave 4 — capacity-dependent |

---

## 3. Wave Summary

| Wave | Risk Profile | Scenarios | Count | Gate |
|------|--------------|-----------|-------|------|
| **Wave 1** | Low–medium operational risk; low–medium complexity | NP-002, NP-001, NP-008 | 3 | Delta review before Wave 2 |
| **Wave 2** | High operational risk; medium complexity; TD-7B-003 | NP-003, NP-004, NP-007, NP-005, NP-006 | 5 | Delta review + P0 stop check before Wave 3 |
| **Wave 3** | Critical false PASS; high complexity | NP-009, NP-012 | 2 | S8 MUST DO closure gate |
| **Wave 4** | Optional governance / retry | NP-011, NP-010 | 0–2 | S8 OPTIONAL closure |

**Total MUST DO: 10** · **OPTIONAL: up to 2**

---

## 4. Wave 1 — Authority & Validation Foundation

**Risk profile:** Low–medium execution risk. Establishes approval boundaries and composite BLOCK reporting before export layer testing.

| Order | Scenario | Rationale |
|-------|----------|-----------|
| 1 | **NP-002** | Wrong role approval — CRITICAL false PASS but **low complexity** and **strong SIM-006 baseline**. Run first to confirm authority gate before any export scenarios. |
| 2 | **NP-001** | Duplicate approval — low complexity warm-up; validates E4 attempt logging and E3 idempotency. Builds co-worker E9 narrative discipline. |
| 3 | **NP-008** | Multiple BLOCK causes — Engineer-only; establishes E2 multi-code enumeration baseline needed to interpret NP-009 stale validation results. |

### Wave 1 Rationale

Wave 1 deliberately **does not** include export or handoff scenarios. The example grouping (NP-001, NP-002, NP-003) was rejected because NP-003 is CRITICAL false PASS with TD-7B-003 layer ambiguity — it belongs in Wave 2 after authority gates are proven.

NP-002 leads Wave 1 despite CRITICAL false PASS potential because failure is **immediate and visible** (403 vs 200), making it the safest CRITICAL scenario to run first.

### Wave 1 Exit Criteria

- NP-002: no unauthorized HTTP 200
- NP-001: E3 shows single effective approval advance
- NP-008: E2 lists all BLOCK codes; no partial E3 advance
- E9 false PASS checklist completed for all 3 runs
- **Gate:** PO or simulation lead delta review → authorize Wave 2

---

## 5. Wave 2 — Export, Handoff & State Change

**Risk profile:** Medium–high operational risk. Exercises TD-7B-003 layer behavior and post-approval state mutations.

| Order | Scenario | Rationale |
|-------|----------|-----------|
| 1 | **NP-003** | Export while BLOCK — core export gate; SIM-003/005/006 baseline. Must run before NP-006 (revoke path assumes export gate works). |
| 2 | **NP-004** | Handoff without target — SIM-007 baseline; pairs with NP-003 for TD-7B-003 layer comparison in same review session. |
| 3 | **NP-007** | Warning + Block coexistence — tier logic stress; benefits from NP-003/004 export/handoff context fresh in reviewer mind. |
| 4 | **NP-005** | Re-open approved BOQ — state invalidation after Wave 2 export gates proven. |
| 5 | **NP-006** | Export after approval revoked — depends on NP-005 revoke/setup and NP-003 export block behavior. |

### Wave 2 Rationale

Export and handoff negatives are grouped because they share **E6/E7/E5 cross-check patterns** and TD-7B-003 documentation requirements. Running NP-003 and NP-004 sequentially enables single delta review of layer separation evidence.

NP-005 and NP-006 are placed at Wave 2 end because they require **approval state setup** (approve → edit/revoke) that assumes Wave 1 authority gates are already validated.

The example grouping (NP-004, NP-005, NP-006 without NP-003/007) was rejected — export gate must be proven before revoke-export and handoff scenarios.

### Wave 2 Exit Criteria

- No export HTTP 200 while validation BLOCK (NP-003)
- No handoff record without target (NP-004)
- E6 Blocked when E2 has unresolved BLOCK (NP-007)
- Post-edit export blocked or approval invalidated (NP-005)
- Export blocked after revoke (NP-006)
- TD-7B-003 documented in E9 where applicable — PASS WITH WARNING max
- **Gate:** P0 stop-on-fail clear → authorize Wave 3

---

## 6. Wave 3 — Silent False PASS & Concurrency

**Risk profile:** Critical false PASS potential; highest complexity. **Final MUST DO wave.**

| Order | Scenario | Rationale |
|-------|----------|-----------|
| 1 | **NP-009** | Stale validation snapshot — most silent false PASS; requires Admin/Ops + Engineer coordination. Run before NP-012 so cache discipline is fresh. Uses NP-008 multi-block E2 baseline for comparison. |
| 2 | **NP-012** | Cross-user workflow conflict — highest execution complexity; **depends on all Wave 1–2 gates proven**. Two persona pairs: Engineer+Manager, Manager+Procurement. |

### Wave 3 Rationale

The example grouping placed NP-007..NP-012 together in Wave 3. That was rejected:

- NP-007 belongs in Wave 2 (tier logic pairs with export/handoff layer tests)
- NP-010 is low-risk OPTIONAL — not Wave 3
- NP-011 is governance OPTIONAL — Wave 4

Wave 3 contains only the two scenarios that **cannot run until single-user negatives pass** and that carry the highest silent-failure risk.

### Wave 3 Exit Criteria

- E2 timestamp post-dates last Engineer edit (NP-009)
- No E6 Ready from stale cache (NP-009)
- No double approval advance or inconsistent E3/E7 under concurrency (NP-012)
- **Gate:** 10/10 MUST DO complete → S8 co-worker simulation closure review

---

## 7. Wave 4 — Optional Governance (Capacity)

**Risk profile:** Medium; governance and retry hygiene. **Not required for S8 MUST DO closure.**

| Order | Scenario | Rationale |
|-------|----------|-----------|
| 1 | **NP-011** | Evidence mismatch / contamination drill — **recommended** for Auditor persona closure. Run first in Wave 4 while E9 discipline from Wave 1–3 is strongest. |
| 2 | **NP-010** | Retry rejected action — M-03 observation; idempotency check across personas. |

### Wave 4 Rationale

Optional scenarios deferred to avoid contaminating MUST DO batch momentum. NP-011 promoted to first optional slot because Auditor persona gap exists without it (see [S8_NEGATIVE_PATH_MATRIX.md](S8_NEGATIVE_PATH_MATRIX.md) §5).

---

## 8. Wave ↔ Persona Participation

| Wave | Primary Personas |
|------|------------------|
| Wave 1 | Manager, Director, Engineer, Procurement (NP-002) |
| Wave 2 | Procurement, Engineer, Manager, Reviewer, Director |
| Wave 3 | Admin/Ops, Engineer, Manager, Procurement |
| Wave 4 | Auditor, Admin/Ops, all personas (NP-010) |

All 7 personas participate in MUST DO waves (Wave 1–3). Auditor requires Wave 4 NP-011 or cross-run E9 sign-off.

---

## 9. Batch Rules

| Rule | Enforcement |
|------|-------------|
| Stop-on-fail | Any CRITICAL false PASS in Wave N → halt Wave N; no advance to Wave N+1 |
| Fresh seed | New BOQ Version ID per scenario; no ID reuse within or across waves |
| Delta review | Mandatory between Wave 1→2, Wave 2→3, and at S8 closure |
| TD-7B-003 | Document in Wave 2 E9; do not upgrade SIM-007-equivalent gap to full PASS |
| M-03 | Document E4 vs E8 gap in every rejection scenario across all waves |

---

## 10. Comparison to Example Grouping

| Example | S8-2 Decision | Reason |
|---------|---------------|--------|
| Wave 1: NP-001, NP-002, NP-003 | **Rejected** | NP-003 is CRITICAL export gate — defer to Wave 2 |
| Wave 2: NP-004, NP-005, NP-006 | **Partially accepted** | Extended with NP-003, NP-007 for TD-7B-003 and tier logic |
| Wave 3: NP-007..NP-012 | **Rejected** | NP-007 → Wave 2; NP-010/011 → Wave 4; Wave 3 = NP-009 + NP-012 only |

---

## 11. Verdict

Execution waves defined with analyzed rationale. **READY FOR S8-3** — first official co-worker simulation may be prepared against Wave 1 scenario list (NP-002, NP-001, NP-008).

End of Sprint 8 Execution Waves.
