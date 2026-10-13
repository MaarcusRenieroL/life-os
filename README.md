# Life OS

A personal operating system built with a modular Spring Boot backend (one process), React, React Native, and Tauri.

## Quick Start

### Prerequisites
- Docker & Docker Compose
- Node.js 20+ & pnpm
- Java 21 & Maven
- Git

### Local Development

```bash
# Install dependencies
pnpm install

# Start everything (PostgreSQL, Redis, Kafka, Ollama, the backend app, Nginx)
docker-compose up -d

# Verify services
docker ps
curl http://localhost/health
```

### Project Structure

```
life-os/
├── services/          # Backend: one Spring Boot app assembled from module libraries
│   ├── app/              # The runnable app (LifeOsApplication, security, caches, Flyway per module)
│   ├── auth/             # Authentication & sessions
│   ├── vault/            # Password management
│   ├── finance-tracker/  # Budgets, transactions, analytics
│   ├── job-tracker/      # Job search & tracking
│   ├── habit-tracker/    # Habits, streaks, reminders
│   ├── notes/            # Notes, folders, attachments
│   ├── tasks/            # Tasks, projects, and the Goals module
│   ├── calendar/         # Events, reminders, recurrence
│   ├── workouts/         # Routines, sessions, records, measurements
│   ├── batches/          # Scheduled jobs (Gmail sync, backups)
│   ├── core/             # Per-user module settings, notifications, automation, email hub
│   └── common/           # Shared library (auth, Kafka, JWT)
├── apps/             # Frontend applications
│   ├── mobile/       # React Native (Expo)
│   ├── web/          # React + Vite
│   └── desktop/      # Tauri + React
└── .github/          # CI/CD pipelines
```

## Development Workflow

1. Create feature branch: `git checkout -b feat/description`
2. Make changes & commit: `git commit -m "feat(service): description"`
3. Push & create PR to `dev`: `git push origin feat/description`
4. Merge to `main` after approval

## Backend

All modules run in one JVM (`services/app`, port 8005). Each module under `services/` is a plain
library jar; `services/pom.xml` builds them together and `services/Dockerfile` produces the single
image. Routes are still grouped by prefix, and Nginx (port 80) is the gateway:

| Module | Routes | Purpose |
|--------|--------|---------|
| Auth | `/v1/auth` | User identity & sessions |
| Vault | `/v1/vault` | Password manager |
| Job Tracker | `/v1/jobs`, `/v1/resumes`, `/v1/skills`, `/v1/career-profile` | Job search & interviews |
| Core | `/v1/core` | Module settings, notifications, automation, email hub |
| Batches | `/v1/batches` | Scheduled jobs (Gmail sync, backups) |
| Finance Tracker | `/v1/finance` | Budgets, transactions, analytics |
| Notes | `/v1/notes`, `/v1/folders`, `/v1/tags`, `/v1/templates` | Notes, folders, attachments |
| Habit Tracker | `/v1/habits` | Habits, streaks, reminders |
| Tasks | `/v1/tasks`, `/v1/goals` | Tasks, projects, and goals |
| Calendar | `/v1/calendar` | Events, reminders, recurrence |
| Workouts | `/v1/workouts` | Routines, sessions, PRs, body measurements |

Database migrations live in each module's `src/main/resources/db/migration/<module>/` and run per
module (own Postgres schema and history table). Build and test everything with
`cd services && mvn test`; run the app with `docker compose up -d --build app`.

## Tech Stack

- **Backend:** Spring Boot 4, Java 21
- **Database:** PostgreSQL
- **Cache:** Redis
- **Messaging:** Kafka
- **Web:** React + Vite
- **Mobile:** React Native + Expo
- **Desktop:** Tauri + React
- **Monorepo:** pnpm + Turborepo

## CI/CD

- GitHub Actions on push/PR to `main`/`dev`/`feature/**`
- Backend: `cd services && mvn test` (runs every module; set `SPRING_DATASOURCE_URL` to also run the full-context boot test)
- Frontend: lint + typecheck + build for web and mobile

See `.github/workflows/ci.yml` for the current pipeline. There is no automated deploy or
Docker registry push configured yet — deploys are manual.
