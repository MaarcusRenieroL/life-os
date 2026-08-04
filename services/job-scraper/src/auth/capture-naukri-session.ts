import { Browser, BrowserContext, chromium, Page } from "playwright";

async function main() {
  const browser: Browser = await chromium.launch({ headless: false });
  const context: BrowserContext = await browser.newContext();
  const page: Page = await context.newPage();

  await page.goto("https://www.naukri.com/nlogin/login");

  console.log("Log into Naukri in the opened browser window.");
  console.log("Once logged in, come back here and press Enter.");

  await new Promise<void>((resolve) => {
    process.stdin.once("data", () => resolve());
  });

  await context.storageState({ path: "naukri-session.json" });

  console.log("Session saved to naukri-session.json");

  await browser.close();
}

main();
