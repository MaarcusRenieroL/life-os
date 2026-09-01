# job-scraper

Node microservice that fetches job postings and hands normalised payloads to
`job-tracker` (`POST /v1/jobs/internal/jobs/ingest`).

## Endpoints (all require `X-Internal-Api-Key`)

| Method | Path       | Body                                   | Returns |
|--------|------------|----------------------------------------|---------|
| GET    | `/health`  | –                                      | `ok` |
| POST   | `/scrape`  | `{ sources: [{ name, url }] }`         | `{ jobs, notes }` — job-tracker persists |
| POST   | `/import`  | `{ userId, jobs: [raw…], source }`     | pushes straight to job-tracker |

## Adapters

- **generic** (default): fetches the source `url` and extracts schema.org
  `JobPosting` JSON-LD. Set `USE_PLAYWRIGHT=true` to render JS-heavy pages.
- **linkedin / wellfound / naukri**: gated. They return nothing plus a note —
  unauthenticated scraping violates their ToS. Wire a partner API or a
  user-authorised session cookie in `src/adapters/gated.js` to enable them.

## Env

`PORT` (8010) · `INTERNAL_API_KEY` · `JOB_TRACKER_BASE_URL` ·
`USE_PLAYWRIGHT` · optional cron: `SCRAPE_CRON`, `SCRAPE_USER_ID`, `SCRAPE_SOURCES`

## Test

    npm test
