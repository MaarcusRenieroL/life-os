# Life OS

A personal operating system built with Spring Boot microservices, React, React Native, and Tauri.

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

# Start all services (PostgreSQL, Redis, Kafka, Nginx, APIs)
docker-compose up -d

# Verify services
docker ps
curl http://localhost/health
```

### Project Structure

```
life-os/
├── services/          # Spring Boot microservices
│   ├── auth/             # Authentication & sessions
│   ├── vault/            # Password management
│   ├── finance-tracker/  # Budgets, transactions, analytics
│   ├── job-tracker/      # Job search & tracking
│   ├── habit-tracker/    # Habits, streaks, reminders
│   ├── notes/            # Notes, folders, attachments
│   ├── batches/          # Scheduled jobs (Gmail sync, backups)
│   ├── core/             # Per-user module settings
│   └── common/           # Shared library (auth, Kafka, caching config)
├── apps/             # Frontend applications
│   ├── mobile/       # React Native (Expo)
│   ├── web/          # React + Vite
│   └── desktop/      # Tauri + React
├── docs/             # Documentation
└── .github/          # CI/CD pipelines
```

## Development Workflow

1. Create feature branch: `git checkout -b feat/description`
2. Make changes & commit: `git commit -m "feat(service): description"`
3. Push & create PR to `dev`: `git push origin feat/description`
4. Merge to `main` after approval

## Documentation

- [Product Vision](docs/00-PRODUCT_VISION.md) — Feature overview
- [Architecture](docs/01-ARCHITECTURE.md) — System design
- [Build Plan](docs/02-BUILD_PLAN.md) — Implementation phases
- [Dev Workflow](docs/03-DEV_WORKFLOW.md) — Git & code standards
- [Setup Guide](docs/04-SETUP_GUIDE.md) — Initial setup
- [Build Process](docs/05-BUILD_PROCESS_GUIDE.md) — Task checklist

## Services

| Service | Port | Purpose |
|---------|------|---------|
| Auth | 8001 | User identity & sessions |
| Vault | 8002 | Password manager |
| Job Tracker | 8003 | Job search & interviews |
| Core | 8004 | Per-user module settings |
| Batches | 8005 | Scheduled jobs (Gmail sync, backups) |
| Finance Tracker | 8006 | Budgets, transactions, analytics |
| Notes | 8007 | Notes, folders, attachments |
| Habit Tracker | 8008 | Habits, streaks, reminders |
| Nginx | 80 | API Gateway |

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
- Backend: per-service `mvn test` for every service with a test suite
- Frontend: lint + typecheck + build for web and mobile

See `.github/workflows/ci.yml` for the current pipeline. There is no automated deploy or
Docker registry push configured yet — deploys are manual.
