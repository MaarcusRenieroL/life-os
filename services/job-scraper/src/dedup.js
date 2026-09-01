// Within-run de-duplication. Cross-run dedup is the job-tracker's job (it
// checks (user, source, externalId) and (user, url) before inserting).

export function dedupe(jobs) {
  const seen = new Set();
  const out = [];
  for (const job of jobs) {
    const key = (
      job.url ||
      `${job.source}:${job.externalId}` ||
      `${job.company}:${job.title}:${job.location}`
    )
      .toString()
      .trim()
      .toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(job);
  }
  return out;
}
