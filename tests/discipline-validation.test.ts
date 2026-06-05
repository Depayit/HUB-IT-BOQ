import { describe, it, expect } from "vitest";
import {
  RISK_LEVELS,
  saveProjectDisciplineSchema,
  updateProjectDisciplineSchema,
} from "@/lib/validations/discipline";

describe("discipline validation", () => {
  it("requires discipline_id on save", () => {
    const result = saveProjectDisciplineSchema.safeParse({
      project_id: "00000000-0000-4000-8000-000000000001",
      boq_version_id: "00000000-0000-4000-8000-000000000002",
      included_flag: true,
      risk_level: "Low",
    });
    expect(result.success).toBe(false);
  });

  it("accepts valid risk levels", () => {
    for (const risk_level of RISK_LEVELS) {
      const result = updateProjectDisciplineSchema.safeParse({
        project_discipline_id: "00000000-0000-4000-8000-000000000003",
        included_flag: true,
        risk_level,
      });
      expect(result.success).toBe(true);
    }
  });

  it("rejects invalid risk level", () => {
    const result = updateProjectDisciplineSchema.safeParse({
      project_discipline_id: "00000000-0000-4000-8000-000000000003",
      included_flag: true,
      risk_level: "Extreme",
    });
    expect(result.success).toBe(false);
  });
});
