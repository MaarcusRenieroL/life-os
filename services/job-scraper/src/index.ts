import express from "express";
import { connectProducer, publishJobScraped } from "./kafka/producer";
import { scrapeLinkedIn } from "./scrapers/linkedin";
import { scrapeNaukri } from "./scrapers/naukri";
import { Job, JobSource } from "./types";

const PORT = 8007;

const app = express();

let isScrapingLinkedIn = false;
let isScrapingNaukri = false;

function buildFakeJob(source: JobSource): Job {
  const now = new Date();
  return {
    id: crypto.randomUUID(),
    userId: "test-user",
    company: "Acme Corp",
    jobTitle: "Software Engineer",
    location: "Remote",
    country: "US",
    workModel: "REMOTE",
    salaryMin: 100000,
    salaryMax: 150000,
    currency: "USD",
    jobUrl: `https://example.com/${source.toLowerCase()}/${crypto.randomUUID()}`,
    jobDescription: "Test job description",
    jobDescriptionHtml: "<p>Test job description</p>",
    source,
    sourceUrl: `https://example.com/${source.toLowerCase()}`,
    scrapeTimestamp: now,
    requiredSkills: ["TypeScript"],
    niceToHaveSkills: [],
    experienceYears: 3,
    seniority: "MID",
    applicationDeadline: now,
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

app.get("/", (request, response) => {
  response.send("hello from express");
});

app.post("/scrape/linkedin", async (request, response) => {
  if (isScrapingLinkedIn) {
    response.status(429).send("a linkedin scrape is already in progress");
    return;
  }

  isScrapingLinkedIn = true;
  response.status(202).send();

  try {
    const jobs = await scrapeLinkedIn();
    for (const job of jobs) {
      await publishJobScraped(job);
    }
    console.log(`Published ${jobs.length} jobs from LinkedIn`);
  } catch (error) {
    console.error("LinkedIn scrape failed:", error);
  } finally {
    isScrapingLinkedIn = false;
  }
});

app.post("/scrape/naukri", async (request, response) => {
  if (isScrapingNaukri) {
    response.status(429).send("a naukri scrape is already in progress");
    return;
  }

  isScrapingNaukri = true;
  response.status(202).send();

  try {
    const jobs = await scrapeNaukri();
    for (const job of jobs) {
      await publishJobScraped(job);
    }
    console.log(`Published ${jobs.length} jobs from Naukri`);
  } catch (error) {
    console.error("Naukri scrape failed:", error);
  } finally {
    isScrapingNaukri = false;
  }
});

app.post("/scrape/wellfound", async (request, response) => {
  try {
    await publishJobScraped(buildFakeJob("WELLFOUND"));
    response.status(202).send();
  } catch (error) {
    console.error(error);
    response.status(500).send();
  }
});

app.post("/scrape/contacts/linkedin", (request, response) => {
  response.status(501).send("not implemented yet");
});

async function main() {
  await connectProducer();

  app.listen(PORT, () => {
    console.log("running at port: " + PORT);
  });
}

main();
