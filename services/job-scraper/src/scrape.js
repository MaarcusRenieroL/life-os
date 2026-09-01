import { runSource } from './adapters/index.js';
import { dedupe } from './dedup.js';
import { normalize } from './normalize.js';

// Runs every source, normalises + dedupes the postings, and returns both the
// jobs and a per-source report (so gated sources surface their "needs an API
// key" note instead of silently returning nothing).
export async function scrapeSources(sources) {
  const notes = [];
  const collected = [];

  for (const source of sources || []) {
    const result = await runSource(source);
    if (result.note) notes.push({ source: result.source, note: result.note });
    for (const raw of result.jobs) {
      const job = normalize(raw, result.source);
      if (job) collected.push(job);
    }
  }

  return { jobs: dedupe(collected), notes };
}
