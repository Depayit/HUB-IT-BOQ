/**
 * Seed BOQ lines + cost breakdowns for Sprint 4E/4F screenshot evidence.
 *
 * Usage (requires DATABASE_URL):
 *   node scripts/seed-sprint-4ef-evidence.mjs
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const PROJECT_ID = process.env.PROJECT_ID ?? "349f965d-cc8e-4139-b96c-02f363d46e70";
const BOQ_VERSION_ID =
  process.env.BOQ_VERSION_ID ?? "045d0f67-29bc-4cec-84ee-b144f7bbf77c";

const LINE_IDS = {
  missing: "6689a827-d71f-450c-97d7-0662301aae82",
  duplicate: "a4ef0002-0000-4000-8000-000000000002",
  zero: "a4ef0003-0000-4000-8000-000000000003",
  override: "a4ef0004-0000-4000-8000-000000000004",
  lowConf: "a4ef0005-0000-4000-8000-000000000005",
  summary: "a4ef0006-0000-4000-8000-000000000006",
};

async function getCategoryMap() {
  const rows = await prisma.cost_category_master.findMany({
    where: { is_active: true },
    select: { cost_category_id: true, category_code: true },
  });
  return Object.fromEntries(rows.map((r) => [r.category_code, r.cost_category_id]));
}

async function main() {
  const version = await prisma.boq_versions.findFirst({
    where: { boq_version_id: BOQ_VERSION_ID, project_id: PROJECT_ID },
  });
  if (!version) {
    throw new Error("BOQ version not found — set PROJECT_ID / BOQ_VERSION_ID");
  }

  const discipline = await prisma.project_disciplines.findFirst({
    where: { boq_version_id: BOQ_VERSION_ID, included_flag: true },
    select: { project_discipline_id: true },
  });
  if (!discipline) {
    throw new Error("No included discipline — run discipline seed first");
  }

  const cats = await getCategoryMap();
  const pdId = discipline.project_discipline_id;

  await prisma.validation_results.deleteMany({
    where: { boq_version_id: BOQ_VERSION_ID },
  });

  await prisma.boq_cost_breakdowns.deleteMany({
    where: {
      boq_line: {
        boq_version_id: BOQ_VERSION_ID,
        boq_line_id: { not: LINE_IDS.missing },
      },
    },
  });

  await prisma.boq_lines.deleteMany({
    where: {
      boq_version_id: BOQ_VERSION_ID,
      boq_line_id: { in: Object.values(LINE_IDS).filter((id) => id !== LINE_IDS.missing) },
    },
  });

  await prisma.boq_lines.update({
    where: { boq_line_id: LINE_IDS.missing },
    data: {
      line_no: 1,
      item_description: "Line 1 — Missing cost layer (evidence)",
    },
  });

  const lineDefs = [
    {
      id: LINE_IDS.duplicate,
      line_no: 2,
      item_description: "Line 2 — Duplicate MATERIAL category",
    },
    {
      id: LINE_IDS.zero,
      line_no: 3,
      item_description: "Line 3 — Zero calculated value",
    },
    {
      id: LINE_IDS.override,
      line_no: 4,
      item_description: "Line 4 — Invalid manual override",
    },
    {
      id: LINE_IDS.lowConf,
      line_no: 5,
      item_description: "Line 5 — Low confidence warning",
    },
    {
      id: LINE_IDS.summary,
      line_no: 6,
      item_description: "Line 6 — Valid costs for summary roll-up",
    },
  ];

  for (const line of lineDefs) {
    await prisma.boq_lines.create({
      data: {
        boq_line_id: line.id,
        boq_version_id: BOQ_VERSION_ID,
        project_discipline_id: pdId,
        line_no: line.line_no,
        item_description: line.item_description,
        unit: "ea",
        quantity: 1,
        is_critical_line: false,
      },
    });
  }

  const breakdown = (lineId, categoryCode, extra) => ({
    boq_line_id: lineId,
    cost_category_id: cats[categoryCode],
    calculation_method: "unit_rate",
    base_value: extra.base_value ?? 1,
    rate: extra.rate ?? 1,
    quantity_factor: extra.quantity_factor ?? 1,
    calculated_value: extra.calculated_value ?? 1,
    confidence_level: extra.confidence_level ?? "High",
    manual_override_flag: extra.manual_override_flag ?? false,
    override_reason: extra.override_reason ?? null,
  });

  await prisma.boq_cost_breakdowns.createMany({
    data: [
      breakdown(LINE_IDS.duplicate, "MATERIAL", { calculated_value: 1000 }),
      breakdown(LINE_IDS.duplicate, "MATERIAL", { calculated_value: 500 }),
      breakdown(LINE_IDS.zero, "LABOR", { calculated_value: 0, rate: 0 }),
      breakdown(LINE_IDS.override, "LOGISTICS", {
        calculated_value: 200,
        manual_override_flag: true,
        override_reason: null,
      }),
      breakdown(LINE_IDS.lowConf, "TESTING", {
        calculated_value: 300,
        confidence_level: "Low",
      }),
      breakdown(LINE_IDS.summary, "MATERIAL", { calculated_value: 10000 }),
      breakdown(LINE_IDS.summary, "LABOR", { calculated_value: 5000 }),
      breakdown(LINE_IDS.summary, "LOGISTICS", { calculated_value: 2000 }),
      breakdown(LINE_IDS.summary, "TESTING", { calculated_value: 1500 }),
      breakdown(LINE_IDS.summary, "DOCUMENTATION", { calculated_value: 800 }),
      breakdown(LINE_IDS.summary, "INDIRECT", { calculated_value: 1200 }),
      breakdown(LINE_IDS.summary, "RISK", { calculated_value: 900 }),
      breakdown(LINE_IDS.summary, "OVERHEAD", { calculated_value: 600 }),
    ],
  });

  await prisma.boq_summary.deleteMany({
    where: { boq_version_id: BOQ_VERSION_ID },
  });

  console.log("Sprint 4EF evidence data ready");
  console.log(`  Project: ${PROJECT_ID}`);
  console.log(`  BOQ:     ${BOQ_VERSION_ID}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
