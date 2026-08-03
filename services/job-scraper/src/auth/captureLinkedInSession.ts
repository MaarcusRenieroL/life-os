import { Browser, BrowserContext, chromium, Page } from "playwright";

async function main() {
  const browser: Browser = await chromium.launch({ headless: false });
  const context: BrowserContext = await browser.newContext();

  const page: Page = await context.newPage();

  await page.goto("https://linkedin.com/login");

  console.log("Log into LinkedIn in the opened browser window.");
  console.log("Once you're fully logged in, come back here and press Enter.");

  await new Promise<void>((resolve) => {
    process.stdin.once("data", () => resolve());
  });

  await context.storageState({ path: "linkedin-session.json" });

  console.log("Session saved to linkedin-session.json");

  await browser.close();
}

main();
