import { PrismaClient } from "@prisma/client";

const DEMO = "Sprint 3CD Demo (QA)";
const prisma = new PrismaClient();

async function main() {
  let project = await prisma.projects.findFirst({ where: { project_name: DEMO } });
  if (!project) {
    project = await prisma.projects.create({
      data: {
        project_name: DEMO,
        it_load_kw: 500,
        rack_count: 20,
        rack_density_kw_per_rack: 25,
        currency: "THB",
        project_status: "Active",
      },
    });
  }
  let boq = await prisma.boq_versions.findFirst({
    where: { project_id: project.project_id, version_no: 1 },
  });
  if (!boq) {
    boq = await prisma.boq_versions.create({
      data: { project_id: project.project_id, version_no: 1, status: "Draft", lock_status: "Unlocked" },
    });
  }
  console.log(
    `\n/projects/${project.project_id}/boq/${boq.boq_version_id}/disciplines\n`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
