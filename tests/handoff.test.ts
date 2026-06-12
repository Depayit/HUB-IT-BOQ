import { describe, it, expect } from "vitest";

import { AppError } from "@/lib/utils/errors";
import {
  HANDOFF_TARGETS,
  HANDOFF_TARGET_REQUIRED_CODE,
  assertHandoffTargetProvided,
  handoffPayloadSchema,
  handoffTargetSchema,
  handoffTargetOptionalSchema,
  isHandoffTarget,
  type HandoffTarget,
} from "@/lib/validations/handoff";

describe("handoff target schema (TD-7A-010 SSOT)", () => {
  it("declares the canonical 3 targets in fixed order", () => {
    expect(HANDOFF_TARGETS).toEqual(["Procurement", "Construction", "ClientHandover"]);
  });

  it("accepts each canonical target via Zod", () => {
    for (const target of HANDOFF_TARGETS) {
      expect(handoffTargetSchema.safeParse(target).success).toBe(true);
    }
  });

  it("rejects unknown targets", () => {
    for (const value of ["procurement", "Other", "Sales", "", null, 42]) {
      expect(handoffTargetSchema.safeParse(value).success).toBe(false);
    }
  });

  it("optional schema permits null and undefined (back-compat)", () => {
    expect(handoffTargetOptionalSchema.safeParse(null).success).toBe(true);
    expect(handoffTargetOptionalSchema.safeParse(undefined).success).toBe(true);
    expect(handoffTargetOptionalSchema.safeParse("Procurement").success).toBe(true);
    expect(handoffTargetOptionalSchema.safeParse("invalid").success).toBe(false);
  });

  it("isHandoffTarget type guard recognizes only canonical strings", () => {
    expect(isHandoffTarget("Procurement")).toBe(true);
    expect(isHandoffTarget("Construction")).toBe(true);
    expect(isHandoffTarget("ClientHandover")).toBe(true);
    expect(isHandoffTarget("procurement")).toBe(false);
    expect(isHandoffTarget(null)).toBe(false);
    expect(isHandoffTarget(undefined)).toBe(false);
    expect(isHandoffTarget(123)).toBe(false);
  });

  it("handoffPayloadSchema enforces uuid + actor + optional target", () => {
    const valid = handoffPayloadSchema.safeParse({
      boq_version_id: "11111111-1111-1111-1111-111111111111",
      handed_off_by: "director-001",
      notes: "Hand off to procurement team",
      handoff_target: "Procurement",
    });
    expect(valid.success).toBe(true);

    const validNoTarget = handoffPayloadSchema.safeParse({
      boq_version_id: "11111111-1111-1111-1111-111111111111",
      handed_off_by: "director-001",
    });
    expect(validNoTarget.success).toBe(true);

    const badUuid = handoffPayloadSchema.safeParse({
      boq_version_id: "not-a-uuid",
      handed_off_by: "director-001",
    });
    expect(badUuid.success).toBe(false);

    const badTarget = handoffPayloadSchema.safeParse({
      boq_version_id: "11111111-1111-1111-1111-111111111111",
      handed_off_by: "director-001",
      handoff_target: "invalid",
    });
    expect(badTarget.success).toBe(false);
  });

  it("matches the Prisma enum 1:1 (exhaustive switch)", () => {
    function describeTarget(target: HandoffTarget): string {
      switch (target) {
        case "Procurement":
          return "buy";
        case "Construction":
          return "build";
        case "ClientHandover":
          return "deliver";
      }
    }
    expect(describeTarget("Procurement")).toBe("buy");
    expect(describeTarget("Construction")).toBe("build");
    expect(describeTarget("ClientHandover")).toBe("deliver");
  });
});

describe("assertHandoffTargetProvided (M-06 / SIM-007 handoff guard)", () => {
  it("throws AppError(HANDOFF_TARGET_REQUIRED, 403) for null, undefined, and invalid values", () => {
    for (const value of [null, undefined, "", "invalid", "procurement"] as const) {
      expect(() =>
        assertHandoffTargetProvided(
          value as "Procurement" | "Construction" | "ClientHandover" | null | undefined,
        ),
      ).toThrow(AppError);
      try {
        assertHandoffTargetProvided(
          value as "Procurement" | "Construction" | "ClientHandover" | null | undefined,
        );
      } catch (err) {
        expect(err).toBeInstanceOf(AppError);
        const appErr = err as AppError;
        expect(appErr.code).toBe(HANDOFF_TARGET_REQUIRED_CODE);
        expect(appErr.status).toBe(403);
        expect(appErr.message).toContain("handoff_target");
      }
    }
  });

  it("accepts each canonical handoff target", () => {
    for (const target of HANDOFF_TARGETS) {
      expect(() => assertHandoffTargetProvided(target)).not.toThrow();
    }
  });
});
