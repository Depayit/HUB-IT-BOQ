# SIM-002 Warning Path — Execution Plan (Proposal)

| Field | Value |
|-------|-------|
| Scenario | SIM-002 — Warning Path |
| Sprint | 7B Phase 2 (first Warning scenario) |
| Status | **SIM-002 Official Run = PASS (closed)** — [FINAL_GREEN_CHECK.md](FINAL_GREEN_CHECK.md) |
| S7B-2A closure | [S7B-2A_WARNING_PERSISTENCE/CLOSURE.md](../S7B-2A_WARNING_PERSISTENCE/CLOSURE.md) |
| Prerequisite | SIM-001 Official Run = PASS (closed) — [FINAL_GREEN_CHECK.md](../PHASE1_SIM-001/FINAL_GREEN_CHECK.md) |
| Planning input | [scenario-seed-manifest.json](../../SPRINT_7A/scenario-seed-manifest.json) |
| Governance | Gate-first · No Evidence = Not Done · ไม่ claim Operational Readiness PASS |

---

## 1. Objective

พิสูจน์ว่า BOQ pipeline รองรับ **Warning Path** แบบ end-to-end:

- Validation มี open WARNING (ไม่มี unresolved BLOCK)
- Workflow / Approval / Handoff / Export **ดำเนินต่อได้** (forwardable tier)
- Readiness aggregate = **Warning** post-lock/final (ไม่ใช่ Ready)
- Evidence E1–E9 ครบใน namespace ทางการ `docs/SPRINT_7B/evidence/SIM-002/`

---

## 2. Scenario definition (from Sprint 7A)

| Dimension | Expected |
|-----------|----------|
| Type | Warning Path |
| Input | Low cost confidence + missing discipline scope + optional reference pending |
| Validation | WARNING findings; `open_warning_count > 0`; `unresolved_block_count = 0` (post-lock) |
| Workflow | Review Required (proceed allowed) |
| Approval | 4-stage success (WARNING ไม่ block approval) |
| Handoff | Success with Warning tier |
| Readiness | **Warning** post-lock/final (pre-lock อาจ Blocked จาก `HANDOFF_WITHOUT_LOCK`) |
| Export | xlsx + pdf succeed; report shows `ready_status=Warning`, `warning_count > 0` |
| Rules (engine) | `COST_LOW_CONFIDENCE`, `DISCIPLINE_MISSING_SCOPE` |
| Optional (informational) | Pending optional doc type `Test` — ไม่บังคับสำหรับ tier Warning หาก engine rules ครบ |

---

## 3. Prerequisite — S7B-2A Warning persistence

**Status: IMPLEMENTED (pending merge to `master`)**

Sprint 7A drift **D-06** ปิดแล้วใน branch S7B-2A ด้วย guardrails ที่อนุมัติ:

| Guardrail | Implementation |
|-----------|----------------|
| 1. ห้ามยัด WARNING ใน `findCostLayerValidationFailures` | คง BLOCK-only; WARNING ผ่าน `validation-findings.ts` → `collectCostValidationWarnings` |
| 2. Discipline จาก Validation SSOT | `discipline-validation.ts` — UI + engine ใช้ module เดียว |
| 3. Severity split | `DISCIPLINE_NO_LINES` = BLOCK (mandatory mapping); `DISCIPLINE_MISSING_SCOPE` = WARNING (optional scope text) |
| 4. Contract tests | [tests/validation-warning-persistence.test.ts](../../../tests/validation-warning-persistence.test.ts) + export-gate warning case |
| 5. E0 ก่อน SIM-002 | หลัง merge → `PHASE2_SIM-002/evidence/E0-pre-run-baseline/` |

Evidence: [S7B-2A_WARNING_PERSISTENCE/CLOSURE.md](../S7B-2A_WARNING_PERSISTENCE/CLOSURE.md) · TD-7B-001 **CLOSED**

**SIM-002 Official Run = NOT AUTHORIZED** จนกว่า S7B-2A merge + E0 baseline PASS

---

## 4. Seed design (`seedSim002`)

ขยายจาก SIM-001 happy baseline ด้วย delta ตาม manifest:

| Field | SIM-001 | SIM-002 delta |
|-------|---------|---------------|
| Project name | `SIM-001 Happy Path Project` | `SIM-002 Warning Path Project` |
| Design basis | Approved | Approved (unchanged) |
| Required docs | TOR, SLD, Specification | เหมือน SIM-001 (required satisfied) |
| Optional doc | — | สร้าง `Test` document **ไม่ link** หรือ link เป็น optional `is_required=false`, `dependency_status=Pending` |
| Discipline scope | มี scope_description | `scope_description: null` หรือ `""` |
| Cost confidence | High | **Low** อย่างน้อย 1 breakdown (แนะนำ line 1 Material) |
| BOQ lines | 3 | 3 (unchanged count) |
| IDs | ใหม่ทุกครั้ง | **ห้าม reuse** SIM-001 project/boq IDs |

Script change: `scripts/seed-sprint-7b-scenarios.mjs --scenario=SIM-002`

---

## 5. Official runner

สร้าง `scripts/execute-sim-002-official.mjs` โดยอิง `execute-sim-001-official.mjs` พร้อม assert ที่ต่าง:

| Step | SIM-001 assert | SIM-002 assert |
|------|----------------|----------------|
| E2 pre-lock | `can_approve=true`; only `HANDOFF_WITHOUT_LOCK` BLOCK OK | เหมือน SIM-001 + ต้องมี WARNING rows |
| E2 post-lock | `unresolved_block_count=0`; `validation_status=Pass` | เหมือน SIM-001 (Pass = no BLOCK, ไม่หมายถึง no WARNING) |
| E2 rules | none expected | ต้องพบ `COST_LOW_CONFIDENCE` และ `DISCIPLINE_MISSING_SCOPE` |
| E6 readiness | tier = **Warning** post-lock (pre-lock Blocked OK — `HANDOFF_WITHOUT_LOCK`) | tier = **Warning**; `open_warning_count >= 2` |
| E3/E4 approval | 4-stage → Locked | เหมือน SIM-001 |
| E5 handoff | success | success (Warning tier forwardable) |
| E7 export | `ready_status=Ready`; files > 0 | `ready_status=Warning`; `warning_count > 0`; E2/E7 consistency |
| E8 audit | rows present | rows present (validation_run + approve + lock + handoff) |

Output paths:

- Evidence: `docs/SPRINT_7B/evidence/SIM-002/E1..E9`
- Report: `docs/SPRINT_7B/EXECUTION_REPORT/SIM-002.md`
- Final check: `docs/SPRINT_7B/PHASE2_SIM-002/FINAL_GREEN_CHECK.md`

**ห้าม** อ้าง `docs/SPRINT_7B/PRE_GATE_DIAGNOSTIC/` เป็น evidence

---

## 6. Evidence checklist (E1–E9)

| ID | Artifact | Pass criteria |
|----|----------|---------------|
| E0 | Pre-run baseline logs | typecheck + test PASS |
| E1 | Seed payload | Low confidence + null scope visible in JSON |
| E2 | Validation snapshot | WARNING rules present; post-lock 0 BLOCK |
| E3 | Workflow state | Final Lock reached |
| E4 | Approval gates | 4 stages PASS |
| E5 | Handoff record | Created with `handoff_target` |
| E6 | Readiness status | post-lock tier = **Warning**; pre-lock Blocked OK (workflow gate) |
| E7 | Export xlsx/pdf + metadata | `ready_status=Warning`, warning_count > 0 |
| E8 | Audit trail | Actions for validation, approval, handoff |
| E9 | Execution note | Governance disclaimer; SIM-003..008 pending |

---

## 7. Execution sequence (after plan approval)

```
1. Approve this plan (explicit sign-off)
2. Branch: s7b-2a-warning-persistence (micro-fix S7B-2A)
3. Implement + test S7B-2A → merge to master
4. E0 baseline on master (typecheck + test logs)
5. Fresh DB seed: node scripts/seed-sprint-7b-scenarios.mjs --scenario=SIM-002
6. Official run: npx tsx scripts/execute-sim-002-official.mjs --project=<id> --boq=<id>
7. FINAL_GREEN_CHECK.md + EXECUTION_REPORT/SIM-002.md
8. Merge evidence branch (if branched)
```

**Estimated touch:** ~4 src files + 1 seed function + 1 runner script + docs/evidence

---

## 8. Out of scope

- SIM-004, SIM-008 (Phase 2 ลำดับถัดไป — ต้อง plan แยก)
- SIM-003, SIM-005, SIM-006, SIM-007 (Phase 3 Blocked)
- INFO severity rule สำหรับ optional doc (TD-7A-008 proxy — บันทึกใน E9 ถ้าไม่ implement)
- Operational Readiness PASS claim
- ใช้ SIM run ปิด TD (S7B-2A ปิดด้วย unit/contract tests)

---

## 9. Risks

| Risk | Mitigation |
|------|------------|
| WARNING wiring กว้างเกิน — regression SIM-001 | รัน SIM-001 regression หลัง S7B-2A; SIM-001 seed ยัง High confidence + scope |
| Discipline WARNING ซ้ำ UI + DB | Persist จาก engine เท่านั้น; UI อ่านจาก `validation_results` ในอนาคต (out of scope) |
| Post-lock HANDOFF_WITHOUT_LOCK cleared แต่ WARNING คงอยู่ | Assert post-lock tier ยัง Warning |
| Optional doc ไม่มี INFO rule | ไม่ fail run — บันทึก delta ใน E9 |

---

## 10. Approval

| Role | Decision | Date | Notes |
|------|----------|------|-------|
| Product / Owner | ☑ APPROVE (guardrails) | 2026-06-07 | S7B-2A first; SIM-002 after merge + E0 |
| Engineering | ☑ APPROVE (guardrails) | 2026-06-07 | Unified aggregator + discipline SSOT |

**SIM-002 execution authorized only after:** S7B-2A merged to `master` + E0 baseline PASS on `master`

---

End of SIM-002_PLAN.md (PROPOSED)
