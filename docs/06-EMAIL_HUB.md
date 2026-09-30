# Email hub

Reads the Gmail inbox and turns the mail that needs action into records in the right module. Bank
alerts (→ finance transactions) and job-search mail (→ job tracker) already had their own pipelines;
the hub covers everything else.

```
Gmail ──► batches (EmailHubSyncService, every 30 min, last 3 days)
            │  Kafka: email-hub-events
            ▼
          core (EmailHubService)
            ├─ dedupe on Gmail message id (email_hub_items)
            ├─ classify: Ollama first, Claude only if email-hub.claude-fallback=true
            ├─ EmailActionPlanner decides: IGNORE / REVIEW / AUTO
            └─ RestEmailActionExecutor ──► tasks · calendar · finance (internal endpoints)
```

| Email is… | Becomes |
|---|---|
| Something to do, with a deadline | A task |
| A bill or statement with a due date | A high-priority "Pay …" task |
| An appointment, booking, meeting or trip | A calendar event |
| A subscription receipt or renewal | A subscription (skipped if one with that name exists) |
| Anything else | Recorded as skipped, nothing created |

## Trust rules

The model reads the email; the planner decides whether to believe it (`EmailActionPlanner`, pure and
unit-tested).

- Applied automatically only when the model is **HIGH** confidence **and** every needed detail is
  present and plausible (a date that parses, an amount, a billing cycle).
- Missing detail or MEDIUM confidence → waits for a yes on the Email page (`NEEDS_REVIEW`).
- LOW confidence, stale deadlines (>30 days past) and events that already happened are skipped.
- Every automatic action can be undone from the Email page, which deletes what it created.
  A subscription that already existed is never deleted by an undo.
- Only a 240-character snippet of each email is stored, never the body.

## Configuration (core)

| Variable | Default | |
|---|---|---|
| `EMAIL_HUB_AUTO_APPLY` | `true` | `false` makes every proposal wait for approval |
| `EMAIL_HUB_ZONE` | `Asia/Kolkata` | zone email times are read in |
| `EMAIL_HUB_CLAUDE_FALLBACK` | `false` | let Claude classify when the local model is down |
| `OLLAMA_ENABLED` / `OLLAMA_URL` / `OLLAMA_MODEL` | | inside Docker, `OLLAMA_URL` must be `http://host.docker.internal:11434` |

If no model is reachable an email is **not** recorded, so the next poll retries it.

## API

`/v1/core/email-hub` — `GET /items?status=…`, `GET /pending-count`, `POST /items/{id}/approve | dismiss | undo`.
`POST /v1/batches/gmail/hub/sync-recent` pulls the last three days on demand.
