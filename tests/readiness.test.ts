import { describe, it, expect } from "vitest";
import { deriveReadinessTier, READINESS_TIERS } from "@/lib/validations/readiness";

describe("readiness tier aggregation", () => {
  it("exposes exactly three tiers", () => {
    expect(READINESS_TIERS).toEqual(["Ready", "Warning", "Blocked"]);
  });

  it("Blocked when validation not run", () => {
    expect(
      deriveReadinessTier({ validation_run: false, unresolved_block_count: 0, open_warning_count: 0, can_approve: true }),
    ).toBe("Blocked");
  });

  it("Blocked when unresolved blocks exist", () => {
    expect(
      deriveReadinessTier({ validation_run: true, unresolved_block_count: 2, open_warning_count: 0, can_approve: false }),
    ).toBe("Blocked");
  });

  it("Blocked when approval gate closed", () => {
    expect(
      deriveReadinessTier({ validation_run: true, unresolved_block_count: 0, open_warning_count: 0, can_approve: false }),
    ).toBe("Blocked");
  });

  it("Warning when warnings remain but no blocks", () => {
    expect(
      deriveReadinessTier({ validation_run: true, unresolved_block_count: 0, open_warning_count: 3, can_approve: true }),
    ).toBe("Warning");
  });

  it("Ready when clean", () => {
    expect(
      deriveReadinessTier({ validation_run: true, unresolved_block_count: 0, open_warning_count: 0, can_approve: true }),
    ).toBe("Ready");
  });
});
