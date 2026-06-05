import { PrismaClient } from "@prisma/client";
import { createAuditImmutabilityGuard } from "@/lib/db/audit-immutability";

const globalForPrisma = globalThis as unknown as { prisma: ReturnType<typeof createPrismaClient> };

function createPrismaClient() {
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  }).$extends(createAuditImmutabilityGuard());
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export type PrismaClientWithAuditGuard = typeof prisma;
