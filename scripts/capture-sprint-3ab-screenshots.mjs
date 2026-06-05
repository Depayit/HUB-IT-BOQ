/**
 * Sprint 3A+3B discipline UI evidence.
 * Prerequisites: dev server (npm run dev), DATABASE_URL, discipline seed (npm run db:seed).
 *
 * Usage:
 *   node scripts/capture-sprint-3ab-screenshots.mjs
 *   DISCIPLINE_PAGE_URL=http://localhost:3000/projects/.../boq/.../disciplines node scripts/...
 */
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, "..", "docs", "SPRINT_3AB", "screenshots");
const BASE = process.env.BASE_URL ?? "http://localhost:3000";

async function resolveDisciplinesUrl(page) {
  if (process.env.DISCIPLINE_PAGE_URL) return process.env.DISCIPLINE_PAGE_URL;

  await page.goto(`${BASE}/projects`, { waitUntil: "networkidle" });
  const projectLink = page.locator('a[href^="/projects/"]').filter({ hasNotText: "new" }).first();
  await projectLink.click();
  await page.waitForLoadState("networkidle");

  const boqLink = page.locator('a[href*="/boq/"]').first();
  if ((await boqLink.count()) === 0) {
    throw new Error("No BOQ version link found — create a project with BOQ first");
  }
  await boqLink.click();
  await page.waitForLoadState("networkidle");

  await page.getByRole("link", { name: "Disciplines" }).click();
  await page.waitForLoadState("networkidle");
  return page.url();
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

  try {
    const url = await resolveDisciplinesUrl(page);
    console.log("Disciplines URL:", url);

    await page.screenshot({ path: path.join(OUT_DIR, "01-discipline-list.png"), fullPage: true });

    const pwrToggle = page.locator('[data-discipline-code="PWR"] button[role="switch"]');
    await pwrToggle.click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(OUT_DIR, "02-include-discipline.png"), fullPage: true });

    await pwrToggle.click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(OUT_DIR, "03-exclude-discipline.png"), fullPage: true });

    const scope = page.locator('[data-testid="scope-PWR"]');
    await scope.fill("Scope: UPS, PDU, and grounding for Tier III target.");
    await scope.blur();
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(OUT_DIR, "04-scope-description.png"), fullPage: true });

    const exclusion = page.locator('[data-testid="exclusion-PWR"]');
    await exclusion.fill("Excluded: Generator procurement by client.");
    await exclusion.blur();
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(OUT_DIR, "05-exclusion-note.png"), fullPage: true });

    const risk = page.locator('[data-testid="risk-PWR"]');
    await risk.selectOption("Critical");
    await page.waitForTimeout(800);
    await risk.click();
    await page.screenshot({ path: path.join(OUT_DIR, "06-risk-level-dropdown.png"), fullPage: true });

    console.log("Saved 6 screenshots to", OUT_DIR);
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
