/**
 * Sprint 4E + 4F screenshot evidence.
 *
 * Prerequisites:
 *   npm run dev
 *   node scripts/seed-sprint-4ef-evidence.mjs
 *
 * Usage:
 *   node scripts/capture-sprint-4ef-screenshots.mjs
 *   BASE_URL=http://localhost:3005 node scripts/capture-sprint-4ef-screenshots.mjs
 */
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, "..", "docs", "SPRINT_4EF", "screenshots");

const PROJECT_ID = process.env.PROJECT_ID ?? "349f965d-cc8e-4139-b96c-02f363d46e70";
const BOQ_VERSION_ID =
  process.env.BOQ_VERSION_ID ?? "045d0f67-29bc-4cec-84ee-b144f7bbf77c";

const BASE_CANDIDATES = [
  process.env.BASE_URL,
  "http://localhost:3000",
  "http://localhost:3004",
  "http://localhost:3005",
].filter(Boolean);

async function resolveBaseUrl() {
  for (const base of BASE_CANDIDATES) {
    try {
      const res = await fetch(`${base}/projects`, { signal: AbortSignal.timeout(3000) });
      if (res.ok) return base;
    } catch {
      /* try next */
    }
  }
  throw new Error("No dev server found — start npm run dev and set BASE_URL");
}

function hubPaths(base) {
  const root = `${base}/projects/${PROJECT_ID}/boq/${BOQ_VERSION_ID}`;
  return {
    validation: `${root}/validation`,
    summary: `${root}/summary`,
  };
}

async function screenshotRuleRow(page, ruleCode, fileName) {
  const row = page.locator("tr").filter({ hasText: ruleCode }).first();
  await row.scrollIntoViewIfNeeded();
  await row.screenshot({ path: path.join(OUT_DIR, fileName) });
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const base = await resolveBaseUrl();
  const urls = hubPaths(base);
  console.log("Using base URL:", base);

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

  try {
    await page.goto(urls.validation, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "รัน Validation" }).click();
    await page.waitForTimeout(2500);

    await screenshotRuleRow(page, "COST_LAYER_MISSING", "01-missing-cost-layer.png");
    await screenshotRuleRow(page, "COST_CATEGORY_DUPLICATE", "02-duplicate-category.png");
    await screenshotRuleRow(page, "COST_ZERO_VALUE", "03-zero-cost.png");
    await screenshotRuleRow(page, "COST_OVERRIDE_INVALID", "04-invalid-override.png");
    await screenshotRuleRow(page, "COST_LOW_CONFIDENCE", "05-low-confidence-warning.png");

    await page.screenshot({
      path: path.join(OUT_DIR, "01-validation-panel-full.png"),
      fullPage: true,
    });

    await page.goto(urls.summary, { waitUntil: "networkidle" });
    const refreshBtn = page.getByRole("button", { name: /คำนวณใหม่จาก Cost Layers/ });
    if (await refreshBtn.isVisible()) {
      await refreshBtn.click();
      await page.waitForTimeout(2000);
    }

    await page.screenshot({
      path: path.join(OUT_DIR, "06-cost-summary-panel.png"),
      fullPage: true,
    });

    const categorySection = page.locator("text=Cost Summary — Category Totals").locator("..");
    await categorySection.screenshot({
      path: path.join(OUT_DIR, "07-category-totals.png"),
    });

    const grandTotalRow = page.locator("tr").filter({ hasText: "Grand Total" }).first();
    await grandTotalRow.screenshot({
      path: path.join(OUT_DIR, "08-grand-total.png"),
    });

    console.log("Saved screenshots to", OUT_DIR);
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
