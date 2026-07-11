# Architecture Document

**Last Updated:** 2026-07-10  
**Status:** Ready for implementation

---

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Client Tier (User Facing)                 │
├─────────────────┬──────────────────┬───────────────────────┤
│  Mobile App     │   Web App         │   Desktop App         │
│ (React Native)  │  (Next.js)        │  (Tauri + React)      │
└────────┬────────┴────────┬─────────┴────────────┬───────────┘
         │                 │                      │
         └─────────────────┼──────────────────────┘
                           │
              ┌────────────▼────────────┐
              │  API Gateway / LB       │
              │  (Nginx Reverse Proxy)  │
              └────────────┬────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
┌───────▼────────┐ ┌──────▼────────┐ ┌──────▼─────────┐
│  Auth Service  │ │ Vault Service │ │ Job Tracker    │
│  :8001         │ │  :8002        │ │ Service :8003  │
└───────┬────────┘ └──────┬────────┘ └──────┬─────────┘
        │                 │                 │
        └─────────────────┼────────┬────────┘
                          │        │
                ┌─────────▼──┐  ┌──▼───────────┐
                │  Core      │  │ Message Bus  │
                │ Service    │  │ (Kafka)      │
                │ :8004      │  │              │
                └─────────────┘  └──────────────┘
        │
        └────────────────────────┬────────────────────┐
                                 │                    │
                      ┌──────────▼──────────┐  ┌──────▼────────┐
                      │   PostgreSQL        │  │  Redis        │
                      │   (1 DB, 4 schemas) │  │  (Cache)      │
                      └─────────────────────┘  └───────────────┘
```

---

## Service Boundaries

### 1. Auth Service (Port 8001)

**Responsibility:** User identity and session management

**Owns:**
- User accounts (email, password hash)
- Refresh tokens (rotation, revocation)
- Device sessions (per-device tracking, revocation)
- Biometric enrollments (public keys for challenge-response)

**Exposes:**
- `/v1/auth/register` — Email/password signup
- `/v1/auth/login` — Email/password login → JWT + refresh token
- `/v1/auth/refresh` — Exchange refresh token for new JWT
- `/v1/auth/logout` — Revoke token + session
- `/v1/auth/enroll-biometric` — Register fingerprint/Face ID
- `/v1/auth/login-biometric` — Login with biometric
- `/v1/auth/sessions` — List active devices
- `/v1/auth/sessions/{id}/revoke` — Kill a device session

**Data Store:**
- Schema: `auth_schema` in PostgreSQL
- Tables: users, refresh_tokens, device_sessions, biometric_enrollments

**Dependencies:** None (foundation)

**Key Tech:**
- Spring Security for middleware
- Bcrypt for password hashing
- JWT (HS256, rotate on refresh)
- No external APIs

---

### 2. Vault Service (Port 8002)

**Responsibility:** Encrypted password/secret storage

**Owns:**
- Vault entries (passwords, secrets, credentials)
- Encryption (AES-256-GCM, key derived from master password)
- Access control (master password verification)

**Exposes:**
- `/v1/vault/entries` — List vault entries
- `/v1/vault/entries` — Create entry (encrypt on save)
- `/v1/vault/entries/{id}` — Get entry (decrypt on read)
- `/v1/vault/entries/{id}` — Update entry
- `/v1/vault/entries/{id}` — Delete entry
- `/v1/vault/verify` — Verify master password

**Data Store:**
- Schema: `vault_schema` in PostgreSQL
- Tables: vault_entries (encrypted content field)

**Dependencies:** None (but logically paired with Auth)

**Key Tech:**
- AES-256-GCM encryption
- PBKDF2 for key derivation
- Master password (separate from login password)
- Server-side encryption at rest

---

### 3. Job Tracker Service (Port 8003)

**Responsibility:** Job search, applications, interview tracking

**Owns:**
- Jobs (discovered or manually added)
- Companies
- Applications (per job, status tracking)
- Interviews (rounds, outcomes)
- Search configs (scraper settings)
- Batch runs (job scraping executions)
- Candidate profile (resume, skills, target roles, salary floor)
- Message drafts (cover letters, referral requests)
- Referral search links (LinkedIn deep-links)

**Exposes:**
- `/v1/jobs/*` — Full CRUD
- `/v1/applications/*` — Full CRUD
- `/v1/interviews/*` — Full CRUD
- `/v1/companies/*` — Full CRUD
- `/v1/search-configs/{id}/run` — Start scraper job
- `/v1/search-configs/{id}/stop` — Stop scraper
- `/v1/jobs/{id}/score` — AI fit scoring
- `/v1/jobs/parse-description` — AI description parsing
- `/v1/candidate-profile/parse-resume` — AI resume parsing
- `/v1/message-drafts/cover-letter/generate` — Generate cover letter
- `/v1/message-drafts/referral-request/regenerate` — Regenerate referral note
- `/v1/referral-search-links/generate` — Generate LinkedIn search links
- `/v1/jobs/referral-people` — Get referral suggestions

**Data Store:**
- Schema: `job_tracker_schema` in PostgreSQL
- 15+ tables (jobs, applications, interviews, companies, batch_runs, etc.)

**Dependencies:** 
- Playwright worker (Node.js, separate service for browser automation)
- Ollama (AI scoring, description parsing, cover letter generation)
- Google Custom Search API (optional, for referral people search)

**Key Tech:**
- Spring Batch for job scheduling
- RESTful API
- AI (Ollama) for scoring and generation
- Web scraping (Playwright)

---

### 4. Core Service (Port 8004)

**Responsibility:** All other business logic (productivity, finance, health, etc.)

**Owns:**
- Tasks + subtasks + dependencies
- Projects + milestones
- Goals + key results
- Habits + logs
- Calendar events
- Memories + search
- Search (federated)
- Finance (transactions, budgets, investments)
- Health (vitals, workouts, meals, sleep, mental health)
- Career (skills, interview prep, resumes, salary records)
- Journal entries (encrypted)
- Learning items (courses, books, flashcards)
- Documents (encrypted file storage)
- Dashboard configuration
- Notifications
- Settings

**Exposes:**
- `/v1/tasks/*` — Full CRUD + views (kanban, calendar, gantt, etc.)
- `/v1/goals/*` — OKR management
- `/v1/habits/*` — Habit tracking
- `/v1/projects/*` — Project management
- `/v1/calendar/*` — Calendar + reminders
- `/v1/memories/*` — Memory CRUD + search
- `/v1/search/*` — Federated search
- `/v1/ai/*` — Chat, coach, research, planner, reviewer, reflection
- `/v1/finance/*` — Transactions, budgets, investments
- `/v1/health/*` — Vitals, workouts, nutrition, sleep, mental health
- `/v1/career/*` — Skills, interview prep, resumes, salary
- `/v1/journal/*` — Journal entries (encrypted)
- `/v1/learning/*` — Courses, books, flashcards
- `/v1/documents/*` — File upload, search, download
- `/v1/dashboard/*` — Dashboard data
- `/v1/notifications/*` — Notification history
- `/v1/settings/*` — User preferences

**Data Store:**
- Schema: `core_schema` in PostgreSQL
- 30+ tables

**Dependencies:**
- Ollama (AI reasoning, embeddings future)
- PostgreSQL (search via tsvector)
- Redis (optional, rate limiting)

**Key Tech:**
- Spring Boot (reactive with WebFlux for streaming AI)
- JPA for ORM
- Postgres for all data
- Tsvector for full-text search

---

## Data Flow

### Authentication Flow

```
Client
  │
  ├─ POST /v1/auth/login (email, password)
  │
  └─→ Auth Service
       │
       ├─ Hash password, compare with DB
       ├─ Create JWT (exp: 15 min)
       ├─ Create refresh token (exp: 30 days)
       ├─ Create device session
       │
       └─→ Return { accessToken, refreshToken, sessionId }
           │
           └─ Client stores tokens (secure storage on mobile)

Client (after 15 min)
  │
  ├─ Token expired, call refresh
  ├─ POST /v1/auth/refresh (refreshToken)
  │
  └─→ Auth Service
       │
       ├─ Validate refresh token (not revoked, not expired)
       ├─ Revoke old token (security)
       ├─ Issue new JWT + new refresh token
       │
       └─→ Return { newAccessToken, newRefreshToken }
```

### Biometric Flow

```
Client (Mobile)
  │
  ├─ First time: User sets biometric
  ├─ POST /v1/auth/enroll-biometric { publicKey, type: FINGERPRINT|FACE_ID }
  │
  └─→ Auth Service
       │
       ├─ Generate challenge
       ├─ Store public key in biometric_enrollments
       ├─ Return challenge
       │
       └─ Client signs challenge locally (Secure Enclave/Keystore)

Later: User logs in with biometric
  │
  ├─ Device triggers biometric authentication (local)
  ├─ If success, sign challenge
  ├─ POST /v1/auth/login-biometric { signedChallenge, publicKeyId }
  │
  └─→ Auth Service
       │
       ├─ Verify signature using stored public key
       ├─ If valid, issue JWT + refresh token
       │
       └─→ Return tokens
```

### Request to Protected Endpoint

```
Client
  │
  ├─ GET /v1/tasks (Header: Authorization: Bearer {JWT})
  │
  └─→ API Gateway (Nginx)
       │
       ├─ Forward to Auth Service (/v1/auth/verify {JWT})
       │
       └─→ Auth Service
            │
            ├─ Verify JWT signature
            ├─ Check expiry
            ├─ Extract userId
            │
            └─→ Return { userId, valid }

API Gateway (if valid)
  │
  ├─ Add header X-User-ID: {userId}
  ├─ Forward request to Core Service
  │
  └─→ Core Service
       │
       ├─ Read X-User-ID
       ├─ Query tasks WHERE user_id = X-User-ID
       │
       └─→ Return tasks
```

### Inter-Service Communication

```
Core Service → Auth Service (verify token)
  │
  └─ REST call: GET /v1/auth/verify

Core Service → Job Tracker Service (get job details)
  │
  └─ REST call: GET /v1/jobs/{id}

Async Jobs (Kafka)
  │
  ├─ Job scraper publishes: jobs.scraped { jobId, companyId, ... }
  ├─ Core Service subscribes, processes
  │
  └─ Recurring task generator publishes: tasks.recurring-due
      Core Service subscribes, creates new task instances
```

---

## Database Schema Strategy

**Single PostgreSQL instance, 4 schemas (one per service)**

```sql
CREATE SCHEMA auth_schema;
CREATE SCHEMA vault_schema;
CREATE SCHEMA job_tracker_schema;
CREATE SCHEMA core_schema;

-- Auth Service tables
CREATE TABLE auth_schema.users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE auth_schema.refresh_tokens (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth_schema.users(id),
  token_hash VARCHAR(255) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ
);

-- Vault Service tables
CREATE TABLE vault_schema.vault_entries (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  content_encrypted TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Job Tracker Service tables
CREATE TABLE job_tracker_schema.jobs (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  title VARCHAR(255) NOT NULL,
  ...
);

-- Core Service tables
CREATE TABLE core_schema.tasks (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  title VARCHAR(255) NOT NULL,
  ...
);
```

**No cross-schema foreign keys.** Services call each other via API.

---

## Caching Strategy

**Redis:**
- Session cache (JWT validation, user context)
- Rate limit buckets (per user, per IP)
- Hot job listings (from scraper)
- User settings (timezone, theme)
- Search results (query → results, TTL 1 hour)

**Keys:**
- `session:{sessionId}` → user data (TTL 15 min)
- `ratelimit:{userId}:{endpoint}` → count (TTL 1 min)
- `jobs:hot:{companyId}` → job list (TTL 1 day)
- `search:{query}:{type}` → results (TTL 1 hour)

---

## Message Bus (Kafka)

**Async jobs, event streaming:**

**Topics:**
- `jobs.scraped` — Job scraper publishes discovered jobs
- `jobs.scored` — Job fit scoring complete
- `tasks.recurring-due` — Cron triggers recurring task generation
- `habits.logged` — Habit completion triggers auto-calendar event
- `notifications.send` — Trigger email/push notifications
- `ai.response-stream` — Stream AI responses (websocket fallback)

**Consumers:**
- Core Service consumes all topics (process events, update DB)
- Notification Service consumes `notifications.send`

---

## API Gateway (Nginx)

Single entry point, routes to services:

```nginx
server {
  listen 80;
  server_name api.lifeos.local;

  # Auth endpoints → Auth Service
  location /v1/auth/ {
    proxy_pass http://auth:8001;
  }

  # Vault endpoints → Vault Service
  location /v1/vault/ {
    proxy_pass http://vault:8002;
  }

  # Job Tracker endpoints → Job Tracker Service
  location /v1/jobs/ {
    proxy_pass http://job-tracker:8003;
  }

  location /v1/companies/ {
    proxy_pass http://job-tracker:8003;
  }

  # Everything else → Core Service
  location /v1/ {
    proxy_pass http://core:8004;
  }
}
```

---

## Deployment Architecture

```
VPS (Single server, Docker Compose)
├── Nginx (reverse proxy, port 80/443)
├── Auth Service (Docker container, port 8001)
├── Vault Service (Docker container, port 8002)
├── Job Tracker Service (Docker container, port 8003)
├── Core Service (Docker container, port 8004)
├── PostgreSQL (Docker container, port 5432)
├── Redis (Docker container, port 6379)
├── Kafka (Docker container, port 9092)
└── Playwright Worker (Docker container, port 3000)

PostgreSQL
├── auth_schema
├── vault_schema
├── job_tracker_schema
└── core_schema

Storage
├── Documents (local filesystem, encrypted)
└── Uploads (local filesystem)
```

---

## Security Model

**Authentication:**
- JWT (HS256) for stateless API auth
- Refresh tokens for token rotation
- Per-device session tracking

**Encryption:**
- TLS 1.3 for all traffic
- AES-256-GCM for vault entries (at rest)
- Bcrypt for passwords
- PBKDF2 for key derivation (vault master password)

**Rate Limiting:**
- Per user (prevent abuse)
- Per IP (prevent brute force)
- Per endpoint (prevent DOS)
- Redis-backed for distributed counting

**Isolation:**
- Single-user enforcement (all queries filter by userId)
- Row-level security (Postgres RLS, future)
- No shared data between users (future multi-tenant safety)

---

## Testing Strategy

- **Unit tests:** >80% coverage (service logic, utils)
- **Integration tests:** Database + service logic (testcontainers)
- **Contract tests:** Service boundaries (pact)
- **E2E tests:** Full flow tests (mobile, web)

---

**Next:** Read DATABASE.md for schema details.
