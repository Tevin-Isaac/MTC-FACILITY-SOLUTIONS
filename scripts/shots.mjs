// Signs in and screenshots each screen at desktop width, for design review.
//
// Usage: MTC_EMAIL=... MTC_PASSWORD=... node scripts/shots.mjs [outDir]
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";

const outDir = process.argv[2] ?? "/tmp/shots";
const base = process.env.MTC_BASE_URL ?? "http://localhost:3000";
const email = process.env.MTC_EMAIL;
const password = process.env.MTC_PASSWORD;

if (!email || !password) {
  console.error("Need MTC_EMAIL and MTC_PASSWORD.");
  process.exit(1);
}

await mkdir(outDir, { recursive: true });

const browser = await chromium.launch({ channel: "chrome" });
const page = await browser.newPage({
  viewport: { width: 1440, height: 950 },
  deviceScaleFactor: 2,
  colorScheme: "light",
});

page.on("pageerror", (e) => console.error("  page error:", e.message));
page.on("console", (m) => {
  if (m.type() === "error") console.error("  console:", m.text().slice(0, 300));
});

await page.goto(`${base}/login`, { waitUntil: "networkidle" });
await page.fill('input[type="email"]', email);
await page.fill('input[type="password"]', password);
await page.click('button[type="submit"]');
await page.waitForURL(/\/dashboard/, { timeout: 60_000 });

async function shot(name, path, prepare) {
  await page.goto(`${base}${path}`, { waitUntil: "networkidle" });
  if (prepare) await prepare();
  // Let entrance animations settle so screenshots are stable.
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${outDir}/${name}.png`, fullPage: true });
  console.log(`${name}  <-  ${path}`);
}

await shot("01-dashboard", "/dashboard");
await shot("02-work-orders", "/work-orders");
await shot("03-work-orders-new", "/work-orders/new");
await shot("04-clients", "/clients");
await shot("05-vendors", "/vendors");

// First real work order in the list, for the detail screen and the drawer.
await page.goto(`${base}/work-orders`, { waitUntil: "networkidle" });
const hrefs = await page.locator('a[href^="/work-orders/"]').evaluateAll((els) =>
  els.map((el) => el.getAttribute("href"))
);
const href = hrefs.find((h) => h && h !== "/work-orders/new");

if (href) {
  await shot("06-work-order-detail", href);

  // Drawer, mid-open and settled, to check the slide and backdrop blur.
  const trigger = page.getByRole("button", { name: /assign vendor|change vendor/i }).first();
  if (await trigger.count()) {
    await trigger.click();
    await page.waitForTimeout(220);
    await page.screenshot({ path: `${outDir}/07-drawer-opening.png` });
    await page.waitForTimeout(900);
    await page.screenshot({ path: `${outDir}/08-drawer-open.png` });
    console.log("07/08-drawer");
  } else {
    console.log("no vendor drawer trigger on the detail screen");
  }
} else {
  console.log("no work order link found for detail shot");
}

await browser.close();
