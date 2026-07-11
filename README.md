# Life OS

A personal operating system built with Spring Boot microservices, React, Angular, and Tauri.

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
│   ├── auth/         # Authentication & sessions
│   ├── vault/        # Password management
│   ├── job-tracker/  # Job search & tracking
│   └── core/         # Productivity & intelligence
├── apps/             # Frontend applications
│   ├── mobile/       # React Native (Expo)
│   ├── web/          # Angular
│   └── desktop/      # Tauri + React
├── packages/         # Shared libraries
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
| Core | 8004 | Productivity & intelligence |
| Nginx | 80 | API Gateway |

## Tech Stack

- **Backend:** Spring Boot 3.x, Java 21
- **Database:** PostgreSQL
- **Cache:** Redis
- **Messaging:** Kafka
- **Web:** Angular
- **Mobile:** React Native + Expo
- **Desktop:** Tauri + React
- **Monorepo:** pnpm + Turborepo

## CI/CD

- GitHub Actions on PR to `dev`/`main`
- Automated lint, test, build, and deploy
- Docker image builds & registry push
- Rollback available on production

See `.github/workflows/` for details.
