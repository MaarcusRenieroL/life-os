import { Browser, BrowserContext, chromium, Page } from "playwright";
import { Job, WorkModel } from "../types";

function randomDelay(minMs: number, maxMs: number) {
  return minMs + Math.random() * (maxMs - minMs);
}

export async function scrapeLinkedIn(): Promise<Job[]> {
  const browser: Browser = await chromium.launch({ headless: true });
  const context: BrowserContext = await browser.newContext({
    storageState: "linkedin-session.json",
  });
  const page: Page = await context.newPage();

  await page.goto(
    "https://www.linkedin.com/jobs/search?keywords=software%20engineer",
  );
  await page.waitForTimeout(randomDelay(2000, 4000));

  await loadCards(page);

  const scraped = await extractJobs(page);

  await browser.close();

  return scraped.map(toJob);
}

async function loadCards(page: Page, maxIterations = 20) {
  let previousCount = 0;

  for (let i = 0; i < maxIterations; i++) {
    const cards = await page.locator("li[data-occludable-job-id]").all();

    if (cards.length === 0) {
      break;
    }

    await cards[cards.length - 1].scrollIntoViewIfNeeded();
    await page.waitForTimeout(randomDelay(1500, 3000));

    const newCount = (await page.locator("li[data-occludable-job-id]").all())
      .length;

    if (newCount === previousCount) {
      break;
    }

    previousCount = newCount;
  }
}

async function extractJobs(page: Page) {
  const cards = await page.locator("li[data-occludable-job-id]").all();
  const jobs = [];

  for (const card of cards) {
    const titleLocator = card.locator(".job-card-list__title--link strong");
    const companyLocator = card.locator(".artdeco-entity-lockup__subtitle");
    const locationLocator = card.locator(
      ".artdeco-entity-lockup__caption li span",
    );

    if (
      (await titleLocator.count()) === 0 ||
      (await companyLocator.count()) === 0 ||
      (await locationLocator.count()) === 0
    ) {
      continue;
    }

    const jobId = await card.getAttribute("data-occludable-job-id");
    const title = await titleLocator.textContent();
    const company = await companyLocator.textContent();
    const locationRaw = await locationLocator.textContent();

    if (!jobId || !title || !company || !locationRaw) continue;

    jobs.push({
      jobId,
      title: title.trim(),
      company: company.trim(),
      locationRaw: locationRaw.trim(),
    });
  }

  return jobs;
}

function parseLocation(locationRaw: string): {
  location: string;
  workModel: WorkModel;
} {
  const match = locationRaw.match(/^(.*)\s\((Remote|Hybrid|On-site)\)$/);

  if (!match) {
    return {
      location: locationRaw,
      workModel: "ONSITE",
    };
  }

  const [, location, modelRaw] = match;

  const workModelMap: Record<string, WorkModel> = {
    Remote: "REMOTE",
    Hybrid: "HYBRID",
    "On-site": "ONSITE",
  };

  return { location, workModel: workModelMap[modelRaw] };
}

function toJob(scraped: {
  jobId: string;
  title: string;
  company: string;
  locationRaw: string;
}): Job {
  const { location, workModel } = parseLocation(scraped.locationRaw);
  const now = new Date();

  return {
    id: crypto.randomUUID(),
    userId: "test-user",
    company: scraped.company,
    jobTitle: scraped.title,
    location,
    country: "",
    workModel,
    salaryMin: 0,
    salaryMax: 0,
    currency: "",
    jobUrl: `https://www.linkedin.com/jobs/view/${scraped.jobId}/`,
    jobDescription: "",
    jobDescriptionHtml: "",
    source: "LINKEDIN",
    sourceUrl: `https://www.linkedin.com/jobs/view/${scraped.jobId}`,
    scrapeTimestamp: now,
    requiredSkills: [],
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
