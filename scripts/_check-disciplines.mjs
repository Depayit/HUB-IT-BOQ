import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const boqVersionId = process.argv[2] ?? "045d0f67-29bc-4cec-84ee-b144f7bbf77c";
const rows = await prisma.project_disciplines.findMany({
  where: { boq_version_id: boqVersionId },
  include: { discipline: true },
});
console.log("count", rows.length, rows.map((r) => r.discipline.discipline_code));
await prisma.$disconnect();
