// Posts normalised jobs back to the job-tracker service.

const BASE = process.env.JOB_TRACKER_BASE_URL || 'http://job-tracker:8003';
const KEY = process.env.INTERNAL_API_KEY || '';

export async function pushToJobTracker(userId, jobs) {
  if (!jobs.length) return { created: 0, duplicates: 0, skipped: 0 };
  const response = await fetch(`${BASE}/v1/jobs/internal/jobs/ingest`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-internal-api-key': KEY,
    },
    body: JSON.stringify({ userId, jobs }),
  });
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`job-tracker ingest -> ${response.status} ${text}`);
  }
  const body = await response.json();
  return body.data ?? body;
}
