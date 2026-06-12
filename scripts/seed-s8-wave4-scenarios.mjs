/**
 * Sprint 8 Wave 4 scenario seeds — NP-010, NP-011
 *
 * Usage:
 *   node scripts/seed-s8-wave4-scenarios.mjs --scenario=NP-010
 */
import { PrismaClient, Prisma } from "@prisma/client";

const DISCIPLINE_MASTER_SEED = [
  { discipline_code: "PWR", discipline_name: "Power", description: "Electrical power distribution" },
  { discipline_code: "CLG", discipline_name: "Cooling", description: "HVAC and thermal" },
  { discipline_code: "NET", discipline_name: "Network", description: "Structured cabling" },
  { discipline_code: "SEC", discipline_name: "Security", description: "Physical security" },
  { discipline_code: "FPS", discipline_name: "Fire Protection", description: "Fire detection" },
  { discipline_code: "BMS", discipline_name: "Monitoring / BMS", description: "DCIM / BMS" },
  { discipline_code: "CIV", discipline_name: "Civil / Structural", description: "Raised floor" },
];

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

const LINE_DEFS = [
  {
    line_no: 1,
    item_id: "PWR-UPS-001",
    item_description: "2N UPS system 1500kVA — supply & install",
    unit: "set",
    quantity: 2,
    material: 8500000,
    labor: 650000,
    is_critical_line: false,
  },
  {
    line_no: 2,
    item_id: "PWR-PDU-001",
    item_description: "Rack PDU intelligent, 32A 3-phase",
    unit: "set",
    quantity: 200,
    material: 4500000,
    labor: 350000,
    is_critical_line: false,
  },
  {
    line_no: 3,
    item_id: "PWR-SWG-001",
    item_description: "MV switchgear 24kV 3-panel",
    unit: "lot",
    quantity: 1,
    material: 12000000,
    labor: 1200000,
    is_critical_line: false,
  },
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
      create: { ...row, is_active: true },
      update: { discipline_name: row.discipline_name, description: row.description, is_active: true },
    });
  }
  for (const row of COST_CATEGORY_SEED) {
    await prisma.cost_category_master.upsert({
      where: { category_code: row.category_code },
      create: { ...row, is_active: true },
      update: { category_name: row.category_name, sort_order: row.sort_order, is_active: true },
    });
  }
}

async function createBoqLines(boqVersionId, projectDisciplineId) {
  const materialCat = await prisma.cost_category_master.findUniqueOrThrow({
    where: { category_code: "MATERIAL" },
  });
  const laborCat = await prisma.cost_category_master.findUniqueOrThrow({
    where: { category_code: "LABOR" },
  });

  for (const def of LINE_DEFS) {
    const line = await prisma.boq_lines.create({
      data: {
        boq_version_id: boqVersionId,
        project_discipline_id: projectDisciplineId,
        item_id: def.item_id,
        line_no: def.line_no,
        item_description: def.item_description,
        unit: def.unit,
        quantity: new Prisma.Decimal(def.quantity),
        cost_source: "Vendor Quote",
        confidence_level: "High",
        is_critical_line: def.is_critical_line,
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

  const subtotal = LINE_DEFS.reduce((s, d) => s + d.material + d.labor, 0);
  const margin = 15;
  const sellingPrice = subtotal * (1 + margin / 100);
  const grossProfit = sellingPrice - subtotal;
  await prisma.boq_summary.create({
    data: {
      boq_version_id: boqVersionId,
      total_material_cost: new Prisma.Decimal(LINE_DEFS.reduce((s, d) => s + d.material, 0)),
      total_labor_cost: new Prisma.Decimal(LINE_DEFS.reduce((s, d) => s + d.labor, 0)),
      subtotal_before_margin: new Prisma.Decimal(subtotal),
      margin_percent: new Prisma.Decimal(margin),
      selling_price: new Prisma.Decimal(sellingPrice),
      gross_profit: new Prisma.Decimal(grossProfit),
      gross_margin_percent: new Prisma.Decimal((grossProfit / sellingPrice) * 100),
    },
  });
}

async function createProjectBase(npId, title, scopeDescription) {
  const project = await prisma.projects.create({
    data: {
      project_name: title,
      client_id: `${npId}-CLIENT`,
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
      customer_requirement_reference: `RFP-${npId}`,
      approval_status: "Approved",
    },
  });

  const docTypes = [
    { type: "TOR", name: "Terms of Reference v1.0" },
    { type: "SLD", name: "Single Line Diagram v1.0" },
    { type: "Specification", name: "Technical Specification v1.0" },
  ];

  const docs = await Promise.all(
    docTypes.map((d) =>
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
      scope_description: scopeDescription,
      risk_level: "Medium",
    },
  });

  await createBoqLines(boqVersion.boq_version_id, projectDiscipline.project_discipline_id);

  return {
    scenario: npId,
    projectId: project.project_id,
    boqVersionId: boqVersion.boq_version_id,
    projectDisciplineId: projectDiscipline.project_discipline_id,
    documentIds: docs.map((d) => d.document_id),
  };
}

async function seedNp010() {
  return {
    ...(await createProjectBase(
      "NP-010",
      "NP-010 Retry Rejected Action Project",
      "Power distribution scope — retry idempotency drill.",
    )),
    seed_profile: "retry-rejected-action",
    primary_personas: ["Admin/Ops"],
  };
}

async function seedNp011() {
  return {
    ...(await createProjectBase(
      "NP-011",
      "NP-011 Evidence Mismatch Project",
      "Power distribution scope — governance integrity drill.",
    )),
    seed_profile: "evidence-mismatch-governance",
    primary_personas: ["Auditor"],
    secondary_personas: ["Manager"],
  };
}

const SEEDERS = {
  "NP-010": seedNp010,
  "NP-011": seedNp011,
};

async function main() {
  const args = parseArgs();
  const scenario = (args.scenario ?? "NP-010").replace(/^seed-/, "").toUpperCase();
  if (!SEEDERS[scenario]) {
    throw new Error(`Unsupported scenario ${scenario}. Use NP-010 or NP-011.`);
  }

  await ensureMasters();
  const result = await SEEDERS[scenario]();
  console.log(JSON.stringify(result, null, 2));
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
