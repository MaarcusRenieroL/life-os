# Build Plan - Backend First

**Status:** Ready for implementation  
**Approach:** Service-by-service, module-by-module within services  
**Timeline:** Phases breakdown (you pace, estimated weeks shown)

---

## Phase Overview

### Phase 1: Foundation (Weeks 1-2)
**Goal:** Auth service + basic infrastructure

- [x] Repository setup (monorepo, docker-compose)
- [x] Database schema (all 4 schemas)
- [ ] Auth service (register, login, logout, biometrics)
- [ ] Nginx routing
- [ ] GitHub Actions CI/CD (lint, test, build)

### Phase 2: Core Infrastructure (Weeks 2-3)
**Goal:** Core service scaffolding + Kafka setup

- [ ] Core service (Spring Boot scaffolding)
- [ ] Kafka broker + topics
- [ ] Redis setup
- [ ] Inter-service communication (REST)
- [ ] Database transactions

### Phase 3: Vault Service (Week 1)
**Goal:** Password manager API

- [ ] Vault service (encrypt/decrypt, CRUD)
- [ ] Vault entry model
- [ ] Master password handling
- [ ] Tests

### Phase 4: Job Tracker Service (Weeks 2-3)
**Goal:** Job search + scraping + AI

- [ ] Job CRUD
- [ ] Application tracking
- [ ] Interview scheduling
- [ ] Search config + batch runs
- [ ] Ollama integration (scoring, parsing)
- [ ] LinkedIn scraper (Playwright worker)
- [ ] Tests

### Phase 5: Core Service - Productivity (Weeks 3-4)
**Goal:** Tasks, goals, projects, habits

- [ ] Tasks (CRUD, recurring, dependencies)
- [ ] Goals (OKRs, key results)
- [ ] Projects (milestones, time tracking)
- [ ] Habits (streaks, logs)
- [ ] Tests

### Phase 6: Core Service - Intelligence (Weeks 2-3)
**Goal:** Search, memory, AI

- [ ] Memory CRUD + full-text search
- [ ] Search (federated across tasks, jobs, etc.)
- [ ] AI module (chat, coach, research modes)
- [ ] Ollama integration
- [ ] Tests

### Phase 7: Core Service - Life Domains (Weeks 2-3)
**Goal:** Finance, health, career, learning, calendar, journal

- [ ] Finance (transactions, budgets, investments)
- [ ] Health (vitals, workouts, nutrition, sleep)
- [ ] Career (skills, interview prep, resumes)
- [ ] Learning (courses, books, flashcards)
- [ ] Calendar (events, reminders)
- [ ] Journal (entries, encryption, prompts)
- [ ] Tests

### Phase 8: Core Service - System (Week 1)
**Goal:** Dashboard, notifications, settings

- [ ] Dashboard (aggregated data)
- [ ] Notifications (history, delivery)
- [ ] Settings (user preferences)
- [ ] Tests

### Phase 9: Mobile App (Weeks 4-5)
**Goal:** React Native end-to-end

- [ ] Auth screens (login, register, biometric)
- [ ] Task management (list, kanban, calendar views)
- [ ] Habits (daily tracking, streaks)
- [ ] Health (vitals, workouts, nutrition)
- [ ] Finance (transactions, budgets)
- [ ] AI chat
- [ ] Bottom-tab navigation
- [ ] Tests (unit, E2E)

### Phase 10: Web App (Weeks 3-4)
**Goal:** Next.js end-to-end

- [ ] Auth pages
- [ ] Dashboard
- [ ] Task management (all views)
- [ ] Goals + OKRs
- [ ] Finance dashboard
- [ ] AI chat + modes
- [ ] Settings
- [ ] Tests

### Phase 11: Desktop App (Weeks 2-3)
**Goal:** Tauri end-to-end

- [ ] Tauri scaffolding
- [ ] Sidebar navigation
- [ ] Task management (from web)
- [ ] Calendar view
- [ ] Settings
- [ ] System tray (background app)

---

## Detailed Phase Breakdown

### Phase 1: Foundation (Weeks 1-2)

**Week 1:**

Monday-Tuesday:
```
[ ] Clean up GitHub repo (delete old code, keep history)
[ ] Set up monorepo structure (pnpm workspaces, Turborepo)
[ ] Create directory structure:
    /services/{auth,vault,job-tracker,core}
    /apps/{mobile,web,desktop}
    /packages/{ui,api-client,state,types,constants}
[ ] Initialize each service as Spring Boot project
[ ] Set up docker-compose.yml (Postgres, Redis, Kafka, Nginx)
[ ] Create .env.example template
[ ] Initialize GitHub Actions workflows (CI/CD)
```

Wednesday-Friday:
```
[ ] Design all database schemas (4 schemas)
[ ] Create Flyway migration files
[ ] Set up JPA entities for each service
[ ] Create repository interfaces
[ ] Write integration tests (testcontainers)
```

**Week 2:**

Monday-Wednesday:
```
[ ] Auth service implementation:
    [ ] User registration endpoint
    [ ] Email/password login
    [ ] JWT generation + refresh token rotation
    [ ] Device session tracking
    [ ] Logout (token revocation)
    [ ] Unit tests for auth logic
```

Thursday-Friday:
```
[ ] Biometric setup:
    [ ] Enrollment endpoint (public key storage)
    [ ] Biometric login (challenge-response)
    [ ] Tests
[ ] Nginx routing setup
[ ] Test all auth endpoints locally
```

**Deliverables:**
- Auth service running on :8001
- Login → JWT flow working
- Biometric enrollment + login working
- Docker containers all running
- CI/CD pipelines green

---

### Phase 5: Core Service - Productivity (Weeks 3-4)

**This is the largest phase. Break into sub-phases.**

**Week 1:**

Monday-Wednesday: **Tasks**
```
[ ] Task entity + JPA
[ ] CRUD endpoints (create, read, update, delete, list)
[ ] Filtering (by status, priority, dueDate)
[ ] Sorting
[ ] Pagination
[ ] Recurring tasks (iCal RRULE parsing)
[ ] Parent/child (subtasks)
[ ] Dependencies (blocking)
[ ] Tests
```

Thursday-Friday: **Goals**
```
[ ] Goal entity + JPA
[ ] KeyResult entity (OKRs)
[ ] CRUD endpoints
[ ] Progress calculation (auto from tasks)
[ ] Tests
```

**Week 2:**

Monday-Wednesday: **Projects**
```
[ ] Project entity + JPA
[ ] Milestone entity
[ ] CRUD endpoints
[ ] Time tracking (ProjectTimeLog)
[ ] Progress tracking
[ ] Tests
```

Thursday-Friday: **Habits**
```
[ ] Habit entity + JPA
[ ] HabitLog (daily tracking)
[ ] Streak calculation
[ ] CRUD endpoints
[ ] Tests
```

**Deliverables:**
- All 4 entities fully working
- All CRUD endpoints
- Tests passing
- Ready for views (kanban, calendar, etc.) later in UI phase

---

### Phase 9: Mobile App (Weeks 4-5)

**Focus:** React Native + Expo, using backend APIs built in earlier phases.

**Week 1:**

Monday-Tuesday: **Setup + Auth**
```
[ ] Expo project scaffolding (already exists, clean it up)
[ ] pnpm monorepo integration
[ ] Shared packages (api-client, state, types)
[ ] Login screen (email/password)
[ ] Biometric login (expo-local-authentication)
[ ] Token storage (secure storage)
```

Wednesday-Friday: **Navigation + Dashboard**
```
[ ] Bottom-tab navigation (5 tabs: Tasks, Calendar, AI, Finance, Settings)
[ ] Dashboard screen (today's tasks, upcoming, health, goals)
[ ] Mobile-first responsive design
[ ] Theming (light/dark)
```

**Week 2:**

Monday-Wednesday: **Tasks Management**
```
[ ] Task list screen (filter by status, due date)
[ ] Kanban view (drag-drop tasks between columns)
[ ] Calendar view (see tasks on dates)
[ ] Create task modal
[ ] Edit task modal
[ ] Mark task complete
```

Thursday-Friday: **Habits + Health**
```
[ ] Habit tracker (daily checklist)
[ ] Log health metrics (weight, workouts)
[ ] Streak display
```

**Week 3:**

Monday-Tuesday: **Finance**
```
[ ] Transaction list
[ ] Add transaction modal
[ ] Budget view (vs spent)
```

Wednesday-Friday: **AI Chat**
```
[ ] Chat screen (message history)
[ ] Stream AI responses
[ ] Message input + send
```

**Deliverables:**
- Mobile app fully functional for all major features
- iOS + Android builds working
- App Store + Play Store ready (future deployment)

---

## What to Build First (Recommended Order)

**Start with: Phase 1 + Phase 2 + Phase 3 + Phase 4**

This gives you:
- Auth service (prerequisite for everything)
- Vault service (useful, relatively simple)
- Job Tracker service (your existing code, already familiar)
- Core service scaffolding (ready for modules)

**Then Phase 5 (Productivity in Core):**
- Tasks, Goals, Projects, Habits (most important modules)

**Then Phase 6 + 7 (Intelligence + Life Domains):**
- Memory, Search, AI, Finance, Health, Career, Learning, Calendar, Journal

**Then Phase 8 (System):**
- Dashboard, Notifications, Settings

**Then Phase 9-11 (UI):**
- Mobile, Web, Desktop

---

## Development Workflow

**Per service/module:**

1. Write API spec (OpenAPI)
2. Create JPA entities + schema
3. Write repository interfaces
4. Implement service logic + endpoints
5. Write unit tests (>80% coverage)
6. Write integration tests (with DB)
7. Test manually (curl, Postman)
8. Commit + push (CI/CD runs)
9. Deploy to VPS (docker-compose restart)

---

## Testing Targets

- **Unit tests:** >80% coverage (business logic)
- **Integration tests:** Major flows (service + DB)
- **E2E tests:** Later, after UI phase

Run tests in CI/CD before deploy.

---

## Timeline Estimate

- **Optimistic:** 12-14 weeks (full backend + mobile)
- **Realistic:** 16-20 weeks (with debugging, iterations)
- **With perfection:** 20-24 weeks (high test coverage, polish)

---

**Next:** Read DEV_WORKFLOW.md for git strategy and commit conventions.
