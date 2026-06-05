import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, "..", "docs", "SPRINT_3CD", "screenshots");
const BASE = process.env.BASE_URL ?? "http://localhost:3000";

async function resolveDisciplinesUrl(page) {
  if (process.env.DISCIPLINE_PAGE_URL) return process.env.DISCIPLINE_PAGE_URL;
  await page.goto(`${BASE}/projects`, { waitUntil: "networkidle" });
  await page.locator('a[href^="/projects/"]').filter({ hasNotText: "new" }).first().click();
  await page.waitForLoadState("networkidle");
  const boqLink = page.locator('a[href*="/boq/"]').first();
  if ((await boqLink.count()) === 0) throw new Error("No BOQ link — run seed-sprint-3cd-demo.mjs");
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
    const pwr = page.locator('[data-discipline-code="PWR"] button[role="switch"]');
    const scope = page.locator('[data-testid="scope-PWR"]');
    const exclusion = page.locator('[data-testid="exclusion-PWR"]');
    const risk = page.locator('[data-testid="risk-PWR"]');

    await pwr.click();
    await scope.fill("Scope: UPS, PDU, grounding.");
    await scope.blur();
    await page.waitForTimeout(700);
    await page.screenshot({ path: path.join(OUT_DIR, "01-included-discipline.png"), fullPage: true });

    await exclusion.fill("Excluded: Generator by client.");
    await exclusion.blur();
    await pwr.click();
    await page.waitForTimeout(700);
    await page.screenshot({ path: path.join(OUT_DIR, "02-excluded-discipline.png"), fullPage: true });

    await exclusion.fill("");
    await exclusion.blur();
    await pwr.click();
    await page.waitForTimeout(700);
    await page.screenshot({ path: path.join(OUT_DIR, "03-included-without-boq-line.png"), fullPage: true });

    await scope.fill("");
    await scope.blur();
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(OUT_DIR, "06-missing-scope-description.png"), fullPage: true });

    await risk.selectOption("Critical");
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(OUT_DIR, "07-critical-discipline-warning.png"), fullPage: true });

    await page.goto(url.replace(/\/disciplines\/?$/, "/validation"), { waitUntil: "networkidle" });
    const runBtn = page.getByRole("button", { name: /รัน Validation/i });
    if (await runBtn.isVisible()) await runBtn.click();
    await page.waitForTimeout(1200);
    await page.screenshot({ path: path.join(OUT_DIR, "05-duplicate-discipline.png"), fullPage: true });

    await page.goto(url.replace(/\/disciplines\/?$/, "/approval"), { waitUntil: "networkidle" });
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(OUT_DIR, "04-approval-blocked.png"), fullPage: true });

    console.log("Saved to", OUT_DIR);
  } finally {
    await browser.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
