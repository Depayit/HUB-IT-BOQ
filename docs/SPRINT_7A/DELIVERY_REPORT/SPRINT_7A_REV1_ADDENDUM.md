# Sprint 7A Rev.1 — Operational Readiness Simulation Plan Addendum

Project: HUB IT BOQ V3 — ERP-ready BOQ Cost Intelligence System
Type: **Planning / Readiness Addendum only** (ไม่ใช่ Sprint 7B execution, ไม่ claim operational readiness PASS)
Principle: **No Evidence = Not Done** · **Governance before Automation** · **Workflow before AI**

> งานนี้คือ Sprint 7A Revision (เอกสาร/แผน) เท่านั้น — ไม่มีการ execute end-to-end flow จริง, ไม่ claim SIM-001..008 ว่า PASS, ไม่เพิ่ม AI automation, ไม่ bypass engine ใด ๆ
> โค้ดที่แก้เพื่อให้ baseline green ถูกบันทึกเป็น **S7B-0 Baseline Reconciliation Candidate** ไม่ใช่ Sprint 7A execution

---

## 1. Revision Summary

แก้ไขจาก Sprint 7A เดิมดังนี้:
- ระบุชัดว่า Sprint 7A เป็น **planning deliverable** ที่ผ่านแล้ว แต่ **operational readiness ยังไม่ผ่าน**
- เพิ่ม **Baseline Reconciliation** (claim vs current evidence) — แก้ตัวเลข/สถานะที่เคย claim เกินจริง
- เพิ่ม **Scenario Executability Classification** ให้ SIM-001..008
- เพิ่ม **Sprint 7B Entry Gate Checklist** (gate ก่อนเริ่ม execute)
- เพิ่ม **Readiness Warning Tier Plan** และ **Validation Rule SSOT Clarification**
- ปรับ **Evidence Plan Rev.1** ให้มี path / filename / pass criteria
- S7B-0 Baseline Reconciliation Candidate (โค้ด) ถูก re-apply แบบ persist: typecheck/test green

ขอบเขตนี้ยังเป็น readiness addendum เท่านั้น ไม่ใช่การรันจริง

---

## 2. Baseline Reconciliation (claim vs current evidence)

| Area | เดิม claim | Current evidence | สถานะ |
|------|-----------|------------------|-------|
| Build / Typecheck | PASS | `npm run typecheck` → exit 0 | RECONCILED — true |
| Unit Tests | 64+ PASS | `npm test` → **82 passed / 14 files**, exit 0 | RECONCILED — 82 ผ่าน (E4) |
| Test count vs master snapshot | implied stable | git init + commit 128761b (9 test files / 59 tests) | RECONCILED — snapshot established |
| Validation Rules SSOT | complete | restored `validation-rules.ts` full SSOT | RECONCILED — true |
| Workflow Governance | present | restored `workflow-governance.ts` + import resolves | RECONCILED — true |
| Audit Framework | wired | code wired; **ยังไม่มี audit_logs rows จาก run จริง** | PARTIAL — runtime evidence pending |
| Export BLOCK gate | enforced | SSOT predicate + exportToExcel throw→route 400 (E6) | RECONCILED — true |
| Readiness Warning tier | available | 3-tier Ready/Warning/Blocked aggregate + tests (E7) | RECONCILED — true |
| Handoff target schema | confirmed | enum + field + migration 0003 + tests (E9) | RECONCILED — true |
| Reporting Governance | GOV_* active | GOV_* SSOT mapping (REPORT_*→GOV_*) + tests (E8) | RECONCILED — true |

---

## 3. Scenario Executability Classification (SIM-001..008)

Legend: **READY TO EXECUTE** / **CONDITIONAL** (รันได้เมื่อ S7B-0 runtime gate ผ่าน) / **TARGET-STATE ONLY** (ยังขาด capability ต้องสร้างก่อน)

| SIM | Scenario | Classification | เหตุผล / สิ่งที่ขาด |
|-----|----------|----------------|----------------------|
| SIM-001 | Happy Path | **CONDITIONAL** | engine green แล้ว; รอ runtime evidence (audit_logs rows, export 200, readiness Ready) |
| SIM-002 | Warning Path | **CONDITIONAL** | Readiness Warning tier พร้อมแล้ว (TD-7A-006 CLOSED); รอ runtime warning data ตอน execute |
| SIM-003 | Blocked Path | **CONDITIONAL** | governance BLOCK + export block มีแล้ว; รอ captured 400 + block reason จริง |
| SIM-004 | Cost Variance Warning | **TARGET-STATE ONLY** | ขึ้นกับ Warning tier (TD-7A-006) |
| SIM-005 | Missing Discipline Block | **CONDITIONAL** | `DISCIPLINE_NO_LINES` BLOCK มีแล้ว; รอ runtime evidence |
| SIM-006 | Approval Authority Conflict | **CONDITIONAL** | role gate มีใน workflow-authority; ระวัง dual workflow drift (TD-7A-009) |
| SIM-007 | Handoff Payload Incomplete | **TARGET-STATE ONLY** | `handoff_target`/payload schema ยังไม่ระบุ (TD-7A-010) |
| SIM-008 | Reporting Governance Warning | **CONDITIONAL** | GOV_* SSOT mapping พร้อมแล้ว (TD-7A-011 CLOSED); รอ runtime data ตอน execute |

สรุป: ยังไม่มี SIM ใดเป็น READY TO EXECUTE ทันที — ต้องผ่าน S7B-0 runtime gate ก่อน

---

## 4. Updated Technical Debt Register (สรุป)

ดูฉบับเต็ม: `docs/SPRINT_7A/TECHNICAL_DEBT_REGISTER.md`

| TD | Owner | Action | Evidence to Close | Status |
|----|-------|--------|-------------------|--------|
| TD-7A-001 | Platform | restore SSOT/governance, clear cache | typecheck exit 0 | CLOSED |
| TD-7A-002 | Validation | restore full validation SSOT | file + unit tests | CLOSED |
| TD-7A-003 | Validation | create workflow-governance | file + import + tests | CLOSED |
| TD-7A-004 | Backend | wire audit append | runtime audit_logs rows | IN PROGRESS |
| TD-7A-005 | Reporting | enforce export BLOCK→400 | captured 400 | IN PROGRESS |
| TD-7A-006 | Readiness | add Ready/Warning/Blocked tier | test/screenshot/API | OPEN |
| TD-7A-007 | QA | establish VCS snapshot, reconcile count | snapshot diff | OPEN |
| TD-7A-008 | Platform | remove _tmp, clear .next | typecheck clean | CLOSED |

(เพิ่ม TD-7A-009 dual workflow drift, TD-7A-010 handoff target schema, TD-7A-011 reporting GOV_* naming ในฉบับเต็ม)

ทุก TD ที่ปิดมี evidence รองรับ — TD ที่ยังไม่มี runtime evidence คงสถานะ IN PROGRESS/OPEN ตามหลัก No Evidence = Not Done

---

## 5. Validation Rule SSOT Clarification

| ประเด็น | แหล่ง / ค่า |
|--------|-------------|
| Rule source (SSOT) | `src/lib/validations/validation-rules.ts` |
| Rule path (cost sub-rules) | `src/lib/validations/cost-validation.ts` |
| Governance rules | `src/lib/validations/workflow-governance.ts` (DESIGN_BASIS_NOT_APPROVED, HANDOFF_WITHOUT_LOCK) |
| Severity source | `VALIDATION_RULE_DEFINITIONS[code].severity` (INFO/WARNING/BLOCK) |
| Result status mapping | `resultStatusForRule()` → WARNING=Warning, else Fail |
| Approval gate set | `APPROVAL_BLOCK_RULES` |
| Handoff gate set | `HANDOFF_BLOCK_RULES` (= approval gate + HANDOFF_WITHOUT_LOCK) |
| Readiness aggregate | `validation.service.getWorkflowGate()` → `unresolved_block_count` (ปัจจุบัน binary; warning tier ยังไม่ aggregate) |
| Export gate | `export.service.loadReportForExport()` block เมื่อ `validation.unresolved_blocks > 0` → route 400 |
| Reporting completeness | `src/lib/validations/reporting.ts` (`REPORT_*` codes) — **หมายเหตุ: ยังไม่ใช่ `GOV_*`** |

---

## 6. Readiness Warning Tier Plan

| Validation Result | Readiness Status | Behavior |
|-------------------|------------------|----------|
| PASS / INFO only | **Ready** | ดำเนินการต่อได้ (approve / handoff / export) |
| WARNING (ไม่มี BLOCK) | **Warning** | ไปต่อได้แต่ต้อง review; report ต้องแสดง warning ชัดเจน; export อนุญาตแต่ flag |
| BLOCK (มี unresolved) | **Blocked** | ห้าม approve / handoff / export; ต้องมี block reason |

สถานะปัจจุบัน: aggregate ยัง binary (Ready / Not Ready) — **Warning tier ยังไม่ implement** (TD-7A-006)
แผน S7B-0: เพิ่ม 3-tier aggregate ใน Readiness Framework โดยอ่านจาก validation severity (มี WARNING แต่ไม่มี BLOCK → Warning) — ไม่สร้าง readiness rule นอก framework เดิม

---

## 7. Evidence Plan Rev.1 (E1–E9)

| ID | Evidence | Path / Filename | Pass Criteria |
|----|----------|-----------------|---------------|
| E1 | Typecheck log | `docs/SPRINT_7A/evidence/E1-typecheck.log` | exit 0, 0 errors |
| E2 | Test result summary | `docs/SPRINT_7A/evidence/E2-test-summary.log` | all files passed, exit 0 |
| E3 | Validation SSOT unit tests | `tests/validation-rules.test.ts`, `tests/workflow-governance.test.ts` | green |
| E4 | Workflow governance import check | `docs/SPRINT_7A/evidence/E4-import-check.log` | imports resolve, typecheck clean |
| E5 | Audit append rows | `docs/SPRINT_7A/evidence/E5-audit-logs.json` | audit_logs row ต่อ approve/lock/handoff/validation |
| E6 | Export BLOCK 400 | `docs/SPRINT_7A/evidence/E6-export-blocked.txt` | HTTP 400 + block reason สำหรับ BOQ ที่มี BLOCK |
| E7 | Readiness tier | `docs/SPRINT_7A/evidence/E7-readiness.json` | ปรากฏ Ready/Warning/Blocked ตาม input |
| E8 | Handoff schema/test | `docs/SPRINT_7A/evidence/E8-handoff-schema.txt` | schema/migration + test ของ handoff payload |
| E9 | Reporting governance | `docs/SPRINT_7A/evidence/E9-reporting-gov.txt` | rule evidence (REPORT_*/GOV_*) + completeness gate |

E5–E9 ต้องผลิตใน S7B-0 / S7B (รัน execute) — ปัจจุบันยังไม่มี (No Evidence = Not Done)

---

## 8. Sprint 7B Entry Gate Checklist

**Sprint 7B ห้ามเริ่ม execute SIM ใด จนกว่า checklist นี้ผ่านครบทุกข้อ**

| Gate | Required Evidence | Status |
|------|-------------------|--------|
| npm run typecheck green | terminal output / log (exit 0) | **PASS** |
| npm test green | test result summary (82 passed, exit 0) — E4 | **PASS** |
| Test count reconciled | git snapshot S7B-0 (14 test files / 82 tests) | **PASS** |
| Validation Rules SSOT restored | file path + unit tests | **PASS** |
| Workflow Governance restored | file path + import check | **PASS** |
| Readiness Warning tier available | `tests/readiness.test.ts` (E7) — 3-tier aggregate | **PASS** |
| Audit append wired | `tests/audit-service.test.ts` (E5) — append payload + correction + immutability | **PASS** |
| Export BLOCK gate enforced | `tests/export-gate.test.ts` (E6) — blocked→throw→route 400 | **PASS** |
| Handoff target schema confirmed | schema enum + migration 0003 + `tests/handoff.test.ts` (E9) | **PASS** |
| Reporting Governance active | `tests/reporting-governance.test.ts` (E8) — GOV_* SSOT mapping | **PASS** |
| TD Register updated | TD-7A-001 to TD-7A-008 | **PASS** |

### Overall Entry Gate Status: **S7B ENTRY READY — baseline/เอกสารเท่านั้น (ไม่ใช่ operational readiness PASS)**
ทั้ง 11 gate = **PASS** (typecheck/test green, SSOT validation + workflow governance, readiness 3-tier, audit wired, export BLOCK→400, handoff target schema, reporting GOV_* SSOT, TD register) — เป็น **documentation + baseline readiness** ที่คุมความเสี่ยงก่อนเข้า S7B-0 ได้ ยังไม่ใช่การยืนยันว่า flow จริงทำงานครบ

หมายเหตุ evidence: gate Audit (E5) และ Export 400 (E6) ใช้ **test-level evidence** (mocked unit/contract tests) ตามหลักไม่ execute end-to-end จริงใน scope นี้ — **Operational Readiness ยังไม่ผ่าน** จนกว่าจะเก็บ **live runtime evidence** (audit_logs rows จริง + HTTP 400 จริง) ระหว่าง execute SIM-001..008 ห้าม bypass Validation / Workflow / Approval / Audit Framework ทุกกรณี

---

## 9. Architecture Drift Re-check

| Drift risk | สถานะ |
|------------|-------|
| Validation rules truncated / นอก engine | **ลดลง** — SSOT เดียวใน validation-rules.ts |
| Workflow governance หาย / ซ้ำ | **ลดลง** — workflow-governance.ts + re-export, ไม่ duplicate |
| Recovery cruft (`_tmp`) เป็น drift source | **ปิดแล้ว** — ลบทิ้ง |
| Audit bypass | **ไม่มี** — append-only guard คงอยู่, ต่อผ่าน service เดิม |
| Dual workflow model (`workflow-authority` vs governance) | **ยังเปิด** — ย้ายไป S7B-0 (TD-7A-009) |
| Handoff target schema undefined | **ปิดแล้ว** — enum + field + migration 0003 (TD-7A-010 CLOSED) |
| Reporting governance naming (`REPORT_*` vs `GOV_*`) | **ปิดแล้ว** — GOV_* SSOT mapping (TD-7A-011 CLOSED) |

ไม่มี architecture drift ใหม่จาก Rev.1 (ไม่สร้าง logic ใหม่นอก framework เดิม)

---

## 10. Final Recommendation

> **ขอบเขตของเอกสารนี้:** Sprint 7A Rev.1 เป็นการปรับปรุง **planning baseline + entry gate** สำหรับ Sprint 7B เท่านั้น — **ไม่ใช่ execution result** และ **ไม่ใช่ operational readiness PASS**

- **Sprint 7A Rev.1 (เอกสาร/แผน): PASS** — เอกสารครบทุกหัวข้อ, gate ชัด, TD actionable
- **S7B-0 Baseline Reconciliation: PASS** — ปลด FAIL ครบทั้ง 5 ข้อ (typecheck/test green 82 ผ่าน, readiness 3-tier, audit wired, export BLOCK→400, handoff target schema, reporting GOV_* SSOT) พร้อม evidence E3–E9
- **Sprint 7B Entry Gate: READY (baseline/เอกสารเท่านั้น)** — 11/11 gate PASS เป็น **documentation + baseline readiness** ที่คุมความเสี่ยงก่อนเข้า S7B-0 ได้; ยังไม่ใช่การยืนยันว่า flow จริงทำงานครบ
- **Operational Readiness: ❌ NOT PASS (ยังไม่ผ่าน)** — จะถือว่าผ่าน **ก็ต่อเมื่อ Sprint 7B execute scenario จริง (SIM-001..008) พร้อม evidence ครบ** เท่านั้น; gate Audit (E5) / Export 400 (E6) ในเอกสารนี้เป็น **test-level evidence** ต้องมี **live runtime evidence** (audit_logs rows จริง + HTTP 400 จริง) ตอน execute มาแทน/เสริม

### ข้อความปิดรายงาน
Sprint 7A Rev.1 + S7B-0 Baseline Reconciliation ส่งมอบในฐานะ **planning baseline + entry gate** ที่คุมความเสี่ยงก่อนเข้า S7B-0: baseline reconciliation, scenario executability, TD register (ปิด TD-7A-001..008, 010, 011), validation rule SSOT, readiness warning tier (3-tier), evidence plan Rev.1 (E3–E9) และ Sprint 7B Entry Gate ครบทุกหัวข้อ
สถานะนี้ **เปลี่ยนจาก "PASS WITH WARNING" → เอกสารที่คุมความเสี่ยงพร้อมเข้า S7B-0** — **ไม่ใช่การ claim operational readiness PASS**
**Operational Readiness ยังไม่ผ่าน** จนกว่า Sprint 7B จะ execute scenario จริงพร้อม evidence ครบ ยึดหลัก **No Evidence = Not Done** และ **ห้าม bypass Validation / Workflow / Approval / Audit Framework ทุกกรณี**
