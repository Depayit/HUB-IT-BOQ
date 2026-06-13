# Sprint 9 Workstream Matrix — Production Hardening

| Field | Value |
|-------|-------|
| System | HUB IT BOQ V3 |
| Sprint | 9 — Production Hardening |
| Document type | **PLAN / GOVERNANCE / DOCUMENTATION ONLY** (S9-0) |
| Generated | 2026-06-13 |
| Parent plan | [S9_PRODUCTION_HARDENING_PLAN.md](S9_PRODUCTION_HARDENING_PLAN.md) |

---

## 1. Matrix Legend

| Column | Meaning |
|--------|---------|
| **Phase** | Recommended S9 execution phase (S9-1, S9-2, S9-3) |
| **Priority** | P0 = production safety; P1 = observability/audit; P2 = assessment |
| **S9-0** | Planning status in this gate cycle |
| **Disposition** | Expected outcome class at Sprint 9 closure |

---

## 2. Workstream Matrix

| WS | Workstream | Priority | Phase | Owner role | Primary IDs | Sprint 8 evidence | S9-0 status | Disposition target |
|----|------------|----------|-------|------------|-------------|-------------------|-------------|-------------------|
| **WS-01** | TD-7B-003 Resolution | **P0** | S9-1 | Engineering + Product | TD-7B-003 | NP-003, NP-004, NP-006, NP-007 | **Planned** | Close or accept with sign-off |
| **WS-02** | Rejected Action Audit | **P0** | S9-1 | Engineering | M-03 | NP-010; all E9 M-03 notes | **Planned** | Close — rejection rows persistent |
| **WS-03** | RequestId / TraceId | **P0** | S9-1 | Engineering | M-07 | NP-012; E9 M-07 notes | **Planned** | Close — AppError + audit correlation |
| **WS-04** | Audit Completeness Review | **P1** | S9-2 | Engineering + Auditor | M-03, NP-011 | NP-011 E4 vs E8 sweep | **Planned** | Verify — E8 reflects rejections |
| **WS-05** | Recovery & Rollback Controls | **P1** | S9-3 | Engineering + Ops | NP-009 guard | NP-009, NP-005, NP-006 | **Planned** | Verify — documented recovery paths |
| **WS-06** | Operational Monitoring Strategy | **P1** | S9-2 | Ops + Engineering | Grafana, Pulse #2 | Sprint 7/8 E6/E7/E8 patterns | **Planned** | Plan approved; MVP dashboards scoped |
| **WS-07** | Production Safety Controls | **P0** | S9-1 | Engineering + Product | TD-7B-003, gates | Export/handoff/approval SSOT | **Planned** | Document — safety control matrix |
| **WS-08** | Pre-Freeze Readiness Assessment | **P2** | S9-3 | Governance | All carry-over | Sprint 8 closure package | **Planned** | S10 entry recommendation draft |

---

## 3. Workstream Detail

### WS-01 — TD-7B-003 Resolution

**Problem:** Post-lock validation may show Pass/Ready while handoff layer blocks (missing `handoff_target`). Export may proceed in that state — layer separation gap confirmed in NP-004.

**S9 activities (S9-1+):**

- Analyze alignment options: unify gates vs document explicit layer separation as SSOT
- Align handoff readiness, export gate, and E6/E7 reporting tier semantics
- Add targeted tests covering NP-004 edge case
- Product sign-off if explicit layer separation is accepted

**Success measure:** SC-01 — disposition complete with evidence.

**Dependencies:** WS-07 (safety control matrix must reflect outcome).

---

### WS-02 — Rejected Action Audit (M-03)

**Problem:** Rejected approve/export/handoff attempts captured in E4 runner JSON but may not appear in E8 `audit_logs`.

**S9 activities (S9-1+):**

- Design rejection log schema (Postgres audit enrichment or parallel table)
- Persist rejected API attempts with code, actor, BOQ Version ID, timestamp
- Verify NP-010 retry drill produces queryable rejection rows

**Success measure:** SC-02 — rejected attempts queryable.

**Dependencies:** WS-04 audit completeness review.

---

### WS-03 — RequestId / TraceId (M-07)

**Problem:** Cross-user concurrency (NP-012) cannot be correlated via requestId in AppError.

**S9 activities (S9-1+):**

- Extend AppError contract with requestId (traceId where applicable)
- Propagate to audit correlation fields
- Verify block paths on approve/export/handoff return requestId

**Success measure:** SC-03 — requestId on block paths.

---

### WS-04 — Audit Completeness Review

**Problem:** Audit completeness false confidence if E8 read without E4 (documented in Sprint 8 closure §10).

**S9 activities (S9-2+):**

- Formalize E4 vs E8 equivalence criteria
- Re-run NP-011-style sweep post M-03 fix
- Document auditor query patterns for rejection paths

**Success measure:** SC-04 — audit completeness verified.

---

### WS-05 — Recovery & Rollback Controls

**Problem:** Stale validation and state-change errors require operational recovery paths.

**S9 activities (S9-3+):**

- Productionize `applyLiveStaleGateGuard` monitoring hooks
- Document rollback paths for NP-005 (re-open), NP-006 (revoke), NP-009 (stale)
- Define ops runbook for stale-cache recovery

**Success measure:** SC-05 — recovery path verified.

---

### WS-06 — Operational Monitoring Strategy

**Problem:** No production dashboards for block/export/handoff reject rates (deferred since Sprint 7).

**S9 activities (S9-2+):**

- Define metrics: block rate, export reject rate, handoff reject rate, stale guard triggers
- Scope Grafana panels (Pulse #2, #8)
- Define alert thresholds and 72-hour readiness diagnostic hooks

**Success measure:** SC-06 — observability plan approved.

**Note:** S9-0 produces strategy only; dashboard implementation in S9-2.

---

### WS-07 — Production Safety Controls

**Problem:** Layer gaps (TD-7B-003) and gate semantics must be explicit for operations.

**S9 activities (S9-1+):**

- Document production safety control matrix: validation → readiness → approval → handoff → export
- Map E6/E7 tier semantics to gate behavior
- Align with WS-01 outcome

**Success measure:** SC-07 — safety controls documented.

---

### WS-08 — Pre-Freeze Readiness Assessment

**Problem:** Sprint 10 MVP Freeze gate requires consolidated open-item inventory.

**S9 activities (S9-3):**

- Inventory all open TD, M-items, and AI intake deferrals
- Assess TD-7A-009 consolidation need
- Draft S10 entry recommendation (does **not** start Sprint 10)

**Success measure:** SC-10 — pre-freeze assessment complete.

---

## 4. Recommended Execution Order

```
S9-1:  WS-07 → WS-01 → WS-02 → WS-03
         │       │       │       │
         └───────┴───────┴───────┴── P0 safety + audit foundation

S9-2:  WS-04 → WS-06
         │       │
         └───────┴── Audit verification + observability

S9-3:  WS-05 → WS-08
         │       │
         └───────┴── Recovery + S10 input
```

**Rationale:**

1. **WS-07 first** — safety control matrix frames WS-01 alignment decisions.
2. **WS-01** — highest-severity open TD; blocks false confidence in export/handoff ops.
3. **WS-02 / WS-03** — independent audit/trace fixes; parallelizable after WS-07 framing.
4. **WS-04** — depends on WS-02 completion for meaningful E4/E8 sweep.
5. **WS-06** — observability plan consumes WS-01..03 metrics definitions.
6. **WS-05** — recovery verification after core fixes stabilize.
7. **WS-08** — last; consolidates all dispositions for S10 gate.

---

## 5. Cross-Workstream Dependencies

| From | To | Relationship |
|------|-----|--------------|
| WS-01 | WS-07 | Alignment outcome updates safety matrix |
| WS-02 | WS-04 | M-03 fix required before audit completeness sweep |
| WS-03 | WS-06 | requestId becomes monitoring correlation key |
| WS-01..07 | WS-08 | All dispositions feed pre-freeze assessment |
| WS-05 | WS-06 | Stale guard metrics feed monitoring strategy |

---

## 6. Out-of-Matrix Items (Explicit Deferral)

| Item | Bucket | Not in Sprint 9 WS |
|------|--------|-------------------|
| AI-01 | BOQ V2 | — |
| AI-04 | BOQ V2 | — |
| ERP-V2 | ERP V2 | — |
| Agent observability | Future Platform | — |
| TD-7A-009 consolidation (if not blocking) | Before S10 | Tracked in WS-08 only |

---

## 7. Governance Statements

| Claim | Status |
|-------|--------|
| Workstreams executed | **NOT STARTED** — S9-0 planning only |
| WS-01..WS-08 code changes | **NOT AUTHORIZED** in S9-0 |
| Production Readiness | **NOT CLAIMED** |
| MVP Freeze | **NOT CLAIMED** |

End of Sprint 9 Workstream Matrix.
