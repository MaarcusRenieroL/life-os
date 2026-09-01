import { scrapeGeneric } from './generic.js';
import { linkedin, naukri, wellfound } from './gated.js';

// Pick an adapter by the source name; anything unrecognised gets the generic
// JSON-LD adapter (which needs a `url`).
const ADAPTERS = {
  linkedin: (s) => linkedin(s),
  wellfound: (s) => wellfound(s),
  angellist: (s) => wellfound(s),
  naukri: (s) => naukri(s),
};

export async function runSource(source) {
  const key = (source.name || '').toLowerCase();
  const adapter = ADAPTERS[key];
  try {
    if (adapter) {
      const result = await adapter(source);
      return { jobs: result.jobs || [], note: result.note || null, source: source.name };
    }
    const jobs = await scrapeGeneric(source);
    return { jobs, note: jobs.length ? null : 'no JobPosting JSON-LD found at url', source: source.name };
  } catch (error) {
    return { jobs: [], note: `error: ${error.message}`, source: source.name };
  }
}
