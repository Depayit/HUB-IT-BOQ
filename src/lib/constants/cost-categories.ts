/** Maps cost_category_master.category_code → boq_summary total field */
export const COST_CATEGORY_TO_SUMMARY_FIELD = {
  MATERIAL: "total_material_cost",
  LABOR: "total_labor_cost",
  LOGISTICS: "total_logistics_cost",
  TESTING: "total_testing_cost",
  DOCUMENTATION: "total_documentation_cost",
  INDIRECT: "total_indirect_cost",
  RISK: "total_risk_cost",
  OVERHEAD: "total_overhead_cost",
} as const;

export type SummaryCostField =
  (typeof COST_CATEGORY_TO_SUMMARY_FIELD)[keyof typeof COST_CATEGORY_TO_SUMMARY_FIELD];

export const DEFAULT_MARGIN_PERCENT = 15;

export const COST_CATEGORY_SEED = [
  { category_code: "MATERIAL", category_name: "Material", sort_order: 1 },
  { category_code: "LABOR", category_name: "Labor", sort_order: 2 },
  { category_code: "LOGISTICS", category_name: "Logistics", sort_order: 3 },
  { category_code: "TESTING", category_name: "Testing", sort_order: 4 },
  { category_code: "DOCUMENTATION", category_name: "Documentation", sort_order: 5 },
  { category_code: "INDIRECT", category_name: "Indirect", sort_order: 6 },
  { category_code: "RISK", category_name: "Risk", sort_order: 7 },
  { category_code: "OVERHEAD", category_name: "Overhead", sort_order: 8 },
] as const;
