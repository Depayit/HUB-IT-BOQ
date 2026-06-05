import { Prisma } from "@prisma/client";

/** rack_density = it_load_kw / rack_count (server-side only) */
export function calcRackDensityKwPerRack(
  itLoadKw: number | Prisma.Decimal,
  rackCount: number,
): Prisma.Decimal | null {
  const load =
    itLoadKw instanceof Prisma.Decimal ? itLoadKw.toNumber() : itLoadKw;
  if (rackCount <= 0 || !Number.isFinite(load)) return null;
  return new Prisma.Decimal(load / rackCount);
}

export function decimalToNumber(value: Prisma.Decimal | null | undefined): number | null {
  if (value == null) return null;
  return value.toNumber();
}
