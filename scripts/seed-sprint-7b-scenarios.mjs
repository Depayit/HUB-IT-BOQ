/**
 * Sprint 7B scenario seed
 *
 * Tag: S7B-0 Baseline Reconciliation Candidate (per Sprint 7A constraint)
 * Purpose: bootstrap minimal data for SIM-001 Happy Path scenarios.
 *
 * NOTE on usage history: this seed was first used by the Pre-Gate Diagnostic
 * run (see INC-S7B-002 + docs/SPRINT_7B/PRE_GATE_DIAGNOSTIC/). That run is
 * NOT a valid Sprint 7B Phase 1 PASS. The seed itself is reusable for
 * S7B-0 gate closure tests and for the eventual official SIM-001 run AFTER
 * Entry Gate is cleared.
 *
 * Usage:
 *   node scripts/seed-sprint-7b-scenarios.mjs --scenario=SIM-001
 *   node scripts/seed-sprint-7b-scenarios.mjs --scenario=SIM-002
 *
 * Constraints:
 * - Does NOT bypass any framework — uses Prisma writes that match the same
 *   shape services would produce.
 * - SIM-001 (Phase 1) and SIM-002 (Phase 2 Warning Path) supported.
 * - Idempotent for masters (discipline_master, cost_category_master) — uses upsert.
 *   For SIM-001 instance data, fails if the project already exists (caller can
 *   reset DB before re-running).
 */
import { PrismaClient, Prisma } from "@prisma/client";

// Inlined from src/lib/constants/disciplines.ts to keep this script as ESM .mjs
// (mjs cannot import .ts directly without a loader).
const DISCIPLINE_MASTER_SEED = [
  { discipline_code: "PWR", discipline_name: "Power", description: "Electrical power distribution, UPS, PDU, and grounding" },
  { discipline_code: "CLG", discipline_name: "Cooling", description: "HVAC, chilled water, and thermal management systems" },
  { discipline_code: "NET", discipline_name: "Network", description: "Structured cabling, fiber, and network infrastructure" },
  { discipline_code: "SEC", discipline_name: "Security", description: "Access control, CCTV, and physical security systems" },
  { discipline_code: "FPS", discipline_name: "Fire Protection", description: "Fire detection, suppression, and life-safety systems" },
  { discipline_code: "BMS", discipline_name: "Monitoring / BMS", description: "Building management, DCIM, and monitoring integration" },
  { discipline_code: "CIV", discipline_name: "Civil / Structural", description: "Raised floor, containment, and structural scope" },
];

// Inlined from src/lib/constants/cost-categories.ts (same reason).
const COST_CATEGORY_SEED = [
  { category_code: "MATERIAL", category_name: "Material", sort_order: 1 },
  { category_code: "LABOR", category_name: "Labor", sort_order: 2 },
  { category_code: "LOGISTICS", category_name: "Logistics", sort_order: 3 },
  { category_code: "TESTING", category_name: "Testing", sort_order: 4 },
  { category_code: "DOCUMENTATION", category_name: "Documentation", sort_order: 5 },
  { category_code: "INDIRECT", category_name: "Indirect", sort_order: 6 },
  { category_code: "RISK", category_name: "Risk", sort_order: 7 },
  { category_code: "OVERHEAD", category_name: "Overhead", sort_order: 8 },
];

const prisma = new PrismaClient();

function parseArgs() {
  const out = {};
  for (const arg of process.argv.slice(2)) {
    const m = arg.match(/^--([^=]+)=(.+)$/);
    if (m) out[m[1]] = m[2];
  }
  return out;
}

async function ensureMasters() {
  for (const row of DISCIPLINE_MASTER_SEED) {
    await prisma.discipline_master.upsert({
      where: { discipline_code: row.discipline_code },
      create: {
        discipline_code: row.discipline_code,
        discipline_name: row.discipline_name,
        description: row.description,
        is_active: true,
      },
      update: {
        discipline_name: row.discipline_name,
        description: row.description,
        is_active: true,
      },
    });
  }

  for (const row of COST_CATEGORY_SEED) {
    await prisma.cost_category_master.upsert({
      where: { category_code: row.category_code },
      create: {
        category_code: row.category_code,
        category_name: row.category_name,
        sort_order: row.sort_order,
        is_active: true,
      },
      update: {
        category_name: row.category_name,
        sort_order: row.sort_order,
        is_active: true,
      },
    });
  }
}

/**
 * SIM-001 Happy Path seed.
 *
 * Per scenario-seed-manifest.json:
 *   { scenario_type: "Happy Path", design_basis: "Approved",
 *     documents: ["TOR","SLD","Specification"], discipline_lines: 3,
 *     cost_confidence: "High", expected_readiness: "Ready" }
 */
async function seedSim001() {
  const project = await prisma.projects.create({
    data: {
      project_name: "SIM-001 Happy Path Project",
      client_id: "SIM-001-CLIENT",
      project_type: "Datacenter",
      it_load_kw: new Prisma.Decimal(1500),
      rack_count: 100,
      rack_density_kw_per_rack: new Prisma.Decimal(15),
      tier_target: "Tier III",
      currency: "THB",
      project_status: "Active",
    },
  });

  await prisma.design_basis_versions.create({
    data: {
      project_id: project.project_id,
      design_version_no: 1,
      it_load_assumption_kw: new Prisma.Decimal(1500),
      rack_count_assumption: 100,
      rack_density_assumption: new Prisma.Decimal(15),
      power_architecture: "2N redundant",
      cooling_architecture: "N+1 chilled water",
      fire_protection_assumption: "FM-200",
      monitoring_assumption: "DCIM with BMS",
      redundancy_assumption: "2N power, N+1 cooling",
      technical_compliance_basis: "Uptime Institute Tier III",
      customer_requirement_reference: "RFP-2026-001",
      approval_status: "Approved",
    },
  });

  const docs = await Promise.all(
    [
      { type: "TOR", name: "Terms of Reference v1.0" },
      { type: "SLD", name: "Single Line Diagram v1.0" },
      { type: "Specification", name: "Technical Specification v1.0" },
    ].map((d) =>
      prisma.documents.create({
        data: {
          project_id: project.project_id,
          document_type: d.type,
          document_name: d.name,
          version_no: "1.0",
          document_status: "Active",
        },
      }),
    ),
  );

  const boqVersion = await prisma.boq_versions.create({
    data: {
      project_id: project.project_id,
      version_no: 1,
      status: "Draft",
      lock_status: "Unlocked",
    },
  });

  await Promise.all(
    docs.map((doc) =>
      prisma.boq_version_documents.create({
        data: {
          boq_version_id: boqVersion.boq_version_id,
          document_id: doc.document_id,
          dependency_type: doc.document_type === "Specification" ? "Handoff" : "Engineer Review",
          is_required: true,
          dependency_status: "Satisfied",
        },
      }),
    ),
  );

  const pwrDiscipline = await prisma.discipline_master.findUniqueOrThrow({
    where: { discipline_code: "PWR" },
  });

  const projectDiscipline = await prisma.project_disciplines.create({
    data: {
      project_id: project.project_id,
      boq_version_id: boqVersion.boq_version_id,
      discipline_id: pwrDiscipline.discipline_id,
      included_flag: true,
      scope_description:
        "Electrical power distribution scope — UPS, PDU, switchgear, transformer for 1500kW IT load (2N).",
      risk_level: "Medium",
    },
  });

  const materialCat = await prisma.cost_category_master.findUniqueOrThrow({
    where: { category_code: "MATERIAL" },
  });
  const laborCat = await prisma.cost_category_master.findUniqueOrThrow({
    where: { category_code: "LABOR" },
  });

  const lineDefs = [
    {
      line_no: 1,
      item_id: "PWR-UPS-001",
      item_description: "UPS module 500kVA (modular, 2N config) — supply & install",
      unit: "set",
      quantity: 4,
      material: 8000000,
      labor: 600000,
    },
    {
      line_no: 2,
      item_id: "PWR-PDU-001",
      item_description: "Rack PDU intelligent, 32A 3-phase — supply & install",
      unit: "set",
      quantity: 200,
      material: 4500000,
      labor: 350000,
    },
    {
      line_no: 3,
      item_id: "PWR-SWG-001",
      item_description: "MV switchgear 24kV 3-panel — supply, install, commissioning",
      unit: "lot",
      quantity: 1,
      material: 12000000,
      labor: 1200000,
    },
  ];

  for (const def of lineDefs) {
    const line = await prisma.boq_lines.create({
      data: {
        boq_version_id: boqVersion.boq_version_id,
        project_discipline_id: projectDiscipline.project_discipline_id,
        item_id: def.item_id,
        line_no: def.line_no,
        item_description: def.item_description,
        unit: def.unit,
        quantity: new Prisma.Decimal(def.quantity),
        cost_source: "Vendor Quote",
        confidence_level: "High",
        is_critical_line: false,
      },
    });

    await prisma.boq_cost_breakdowns.createMany({
      data: [
        {
          boq_line_id: line.boq_line_id,
          cost_category_id: materialCat.cost_category_id,
          calculation_method: "manual",
          base_value: new Prisma.Decimal(def.material),
          rate: new Prisma.Decimal(1),
          quantity_factor: new Prisma.Decimal(1),
          calculated_value: new Prisma.Decimal(def.material),
          cost_source: "Vendor Quote",
          confidence_level: "High",
          manual_override_flag: false,
        },
        {
          boq_line_id: line.boq_line_id,
          cost_category_id: laborCat.cost_category_id,
          calculation_method: "manual",
          base_value: new Prisma.Decimal(def.labor),
          rate: new Prisma.Decimal(1),
          quantity_factor: new Prisma.Decimal(1),
          calculated_value: new Prisma.Decimal(def.labor),
          cost_source: "Vendor Quote",
          confidence_level: "High",
          manual_override_flag: false,
        },
      ],
    });
  }

  // Roll up summary so export has data.
  const subtotal = lineDefs.reduce((s, d) => s + d.material + d.labor, 0);
  const margin = 15;
  const sellingPrice = subtotal * (1 + margin / 100);
  const grossProfit = sellingPrice - subtotal;

  await prisma.boq_summary.create({
    data: {
      boq_version_id: boqVersion.boq_version_id,
      total_material_cost: new Prisma.Decimal(
        lineDefs.reduce((s, d) => s + d.material, 0),
      ),
      total_labor_cost: new Prisma.Decimal(
        lineDefs.reduce((s, d) => s + d.labor, 0),
      ),
      subtotal_before_margin: new Prisma.Decimal(subtotal),
      margin_percent: new Prisma.Decimal(margin),
      selling_price: new Prisma.Decimal(sellingPrice),
      gross_profit: new Prisma.Decimal(grossProfit),
      gross_margin_percent: new Prisma.Decimal((grossProfit / sellingPrice) * 100),
    },
  });

  return {
    projectId: project.project_id,
    boqVersionId: boqVersion.boq_version_id,
    projectDisciplineId: projectDiscipline.project_discipline_id,
    documentIds: docs.map((d) => d.document_id),
  };
}

async function seedSim002() {
  const project = await prisma.projects.create({
    data: {
      project_name: "SIM-002 Warning Path Project",
      client_id: "SIM-002-CLIENT",
      project_type: "Datacenter",
      it_load_kw: new Prisma.Decimal(1500),
      rack_count: 100,
      rack_density_kw_per_rack: new Prisma.Decimal(15),
      tier_target: "Tier III",
      currency: "THB",
      project_status: "Active",
    },
  });

  await prisma.design_basis_versions.create({
    data: {
      project_id: project.project_id,
      design_version_no: 1,
      it_load_assumption_kw: new Prisma.Decimal(1500),
      rack_count_assumption: 100,
      rack_density_assumption: new Prisma.Decimal(15),
      power_architecture: "2N redundant",
      cooling_architecture: "N+1 chilled water",
      fire_protection_assumption: "FM-200",
      monitoring_assumption: "DCIM with BMS",
      redundancy_assumption: "2N power, N+1 cooling",
      technical_compliance_basis: "Uptime Institute Tier III",
      customer_requirement_reference: "RFP-2026-002",
      approval_status: "Approved",
    },
  });

  const requiredDocs = await Promise.all(
    [
      { type: "TOR", name: "Terms of Reference v1.0" },
      { type: "SLD", name: "Single Line Diagram v1.0" },
      { type: "Specification", name: "Technical Specification v1.0" },
    ].map((d) =>
      prisma.documents.create({
        data: {
          project_id: project.project_id,
          document_type: d.type,
          document_name: d.name,
          version_no: "1.0",
          document_status: "Active",
        },
      }),
    ),
  );

  await prisma.documents.create({
    data: {
      project_id: project.project_id,
      document_type: "Test",
      document_name: "Factory Acceptance Test Plan v0.9 (draft)",
      version_no: "0.9",
      document_status: "Draft",
    },
  });

  const boqVersion = await prisma.boq_versions.create({
    data: {
      project_id: project.project_id,
      version_no: 1,
      status: "Draft",
      lock_status: "Unlocked",
    },
  });

  await Promise.all(
    requiredDocs.map((doc) =>
      prisma.boq_version_documents.create({
        data: {
          boq_version_id: boqVersion.boq_version_id,
          document_id: doc.document_id,
          dependency_type: doc.document_type === "Specification" ? "Handoff" : "Engineer Review",
          is_required: true,
          dependency_status: "Satisfied",
        },
      }),
    ),
  );

  const pwrDiscipline = await prisma.discipline_master.findUniqueOrThrow({
    where: { discipline_code: "PWR" },
  });

  const projectDiscipline = await prisma.project_disciplines.create({
    data: {
      project_id: project.project_id,
      boq_version_id: boqVersion.boq_version_id,
      discipline_id: pwrDiscipline.discipline_id,
      included_flag: true,
      scope_description: null,
      risk_level: "Medium",
    },
  });

  const otherMasters = await prisma.discipline_master.findMany({
    where: { is_active: true, discipline_id: { not: pwrDiscipline.discipline_id } },
    select: { discipline_id: true },
  });
  if (otherMasters.length > 0) {
    await prisma.project_disciplines.createMany({
      data: otherMasters.map((m) => ({
        project_id: project.project_id,
        boq_version_id: boqVersion.boq_version_id,
        discipline_id: m.discipline_id,
        included_flag: false,
        risk_level: "Medium",
      })),
    });
  }

  const materialCat = await prisma.cost_category_master.findUniqueOrThrow({
    where: { category_code: "MATERIAL" },
  });
  const laborCat = await prisma.cost_category_master.findUniqueOrThrow({
    where: { category_code: "LABOR" },
  });

  const lineDefs = [
    {
      line_no: 1,
      item_id: "PWR-UPS-001",
      item_description: "UPS module 500kVA (modular, 2N config) — supply & install",
      unit: "set",
      quantity: 4,
      material: 8000000,
      labor: 600000,
      lineConfidence: "Low",
      materialConfidence: "Low",
      laborConfidence: "High",
    },
    {
      line_no: 2,
      item_id: "PWR-PDU-001",
      item_description: "Rack PDU intelligent, 32A 3-phase — supply & install",
      unit: "set",
      quantity: 200,
      material: 4500000,
      labor: 350000,
      lineConfidence: "High",
      materialConfidence: "High",
      laborConfidence: "High",
    },
    {
      line_no: 3,
      item_id: "PWR-SWG-001",
      item_description: "MV switchgear 24kV 3-panel — supply, install, commissioning",
      unit: "lot",
      quantity: 1,
      material: 12000000,
      labor: 1200000,
      lineConfidence: "High",
      materialConfidence: "High",
      laborConfidence: "High",
    },
  ];

  for (const def of lineDefs) {
    const line = await prisma.boq_lines.create({
      data: {
        boq_version_id: boqVersion.boq_version_id,
        project_discipline_id: projectDiscipline.project_discipline_id,
        item_id: def.item_id,
        line_no: def.line_no,
        item_description: def.item_description,
        unit: def.unit,
        quantity: new Prisma.Decimal(def.quantity),
        cost_source: "Vendor Quote",
        confidence_level: def.lineConfidence,
        is_critical_line: false,
      },
    });

    await prisma.boq_cost_breakdowns.createMany({
      data: [
        {
          boq_line_id: line.boq_line_id,
          cost_category_id: materialCat.cost_category_id,
          calculation_method: "manual",
          base_value: new Prisma.Decimal(def.material),
          rate: new Prisma.Decimal(1),
          quantity_factor: new Prisma.Decimal(1),
          calculated_value: new Prisma.Decimal(def.material),
          cost_source: "Vendor Quote",
          confidence_level: def.materialConfidence,
          manual_override_flag: false,
        },
        {
          boq_line_id: line.boq_line_id,
          cost_category_id: laborCat.cost_category_id,
          calculation_method: "manual",
          base_value: new Prisma.Decimal(def.labor),
          rate: new Prisma.Decimal(1),
          quantity_factor: new Prisma.Decimal(1),
          calculated_value: new Prisma.Decimal(def.labor),
          cost_source: "Vendor Quote",
          confidence_level: def.laborConfidence,
          manual_override_flag: false,
        },
      ],
    });
  }

  const subtotal = lineDefs.reduce((s, d) => s + d.material + d.labor, 0);
  const margin = 15;
  const sellingPrice = subtotal * (1 + margin / 100);
  const grossProfit = sellingPrice - subtotal;

  await prisma.boq_summary.create({
    data: {
      boq_version_id: boqVersion.boq_version_id,
      total_material_cost: new Prisma.Decimal(
        lineDefs.reduce((s, d) => s + d.material, 0),
      ),
      total_labor_cost: new Prisma.Decimal(
        lineDefs.reduce((s, d) => s + d.labor, 0),
      ),
      subtotal_before_margin: new Prisma.Decimal(subtotal),
      margin_percent: new Prisma.Decimal(margin),
      selling_price: new Prisma.Decimal(sellingPrice),
      gross_profit: new Prisma.Decimal(grossProfit),
      gross_margin_percent: new Prisma.Decimal((grossProfit / sellingPrice) * 100),
    },
  });

  return {
    projectId: project.project_id,
    boqVersionId: boqVersion.boq_version_id,
    projectDisciplineId: projectDiscipline.project_discipline_id,
    documentIds: requiredDocs.map((d) => d.document_id),
  };
}

async function main() {
  const args = parseArgs();
  const scenario = args.scenario ?? "SIM-001";

  if (scenario !== "SIM-001" && scenario !== "SIM-002") {
    throw new Error(
      `Only SIM-001 and SIM-002 are supported (got ${scenario})`,
    );
  }

  await ensureMasters();
  const result =
    scenario === "SIM-002" ? await seedSim002() : await seedSim001();
  console.log(JSON.stringify({ scenario, ...result }, null, 2));
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
