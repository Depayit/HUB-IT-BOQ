import { PrismaClient } from "@prisma/client";
import { COST_CATEGORY_SEED } from "../src/lib/constants/cost-categories";

const prisma = new PrismaClient();

async function main() {
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
  console.log(`Seeded ${COST_CATEGORY_SEED.length} cost categories`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
