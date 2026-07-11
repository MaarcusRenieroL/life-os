# Life OS — Complete Product Vision

**Last Updated:** 2026-07-10  
**Status:** Ready for backend-first rebuild  
**Author:** Maarcus Reniero L

---

## Overview

Life OS is a comprehensive personal operating system for one person. A single, interconnected system covering productivity (tasks, projects, goals), life domains (finance, health, career, learning), and intelligence (AI, search, memory). Built with microservices, modern tooling, and designed for privacy (self-hosted).

**Scope:** Single-user personal app (you). No multi-tenancy, no team features.

---

## Architecture Philosophy

- **Microservices-first:** Separate services for isolated concerns (auth, encryption, job search)
- **Backend complete first:** All API logic done before any UI
- **Module-by-module:** Finish one module end-to-end before next
- **Mobile first:** iOS/Android via React Native, web/desktop follow
- **Privacy:** Self-hosted, no data left with cloud vendors

---

## Modules (20 Total)

### Phase 1: Foundation & Intelligence (Tier 0-1)

**Auth Module**
- Email/password login + registration
- Biometric login (fingerprint/Face ID on mobile/web/desktop)
- JWT + rotating refresh tokens
- Per-device session management (can revoke individual devices)
- Rate limiting + brute-force protection

**Memory Module**
- 6 memory types: SEMANTIC, DECISION, LEARNING, INSIGHT, TODO, REFLECTION
- Full-text search via PostgreSQL tsvector
- Tags, timeline view, importance levels
- AI suggestions (from conversations, user confirms before saving)
- DECISION type has extra fields: reasoning, alternatives, outcome

**Search Module**
- Federated full-text search across all modules
- Results grouped by type (Memories, Tasks, Projects, etc.) + ranked by relevance
- Global search box + per-module search
- No semantic search yet (future)

**AI Module**
- 6 modes: Chat, Coach, Research, Planner, Reviewer, Reflection
- Full context access (all user data)
- Tool-calling: search(), create_memory(), create_task(), get_data()
- Ollama backend (local, private)
- Conversation history stored in DB
- Streaming responses

### Phase 2: Productivity (Tier 2)

**Tasks (The Hub)**
- Central organizing principle for all work
- Statuses: TODO, IN_PROGRESS, DONE, BLOCKED, WAITING, ARCHIVED
- Priorities: LOW, MEDIUM, HIGH, URGENT
- Recurring (iCal RRULE: daily, weekly, custom)
- Parent/child hierarchy (subtasks)
- Blocking dependencies (Task A blocks Task B)
- Effort estimation (estimateMinutes)
- Links to: Goals, Projects, Habits, Health, Finance, Notes, Memories
- Views: List, Kanban, Calendar, Timeline, Gantt, Burndown
- AI: Breakdown, prioritize, estimate effort, duplicate detection, smart scheduling

**Projects**
- Container for related tasks
- Statuses: PLANNING, IN_PROGRESS, COMPLETED, ON_HOLD, CANCELLED
- Optional milestones (phases with target dates)
- Time tracking (hours logged per project)
- Progress: Auto-calculate from tasks or manual override
- Links to: Goals, Habits, Documents
- Views: List, Kanban, Gantt, Board
- AI: Break into milestones, generate tasks, next-step suggestions, on-track analysis

**Calendar**
- Typed events: EVENT, REMINDER, APPOINTMENT, WORKOUT, MEAL, BLOCKED_TIME
- Recurring events (iCal RRULE) with exceptions
- Timezone-aware (store UTC, display in user's timezone)
- Auto-create events from: Tasks (due date), Habits (daily habit), Health (workout), Finance (bill)
- Reminders: Custom minutes before, via in-app + push + email
- Views: Month, Week, Day, Agenda, Schedule (timeline), Heatmap
- AI: Suggest best time, time blocking, conflict detection, capacity analysis

**Notes**
- Markdown editor (edit markdown, display rich text)
- Parent/child hierarchy (outline structure)
- Tags + folders (both for organization)
- Backlinks: Forward links + backlinks (which notes mention this one?)
- Templates: Pre-made (meeting, book summary, project plan, weekly review) + user-created
- AI: Auto-tag, summarize, suggest related, generate outline, extract action items

**Goals (OKR System)**
- Objectives with Key Results
- Goal types: SHORT_TERM, LONG_TERM, LEARNING, HEALTH, FINANCE, CAREER, PERSONAL
- Custom time horizons (30 days, 1 year, 5 years, etc.)
- Key Results: Track progress (current/target value + unit)
- Milestones: Break goal into phases
- Status tracking + reviews (weekly, monthly, quarterly)
- Progress: Auto-calculate from tasks, manual override, or metric-based
- Links to: Projects, Tasks, Habits
- AI: Break into OKRs, structure plan, track progress, analyze, prioritize

**Habits**
- Frequency: Custom RRULE (daily, weekly, 3x/week, every other day, etc.)
- Tracking: Checkbox (yes/no completion)
- Streaks: Current + longest (personal record)
- Categories: HEALTH, LEARNING, PRODUCTIVITY, PERSONAL + tags
- Auto-calendar events (create event at preferred time)
- Views: List (with streaks), Calendar heatmap (GitHub-style), Streak tracker, Progress
- AI: Pattern detection, risk alerts, recommendations, habit stacking

**Journal**
- Freeform entries + AI-guided (conversational interview → generates entry)
- Mood/emotion tagging (very sad to very happy)
- Category (work, health, personal, relationships, learning, finance)
- Encryption at rest (AES-256-GCM)
- Links to: Memories, Goals, Habits
- Views: Timeline, Calendar, Search, Stats (mood trends, journaling streak)
- AI: Generate prompts, sentiment analysis, extract insights, weekly reflection, growth tracking

**Learning**
- Item types: Course, Book, Certification, Video, Article, Skill
- Progress: % complete (auto or manual), time spent, spaced repetition flashcards
- Milestones: For courses (chapters/modules)
- Time logs: Track hours spent
- Flashcards: SM-2 algorithm for spaced repetition (review due dates)
- Links to: Goals, Habits, Notes, Skills
- Views: List, By status, By skill, Progress, Flashcard queue
- AI: Learning paths, recommend next, generate quizzes, explain concepts, gap analysis, custom 3-month plan

### Phase 3: Life Domains

**Finance**
- Transactions: Income/Expense with categories
- Budgets: Monthly per category with alerts (80% threshold)
- Investments: Stocks, crypto, bonds, tracking portfolio
- Net worth snapshots (monthly)
- Links to: Goals (savings goal), Tasks (bill payment)
- Views: Dashboard, Transactions, Budget tracker, Net worth chart, Spending breakdown
- AI: Spending insights, budget recommendations, savings opportunities, trend analysis, tax prep

**Health**
- Vitals: Weight, BP, heart rate, blood sugar, temperature
- Workouts: Type, duration, intensity, calories burned, distance
- Nutrition: Meals by type (breakfast/lunch/dinner/snack) with macros
- Sleep: Bedtime, wake time, quality rating
- Mental health: Mood, stress, anxiety tracking
- Auto-calendar events for workouts
- Links to: Goals (fitness goal), Habits (sleep habit, workout habit)
- Views: Dashboard, Vitals chart, Workout log, Nutrition tracker, Sleep heatmap, Mental health trends
- AI: Workout recommendations, recovery insights, nutrition advice, health correlations, alerts, trend analysis

**Career**
- Skills: Technical, soft skills, domain (level: beginner to expert)
- Interview prep: DSA, system design, behavioral (track practice)
- Resume versions: Multiple for different roles (track which used for which job)
- Career goals: Current role → target role (5-year vision)
- Salary tracking: Historical records (base + bonus + equity)
- Links to: Learning (courses that teach skills), Goals (career goal), Jobs (Job Tracker)
- Views: Skills matrix, Interview prep progress, Resume versions, Salary progression
- AI: Mock interviews, resume feedback, interview tips, salary negotiation, skill gaps, career roadmap

**Documents**
- File storage: Resumes, PDFs, designs, contracts, any file
- Local filesystem storage (encrypted)
- Full-text search: Filename + OCR'd text + embedded text
- Folders + tags for organization
- Links to: Career (resumes), Projects (design docs), Tasks, Memories
- Views: List, By type, By folder, Recent, Search
- AI: Extract text (OCR), auto-tag, summarize, metadata extraction

### Phase 4: System

**Notifications**
- Types: Reminder, Achievement, AI nudge, Social, System
- Delivery: In-app (toast + history), Push, Email
- Triggers: Task due, calendar event, habit reminder, streak achievements, AI nudges
- Notification center: History (last 30 days), mark read/archived
- Quiet hours (7pm-8am, customizable)

**Dashboard**
- Today section: Due today (tasks, events, habits), streaks at risk, health reminder
- This week: Upcoming tasks, calendar grid, workouts, sleep, spending
- Goals progress: Top 3 goals with progress bars
- Financial summary: Net worth, spending vs budget
- Health snapshot: Weight, sleep, workouts, mood trend
- AI assistant widget: Chat/Coach/Research quick access
- Customizable widgets (add/remove/reorder)

**Settings**
- Timezone, language, theme (light/dark/auto)
- Notification preferences (per type, channels)
- Account (email, change password, 2FA future)
- Data (export JSON/CSV, delete account)
- Integrations (future: Zapier, IFTTT)
- About (version, privacy policy, terms)

### Future Scope

- **Relationships:** Contacts, interaction tracking, relationship lifecycle
- **Knowledge Graph:** Nodes/edges for all entities (deferred)
- **Media:** Photos, videos, albums (deferred)
- **Advanced AI:** Multi-agent system, proactive AI, fine-tuning
- **Collaboratove features:** Sharing, team workspaces
- **Integrations:** Bank sync, wearables, external APIs

---

## Data Model Overview

### Single Database, 4 Schemas

- **auth_schema:** users, refresh_tokens, device_sessions, biometric_enrollments
- **vault_schema:** vault_entries (encrypted)
- **job_tracker_schema:** jobs, companies, applications, interviews, searches, scraper configs
- **core_schema:** tasks, goals, habits, projects, journals, learning, finance, health, career, memory, documents, notes, calendar, notifications

### Key Principles

- No cross-schema foreign keys (services own their data)
- Service-level joins via API calls
- Eventual consistency for inter-service data
- Timestamps (createdAt, updatedAt) on all entities
- userId (FK) on all multi-user-capable tables (for single-user enforcement)

---

## Integration Map

```
Tasks (hub)
  ├─ Goals (task serves goal)
  ├─ Projects (task is part of project)
  ├─ Habits (task is habit instance)
  ├─ Health (task is workout/meal)
  ├─ Finance (task is budget-related)
  ├─ Notes (task has related note)
  └─ Memories (task related to memory)

Calendar
  ├─ Tasks (due date → event)
  ├─ Habits (daily habit → event)
  ├─ Health (workout → event)
  └─ Finance (bill → event)

Goals
  ├─ Projects (projects serve goal)
  ├─ Tasks (tasks serve goal)
  ├─ Habits (habits support goal)
  └─ Learning (learning serves goal)

Health
  ├─ Habits (sleep/workout habits)
  ├─ Goals (fitness goals)
  ├─ Journal (mood in journal)
  └─ Finance (health expenses)

Career
  ├─ Learning (courses for skills)
  ├─ Skills (list of skills)
  ├─ Jobs (Job Tracker)
  └─ Documents (resumes, portfolios)

Finance
  ├─ Goals (savings goals)
  ├─ Tasks (bill payment tasks)
  └─ Health (health expenses)

Learning
  ├─ Goals (learning goals)
  ├─ Skills (what skill this teaches)
  ├─ Habits (learning habits)
  └─ Notes (save highlights)

Memory
  ├─ Search (federated search)
  ├─ AI (context for reasoning)
  ├─ Notes (related notes)
  ├─ Goals (decision memory for goal)
  └─ Journal (insights saved to memory)
```

---

## API Design

- REST HTTP APIs (JSON)
- OpenAPI 3.0 specification
- Generated TypeScript client
- Shared types across all services
- Pagination: cursor-based or offset
- Versioning: URL-based (/v1, /v2)
- Rate limiting: Per user, per IP
- Authentication: JWT + refresh tokens

---

## Non-Functional Requirements

- **Performance:** API response <200ms (p95)
- **Availability:** 99.9% uptime (self-hosted, best-effort)
- **Security:** AES-256 encryption, TLS 1.3, bcrypt passwords, mTLS (future)
- **Scalability:** Single-user initially, design for future multi-tenant
- **Privacy:** No data leaves VPS, GDPR-ready (future)
- **Testing:** Unit tests (80%+), integration tests, E2E tests
- **Documentation:** OpenAPI, architecture docs, setup guides

---

## Success Criteria

- ✓ All 4 services deployable on single VPS
- ✓ All 20 modules with core features built
- ✓ Mobile app (iOS/Android) fully functional
- ✓ Web app (browser) fully functional
- ✓ Desktop app (Mac/Windows) fully functional
- ✓ CI/CD pipeline automated
- ✓ Real microservice architecture (not just modular monolith)
- ✓ Complete backend tests

---

**Next:** Read ARCHITECTURE.md for service design.
