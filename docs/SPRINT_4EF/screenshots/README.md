# Sprint 4E + 4F — Screenshot Evidence

Capture after `npm run dev` with a seeded BOQ version containing varied cost layers.

## Validation (`/projects/{projectId}/boq/{boqVersionId}/validation`)

1. **01-missing-cost-layer.png** — BOQ line with zero breakdowns; run Validation; show `COST_LAYER_MISSING` BLOCK row.
2. **02-duplicate-category.png** — Same category twice on one line; show `COST_CATEGORY_DUPLICATE`.
3. **03-zero-cost.png** — Breakdown with `calculated_value` 0; show `COST_ZERO_VALUE`.
4. **04-invalid-override.png** — `manual_override_flag` true, empty reason; show `COST_OVERRIDE_INVALID`.
5. **05-low-confidence-warning.png** — `confidence_level` = Low; show `COST_LOW_CONFIDENCE` with WARNING badge (amber row).

## Summary (`/projects/{projectId}/boq/{boqVersionId}/summary`)

6. **06-cost-summary-panel.png** — Full "Cost Summary Panel" page.
7. **07-category-totals.png** — "Cost Summary — Category Totals" table with Material…Overhead rows.
8. **08-grand-total.png** — Footer showing Subtotal, Total Cost, and Grand Total (emerald row).

Save all files in this folder for QA sign-off.
