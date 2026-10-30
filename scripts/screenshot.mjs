// Captura telas do app com o Chrome instalado (verificação visual contra o Figma).
// Uso: node scripts/screenshot.mjs <saida-dir> <path>[,<path>...] [--login] [--full] [--width=1440]
import { mkdirSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright-core";

const [outDir, pathsArg, ...flags] = process.argv.slice(2);
const base = process.env.APP_URL ?? "http://localhost:3100";
const width = Number(flags.find((f) => f.startsWith("--width="))?.split("=")[1] ?? 1440);
const full = flags.includes("--full");
const doLogin = flags.includes("--login");

mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch({
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
});
const context = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: 1 });
const page = await context.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));

if (doLogin) {
  await page.goto(`${base}/login`);
  await page.fill("#email", process.env.SEED_ADMIN_EMAIL ?? "admin@dhmoveis.com.br");
  await page.fill("#password", process.env.SEED_ADMIN_PASSWORD ?? "dhmoveis123");
  await Promise.all([page.waitForURL((u) => !u.pathname.startsWith("/login")), page.click("button[type=submit]")]);
}

for (const p of pathsArg.split(",")) {
  await page.goto(`${base}${p}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(400);
  const file = path.join(outDir, `${p.replace(/[/?=&]+/g, "_").replace(/^_/, "") || "root"}.png`);
  await page.screenshot({ path: file, fullPage: full });
  console.log(file);
}
if (errors.length) console.log("ERROS:", errors.join("\n"));
await browser.close();
