import { Browser, BrowserContext, chromium, Page } from "playwright";
import { Job, WorkModel } from "../types";

function randomDelay(minMs: number, maxMs: number) {
  return minMs + Math.random() * (maxMs - minMs);
}

export async function scrapeNaukri(): Promise<Job[]> {
  const browser: Browser = await chromium.launch({ headless: false });
  const context: BrowserContext = await browser.newContext({
    storageState: "naukri-session.json",
  });
  const page: Page = await context.newPage();

  await page.goto(
    "https://www.naukri.com/full-stack-developer-jobs?k=full%20stack%20developer",
  );
  await page.waitForTimeout(randomDelay(2000, 4000));

  await page.mouse.wheel(0, 3000);
  await page.waitForTimeout(randomDelay(1000, 2000));

  const scraped = await extractJobs(page);

  await browser.close();

  return scraped.map(toJob);
}

async function extractJobs(page: Page) {
  const cards = await page
    .locator("div.srp-jobtuple-wrapper[data-job-id]")
    .all();
  const jobs = [];

  for (const card of cards) {
    const titleLocator = card.locator(".title");
    const companyLocator = card.locator(".comp-name");
    const locationLocator = card.locator(".loc-wrap .locWdth");

    if (
      (await titleLocator.count()) === 0 ||
      (await companyLocator.count()) === 0 ||
      (await locationLocator.count()) === 0
    ) {
      continue;
    }

    const jobId = await card.getAttribute("data-job-id");
    const title = await titleLocator.textContent();
    const jobUrl = await titleLocator.getAttribute("href");
    const company = await companyLocator.textContent();
    const locationRaw = await locationLocator.textContent();
    const skills = await card.locator(".tags-gt li").allTextContents();

    if (!jobId || !title || !jobUrl || !company || !locationRaw) continue;

    jobs.push({
      jobId,
      title: title.trim(),
      jobUrl,
      company: company.trim(),
      locationRaw: locationRaw.trim(),
      skills: skills.map((s) => s.trim()).filter(Boolean),
    });
  }

  return jobs;
}

function inferWorkModel(locationRaw: string): WorkModel {
  return /remote|work from home/i.test(locationRaw) ? "REMOTE" : "ONSITE";
}

function toJob(scraped: {
  jobId: string;
  title: string;
  jobUrl: string;
  company: string;
  locationRaw: string;
  skills: string[];
}): Job {
  const now = new Date();

  return {
    id: crypto.randomUUID(),
    userId: "test-user",
    company: scraped.company,
    jobTitle: scraped.title,
    location: scraped.locationRaw,
    country: "",
    workModel: inferWorkModel(scraped.locationRaw),
    salaryMin: 0,
    salaryMax: 0,
    currency: "",
    jobUrl: scraped.jobUrl,
    jobDescription: "",
    jobDescriptionHtml: "",
    source: "NAUKRI",
    sourceUrl: scraped.jobUrl,
    scrapeTimestamp: now,
    requiredSkills: scraped.skills,
    niceToHaveSkills: [],
    experienceYears: 0,
    seniority: "MID",
    applicationDeadline: new Date(),
    status: "DISCOVERED",
    tags: [],
    notes: "",
    savedAt: now,
    discoveredAt: now,
    createdAt: now,
    updatedAt: now,
    deDuplicatedWithJobId: "",
  };
}
