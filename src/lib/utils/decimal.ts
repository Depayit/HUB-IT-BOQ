import { Prisma } from "@prisma/client";

export function decimalToNumber(
  value: Prisma.Decimal | number | null | undefined,
): number | null {
  if (value == null) return null;
  if (value instanceof Prisma.Decimal) return value.toNumber();
  return value;
}

export function sumDecimals(values: Prisma.Decimal[]): Prisma.Decimal {
  return values.reduce(
    (acc, v) => acc.add(v),
    new Prisma.Decimal(0),
  );
}
