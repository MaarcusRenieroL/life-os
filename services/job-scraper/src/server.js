import express from 'express';
import cron from 'node-cron';

import { normalize } from './normalize.js';
import { dedupe } from './dedup.js';
import { scrapeSources } from './scrape.js';
import { pushToJobTracker } from './ingest.js';

const app = express();
app.use(express.json({ limit: '4mb' }));

const PORT = process.env.PORT || 8010;
const INTERNAL_KEY = process.env.INTERNAL_API_KEY || '';

// Every mutating route is service-to-service only.
function requireInternalKey(req, res, next) {
  if (!INTERNAL_KEY || req.get('x-internal-api-key') === INTERNAL_KEY) return next();
  return res.status(401).json({ error: 'bad or missing x-internal-api-key' });
}

app.get('/health', (_req, res) => res.status(200).send('ok'));

// Called by job-tracker: { userId, sources: [{ name, url }] }
// Returns { jobs, notes } - job-tracker does the persisting + dedup + scoring.
app.post('/scrape', requireInternalKey, async (req, res) => {
  const { sources } = req.body || {};
  try {
    const { jobs, notes } = await scrapeSources(sources);
    res.json({ jobs, notes });
  } catch (error) {
    res.status(502).json({ error: error.message });
  }
});

// Direct: normalise + dedupe a raw array and push straight to job-tracker.
// { userId, jobs: [ raw... ], source }
app.post('/import', requireInternalKey, async (req, res) => {
  const { userId, jobs = [], source = 'import' } = req.body || {};
  if (!userId) return res.status(400).json({ error: 'userId required' });
  const normalised = dedupe(jobs.map((raw) => normalize(raw, source)).filter(Boolean));
  try {
    const result = await pushToJobTracker(userId, normalised);
    res.json({ normalised: normalised.length, ...result });
  } catch (error) {
    res.status(502).json({ error: error.message });
  }
});

app.listen(PORT, () => console.log(`job-scraper listening on ${PORT}`));

// Optional daily run for a statically configured user + sources, so the
// service is useful even before job-tracker drives it. Disabled unless
// SCRAPE_CRON and SCRAPE_USER_ID are set.
if (process.env.SCRAPE_CRON && process.env.SCRAPE_USER_ID) {
  let sources = [];
  try {
    sources = JSON.parse(process.env.SCRAPE_SOURCES || '[]');
  } catch {
    console.warn('SCRAPE_SOURCES is not valid JSON; ignoring');
  }
  cron.schedule(process.env.SCRAPE_CRON, async () => {
    try {
      const { jobs } = await scrapeSources(sources);
      const result = await pushToJobTracker(process.env.SCRAPE_USER_ID, jobs);
      console.log('scheduled scrape:', result);
    } catch (error) {
      console.error('scheduled scrape failed:', error.message);
    }
  });
  console.log(`scheduled scrape enabled: ${process.env.SCRAPE_CRON}`);
}

export { app };
