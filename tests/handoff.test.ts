import { describe, it, expect } from "vitest";
import {
  HANDOFF_TARGETS,
  createHandoffSchema,
  isHandoffTarget,
} from "@/lib/validations/handoff";

describe("handoff target schema", () => {
  it("defines handoff targets", () => {
    expect(HANDOFF_TARGETS).toEqual(["Procurement", "Construction", "ClientHandover"]);
  });

  it("accepts a valid handoff with target", () => {
    const parsed = createHandoffSchema.parse({
      handed_off_by: "engineer-1",
      handoff_target: "Procurement",
      notes: "ส่งต่อจัดซื้อ",
    });
    expect(parsed.handoff_target).toBe("Procurement");
  });

  it("accepts handoff without target (optional)", () => {
    const parsed = createHandoffSchema.parse({ handed_off_by: "engineer-1" });
    expect(parsed.handoff_target).toBeUndefined();
  });

  it("rejects empty actor and invalid target", () => {
    expect(() => createHandoffSchema.parse({ handed_off_by: "" })).toThrow();
    expect(() =>
      createHandoffSchema.parse({ handed_off_by: "x", handoff_target: "Unknown" }),
    ).toThrow();
  });

  it("isHandoffTarget guards values", () => {
    expect(isHandoffTarget("Construction")).toBe(true);
    expect(isHandoffTarget("Nope")).toBe(false);
  });
});
