# Build Process Guide — Detailed Task Checklist

**Follow this guide step-by-step. Only ask me if you get stuck or have architectural doubts.**

This document breaks down the **entire backend-first build** into granular, actionable tasks with success criteria.

---

## Section 1: Repository & Infrastructure Setup

### Task 1.1: Clean Repository

**Prerequisites:** None (starting point)

**Steps:**
1. Create backup: `git branch backup-before-reset`
2. Tag backup: `git tag backup-main HEAD`
3. Clean all files: `git clean -fd && git rm -r .` (keep `.git/`)
4. Commit: `git commit -m "chore: fresh start"`
5. Push: `git push origin main`

**Success Criteria:**
- [ ] `git log` shows only backup tag + fresh commit
- [ ] GitHub shows empty repo (except .git)
- [ ] Backup branch exists locally: `git branch | grep backup`

---

### Task 1.2: Create Monorepo Directory Structure

**Prerequisites:** Task 1.1 complete

**Steps:**
1. Create all directories per SETUP_GUIDE.md:
   ```bash
   mkdir -p services/{auth,vault,job-tracker,core}
   mkdir -p apps/{mobile,web,desktop}
   mkdir -p packages/{ui,api-client,state,types,constants}
   mkdir -p .github/workflows
   mkdir -p docs
   ```

2. Verify structure:
   ```bash
   tree -L 2 -d  # Should match SETUP_GUIDE.md exactly
   ```

**Success Criteria:**
- [ ] All directories exist
- [ ] No files in any of these directories yet (except docs/)
- [ ] `tree -L 2 -d` output matches SETUP_GUIDE.md structure

---

### Task 1.3: Create Config Files

**Prerequisites:** Task 1.2 complete

**Steps:**
1. Copy from SETUP_GUIDE.md and create:
   - [ ] `pnpm-workspace.yaml` (exact copy from guide)
   - [ ] `turbo.json` (exact copy)
   - [ ] `docker-compose.yml` (exact copy)
   - [ ] `nginx.conf` (exact copy)
   - [ ] `.env.example` (exact copy)
   - [ ] `.gitignore` (exact copy)

2. Verify files:
   ```bash
   ls -la | grep -E "pnpm|turbo|docker|nginx|env|gitignore"
   ```

**Success Criteria:**
- [ ] All 6 files exist in repo root
- [ ] `docker-compose.yml` has all 9 services (postgres, redis, kafka, zookeeper, nginx, auth, vault, job-tracker, core)
- [ ] `.gitignore` exists and includes `node_modules/`, `target/`, `.env`

---

### Task 1.4: Initialize Spring Boot Services

**Prerequisites:** Task 1.3 complete

**For each service** (auth, vault, job-tracker, core):

**Steps:**
1. Create Maven project:
   ```bash
   cd services/auth
   
   # Option A: From command line
   mvn archetype:generate \
     -DgroupId=com.lifeos \
     -DartifactId=lifeos-auth \
     -DarchetypeArtifactId=maven-archetype-quickstart \
     -DinteractiveMode=false
   
   # Option B: Use IntelliJ/Eclipse Maven generator
   ```

2. Replace `pom.xml` with template from SETUP_GUIDE.md:
   - [ ] Copy exact pom.xml from guide
   - [ ] Change `<artifactId>` and `<name>` for each service
   - [ ] Verify dependencies are correct

3. Create `Dockerfile` (copy from SETUP_GUIDE.md exactly)

4. Create `src/main/resources/application.yml` (copy from guide)

5. Verify structure:
   ```bash
   ls -la
   # Should show: pom.xml, Dockerfile, src/, target/, .gitignore
   ```

**Success Criteria:**
- [ ] Each service has: pom.xml, Dockerfile, application.yml, src/ directory
- [ ] `mvn compile` succeeds in each service
- [ ] No errors in Maven build output

**Repeat for:** vault, job-tracker, core (same steps, just change IDs)

---

### Task 1.5: Initialize pnpm & Turborepo

**Prerequisites:** Task 1.4 complete

**Steps:**
1. Install pnpm globally (if not already):
   ```bash
   npm install -g pnpm
   ```

2. In repo root, create `pnpm-workspace.yaml` (already done in 1.3)

3. Initialize npm packages:
   ```bash
   pnpm init
   ```

4. Create `turbo.json` (already done in 1.3)

5. Verify monorepo setup:
   ```bash
   pnpm list
   # Should show workspace structure
   ```

**Success Criteria:**
- [ ] `pnpm --version` shows pnpm 8.x+
- [ ] `pnpm list` shows workspace
- [ ] No errors in setup

---

### Task 1.6: Docker Compose Test

**Prerequisites:** Task 1.5 complete

**Steps:**
1. Start services:
   ```bash
   docker-compose up -d
   ```

2. Wait for services to start (30-60 seconds)

3. Verify all running:
   ```bash
   docker ps
   # Should show 9 containers running
   ```

4. Test health:
   ```bash
   curl http://localhost/health
   # Should return "ok"
   ```

5. Check logs for errors:
   ```bash
   docker-compose logs postgres
   docker-compose logs nginx
   # Watch for "ready to accept connections" or similar
   ```

**Success Criteria:**
- [ ] `docker ps` shows 9 containers with status "Up"
- [ ] `curl http://localhost/health` returns "ok"
- [ ] No critical errors in logs
- [ ] All services show "healthy" in docker ps

---

### Task 1.7: GitHub Actions CI/CD Setup

**Prerequisites:** Task 1.6 complete

**Steps:**
1. Create `.github/workflows/ci.yml` with:
   ```yaml
   name: CI
   
   on:
     push:
       branches: [main]
     pull_request:
       branches: [main]
   
   jobs:
     test:
       runs-on: ubuntu-latest
       services:
         postgres:
           image: postgres:15
           env:
             POSTGRES_PASSWORD: postgres
   
       steps:
         - uses: actions/checkout@v3
         - name: Set up JDK 21
           uses: actions/setup-java@v3
           with:
             java-version: '21'
             distribution: 'temurin'
         
         - name: Run tests
           run: |
             for service in services/*/; do
               cd "$service"
               mvn test
               cd - || return
             done
   ```

2. Create `.github/workflows/deploy.yml` for production deployment

3. Commit workflows:
   ```bash
   git add .github/workflows/
   git commit -m "ci: add github actions workflows"
   git push origin main
   ```

**Success Criteria:**
- [ ] `.github/workflows/ci.yml` exists
- [ ] GitHub Actions shows workflow on repo
- [ ] CI runs on next push (watch Actions tab)

---

## Section 2: Auth Service Implementation

### Task 2.1: Auth Database Schema

**Prerequisites:** Task 1.6 complete (docker-compose running)

**Steps:**
1. Create Flyway migration:
   ```bash
   cd services/auth
   mkdir -p src/main/resources/db/migration
   touch src/main/resources/db/migration/V1__create_auth_schema.sql
   ```

2. Write migration (from ARCHITECTURE.md):
   ```sql
   CREATE SCHEMA IF NOT EXISTS auth_schema;
   
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
   
   CREATE TABLE auth_schema.device_sessions (
     id UUID PRIMARY KEY,
     user_id UUID NOT NULL REFERENCES auth_schema.users(id),
     device_id VARCHAR(255),
     last_seen_at TIMESTAMPTZ DEFAULT NOW(),
     revoked_at TIMESTAMPTZ
   );
   
   CREATE TABLE auth_schema.biometric_enrollments (
     id UUID PRIMARY KEY,
     user_id UUID NOT NULL REFERENCES auth_schema.users(id),
     device_id VARCHAR(255),
     public_key TEXT NOT NULL,
     type VARCHAR(50),
     created_at TIMESTAMPTZ DEFAULT NOW()
   );
   ```

3. Verify migration runs:
   ```bash
   # Restart docker-compose (Flyway runs on startup)
   docker-compose restart auth
   docker-compose logs auth | grep -i flyway
   ```

**Success Criteria:**
- [ ] Migration file exists at correct path
- [ ] Flyway migration runs on startup (check logs)
- [ ] Connect to DB and verify tables exist:
   ```bash
   docker exec -it lifeos-postgres psql -U postgres -d lifeos -c "\dt auth_schema.*"
   ```

---

### Task 2.2: Auth JPA Entities

**Prerequisites:** Task 2.1 complete (schema created)

**Steps:**
1. Create entity classes:
   ```bash
   cd services/auth/src/main/java/com/lifeos/auth/domain/entity
   touch User.java RefreshToken.java DeviceSession.java BiometricEnrollment.java
   ```

2. Write each entity (example User.java):
   ```java
   @Entity
   @Table(name = "users", schema = "auth_schema")
   public class User {
     @Id
     private UUID id;
     
     @Column(unique = true, nullable = false)
     private String email;
     
     @Column(nullable = false)
     private String passwordHash;
     
     @CreationTimestamp
     private LocalDateTime createdAt;
     
     // getters, setters
   }
   ```

3. Create repositories:
   ```bash
   cd services/auth/src/main/java/com/lifeos/auth/repository
   touch UserRepository.java RefreshTokenRepository.java ...
   ```

4. Test compilation:
   ```bash
   cd services/auth
   mvn compile
   ```

**Success Criteria:**
- [ ] All 4 entity classes created
- [ ] All 4 repository interfaces created
- [ ] `mvn compile` succeeds with no errors
- [ ] No red squiggles in IDE

---

### Task 2.3: Auth Service Implementation

**Prerequisites:** Task 2.2 complete

**Steps:**
1. Create service class:
   ```bash
   cd services/auth/src/main/java/com/lifeos/auth/service
   touch AuthService.java
   ```

2. Implement methods:
   ```java
   @Service
   @RequiredArgsConstructor
   public class AuthService {
     private final UserRepository userRepository;
     private final PasswordEncoder passwordEncoder;
     private final JwtProvider jwtProvider;
     
     public UserDto register(RegisterRequest req) {
       // Hash password, save user, return DTO
     }
     
     public AuthResponse login(LoginRequest req) {
       // Verify password, generate JWT + refresh token
     }
     
     public AuthResponse refresh(String refreshToken) {
       // Validate refresh token, issue new JWT
     }
     
     public void logout(String refreshToken) {
       // Revoke token
     }
   }
   ```

3. Create JWT provider:
   ```bash
   touch JwtProvider.java
   ```

4. Test compilation:
   ```bash
   mvn compile
   ```

**Success Criteria:**
- [ ] AuthService class implements all 4 core methods
- [ ] JwtProvider handles token generation & validation
- [ ] `mvn compile` succeeds
- [ ] No undefined references

---

### Task 2.4: Auth Endpoints

**Prerequisites:** Task 2.3 complete

**Steps:**
1. Create controller:
   ```bash
   touch AuthController.java
   ```

2. Implement endpoints:
   ```java
   @RestController
   @RequestMapping("/v1/auth")
   @RequiredArgsConstructor
   public class AuthController {
     private final AuthService authService;
     
     @PostMapping("/register")
     public ResponseEntity<UserDto> register(@RequestBody RegisterRequest req) {
       return ResponseEntity.ok(authService.register(req));
     }
     
     @PostMapping("/login")
     public ResponseEntity<AuthResponse> login(@RequestBody LoginRequest req) {
       return ResponseEntity.ok(authService.login(req));
     }
     
     @PostMapping("/refresh")
     public ResponseEntity<AuthResponse> refresh(@RequestBody RefreshRequest req) {
       return ResponseEntity.ok(authService.refresh(req.refreshToken()));
     }
     
     @PostMapping("/logout")
     public ResponseEntity<Void> logout(@RequestBody LogoutRequest req) {
       authService.logout(req.refreshToken());
       return ResponseEntity.ok().build();
     }
   }
   ```

3. Test endpoints locally:
   ```bash
   # Start service
   cd services/auth
   mvn spring-boot:run
   
   # In another terminal, test register
   curl -X POST http://localhost:8001/v1/auth/register \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"password123"}'
   ```

**Success Criteria:**
- [ ] All 4 endpoints implemented
- [ ] `mvn spring-boot:run` starts without errors
- [ ] Endpoints respond to curl requests
- [ ] Register endpoint creates user in DB

---

### Task 2.5: Auth Tests

**Prerequisites:** Task 2.4 complete (endpoints working)

**Steps:**
1. Write unit tests:
   ```bash
   touch services/auth/src/test/java/com/lifeos/auth/service/AuthServiceTest.java
   ```

2. Test business logic:
   ```java
   @ExtendWith(MockitoExtension.class)
   class AuthServiceTest {
     @Mock
     private UserRepository userRepository;
     
     @InjectMocks
     private AuthService authService;
     
     @Test
     void testRegister_success() {
       // Given
       RegisterRequest req = new RegisterRequest("test@example.com", "password");
       
       // When
       UserDto result = authService.register(req);
       
       // Then
       assertEquals("test@example.com", result.email());
       verify(userRepository).save(any());
     }
   }
   ```

3. Write integration tests:
   ```bash
   touch services/auth/src/test/java/com/lifeos/auth/AuthIntegrationTest.java
   ```

4. Test with real DB:
   ```java
   @Testcontainers
   @SpringBootTest
   class AuthIntegrationTest {
     @Container
     static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>(...);
     
     @Autowired
     private TestRestTemplate rest;
     
     @Test
     void testLoginFlow() {
       // Register user
       RegisterRequest regReq = new RegisterRequest("test@example.com", "password");
       rest.postForEntity("/v1/auth/register", regReq, UserDto.class);
       
       // Login
       LoginRequest loginReq = new LoginRequest("test@example.com", "password");
       ResponseEntity<AuthResponse> resp = 
         rest.postForEntity("/v1/auth/login", loginReq, AuthResponse.class);
       
       assertEquals(200, resp.getStatusCode().value());
     }
   }
   ```

5. Run tests:
   ```bash
   mvn test
   ```

**Success Criteria:**
- [ ] ≥8 unit tests (register, login, refresh, logout, edge cases)
- [ ] ≥4 integration tests (flows)
- [ ] `mvn test` shows ≥80% coverage
- [ ] All tests pass (green checkmarks)
- [ ] Code coverage report generated in `target/site/jacoco/`

---

### Task 2.6: Auth Documentation & Commit

**Prerequisites:** Task 2.5 complete (tests passing)

**Steps:**
1. Document API in `docs/05-API_SPEC.md`:
   ```markdown
   ## Auth Service (/v1/auth)
   
   ### POST /register
   Request: { email, password }
   Response: { id, email, createdAt }
   
   ### POST /login
   Request: { email, password }
   Response: { accessToken, refreshToken, expiresIn }
   ...
   ```

2. Commit:
   ```bash
   git add services/auth/
   git commit -m "feat(auth): implement user registration, login, logout with JWT"
   
   git add docs/05-API_SPEC.md
   git commit -m "docs(auth): add API specification"
   ```

3. Verify:
   ```bash
   git log --oneline | head -5
   ```

**Success Criteria:**
- [ ] 2 commits created (auth code + docs)
- [ ] Commit messages follow DEV_WORKFLOW.md format
- [ ] `git log` shows new commits
- [ ] API spec documented in docs/

---

## Section 3: Vault Service Implementation

### Task 3.1: Vault Database Schema

**Prerequisites:** Task 1.6 complete (docker-compose running)

**Steps:**
1. Create Flyway migration:
   ```bash
   touch services/vault/src/main/resources/db/migration/V1__create_vault_schema.sql
   ```

2. Write migration:
   ```sql
   CREATE SCHEMA IF NOT EXISTS vault_schema;
   
   CREATE TABLE vault_schema.vault_entries (
     id UUID PRIMARY KEY,
     user_id UUID NOT NULL,
     title VARCHAR(255),
     content_encrypted TEXT NOT NULL,
     type VARCHAR(50),
     created_at TIMESTAMPTZ DEFAULT NOW(),
     updated_at TIMESTAMPTZ DEFAULT NOW()
   );
   
   CREATE INDEX idx_vault_entries_user_id ON vault_schema.vault_entries(user_id);
   ```

3. Verify migration runs (same as Auth Task 2.1)

**Success Criteria:**
- [ ] Migration file exists
- [ ] Flyway runs and creates tables
- [ ] Tables visible in PostgreSQL: `\dt vault_schema.*`

---

### Task 3.2-3.5: Vault Implementation

**Prerequisites:** Task 3.1 complete

**Mirror Tasks 2.2-2.5 (Auth implementation) for Vault:**

- Task 3.2: Vault JPA entities (VaultEntry.java + repository)
- Task 3.3: Vault service (encrypt/decrypt logic, CRUD)
- Task 3.4: Vault endpoints (POST/GET/PATCH/DELETE)
- Task 3.5: Vault tests (unit + integration)

**Unique aspects for Vault:**
- Implement AES-256-GCM encryption in service
- Key derivation from master password (PBKDF2)
- Decrypt on read, encrypt on write
- Don't encrypt user_id or metadata

**Steps (same pattern as Auth):**
1. Create entities
2. Implement service (with encryption)
3. Create endpoints
4. Write tests (including encryption/decryption tests)
5. Document in API spec
6. Commit

**Success Criteria:**
- [ ] VaultEntry entity with encrypted content field
- [ ] AES-256-GCM encryption/decryption working
- [ ] All CRUD endpoints functional
- [ ] Tests include encryption round-trip tests
- [ ] `mvn test` passes with ≥80% coverage

---

## Section 4: Job Tracker Service Implementation

**Prerequisites:** Task 3.5 complete (Vault service done)

### Task 4.1-4.4: Job Tracker Core (Mirror Auth structure)

**Entity list (from ARCHITECTURE.md):**
- Job
- Company
- ApplicationRecord
- Interview
- SearchConfig
- BatchRun
- CandidateProfile
- MessageDraft
- ReferralSearchLink

**Implementation steps:**
1. Create database schema (Flyway migration with all 9 tables)
2. Create JPA entities (one file per entity)
3. Implement service layer:
   - Job CRUD + scoring logic
   - Application tracking
   - Interview scheduling
   - Search config management
4. Create REST endpoints (controller)
5. Write comprehensive tests
6. Document in API spec
7. Commit

**Key implementation details:**
- Job.score() → call Ollama AI for fit scoring
- Application.complete() → emit event to Kafka
- SearchConfig.run() → trigger Playwright worker (async)

**Success Criteria:**
- [ ] 9 entities with relationships defined correctly
- [ ] All CRUD endpoints working
- [ ] Job scoring (basic rule-based + Ollama integration)
- [ ] Application workflow (create, track status, interview scheduling)
- [ ] `mvn test` passes with ≥80% coverage
- [ ] Events published to Kafka topics

---

## Section 5: Core Service Implementation (LARGEST SECTION)

**Prerequisites:** Task 4.4 complete (Job Tracker done)

This service handles: Tasks, Goals, Habits, Projects, Memory, Search, Calendar, Finance, Health, Career, Learning, Journal, AI, Dashboard, Notifications, Settings.

### Task 5.1: Core Database Schema

**Steps:**
1. Create comprehensive Flyway migration with ALL tables (from PRODUCT_VISION.md):
   - Tasks, Goals, Habits, Projects, Milestones, Memories, etc.
   - ~50+ tables total
2. Organize by domain (productivity, life, system)
3. Run migration
4. Verify all tables exist

**Success Criteria:**
- [ ] All 50+ tables created
- [ ] Foreign key relationships correct
- [ ] Indexes on frequently-queried columns

---

### Task 5.2-5.5: Core Productivity Module (Tasks, Goals, Projects, Habits)

**Split into 4 sub-modules:**

**Task 5.2: Tasks**
- Entity: Task, TaskDependency, TaskLog
- Service: CRUD, recurring logic (RRULE parsing), dependency management
- Endpoints: /v1/tasks/* (list, create, update, complete, etc.)
- Tests: Recurring task generation, dependency blocking, subtask hierarchy

**Task 5.3: Goals**
- Entity: Goal, GoalKeyResult, GoalMilestone, GoalReview
- Service: OKR management, progress calculation
- Endpoints: /v1/goals/*
- Tests: Key result progress, milestone tracking

**Task 5.4: Projects**
- Entity: Project, ProjectMilestone, ProjectTimeLog
- Service: Time tracking, progress calculation
- Endpoints: /v1/projects/*
- Tests: Time log rollups, progress from tasks

**Task 5.5: Habits**
- Entity: Habit, HabitLog, HabitStreakSnapshot
- Service: Streak calculation, daily tracking
- Endpoints: /v1/habits/*
- Tests: Streak reset on miss, calendar events auto-creation

**Each sub-module:**
1. Create entities
2. Implement service
3. Create endpoints + views (list, kanban, calendar, timeline, gantt)
4. Write tests
5. Commit

**Success Criteria (per module):**
- [ ] Entities + repos defined
- [ ] Service logic tested
- [ ] All CRUD endpoints working
- [ ] Special logic (RRULE, streaks, etc.) tested
- [ ] Views queryable from API

---

### Task 5.6: Intelligence Module (Memory, Search, AI)

**Task 5.6a: Memory**
- Entity: Memory (with 6 types: SEMANTIC, DECISION, etc.)
- Service: CRUD, full-text search (tsvector), tag management
- Endpoints: /v1/memories/*
- Tests: Search relevance, type-specific fields

**Task 5.6b: Search**
- Service: Federated search across all modules
- Endpoints: /v1/search?q=<query>
- Implementation: Union queries across tasks, jobs, memories, etc.
- Tests: Multi-type ranking, grouping

**Task 5.6c: AI**
- Entity: AiConversation, AiMessage
- Service: 6 modes (Chat, Coach, Research, Planner, Reviewer, Reflection)
- Ollama integration: Call local model, stream responses
- Endpoints: /v1/ai/* (chat, coach, research, etc.)
- Tests: Tool-calling, context retrieval

---

### Task 5.7: Finance Module

- Entity: Transaction, BudgetCategory, Investment, NetWorthSnapshot
- Service: Budget calculation, spending analysis
- Endpoints: /v1/finance/*
- Tests: Budget alerts, net worth tracking

---

### Task 5.8: Health Module

- Entity: HealthVital, Workout, MealLog, SleepLog, MentalHealthLog
- Service: Vital tracking, workout logging
- Endpoints: /v1/health/*
- Tests: Vital trending, sleep quality

---

### Task 5.9: Career Module

- Entity: Skill, InterviewPrepItem, ResumeVersion, CareerGoal, SalaryRecord
- Service: Skill management, resume versioning
- Endpoints: /v1/career/*
- Tests: Resume usage tracking, salary history

---

### Task 5.10: Learning Module

- Entity: LearningItem, LearningMilestone, LearningTimeLog, LearningFlashcard
- Service: Progress tracking, spaced repetition (SM-2 algorithm)
- Endpoints: /v1/learning/*
- Tests: Flashcard scheduling, progress calculation

---

### Task 5.11: Calendar Module

- Entity: CalendarEvent, CalendarReminder
- Service: Event creation, reminder scheduling, timezone handling
- Endpoints: /v1/calendar/*
- Integrations: Auto-create from Tasks (due date), Habits (daily), Health (workouts)

---

### Task 5.12: Journal Module

- Entity: JournalEntry, JournalPrompt, JournalInsight
- Service: Encrypted storage, AI-guided interview
- Endpoints: /v1/journal/*
- Encryption: AES-256-GCM (same as Vault)

---

### Task 5.13: Documents Module

- Entity: Document, DocumentContent
- Service: File storage, OCR, full-text search
- Endpoints: /v1/documents/*
- Implementation: Local filesystem storage (encrypted)

---

### Task 5.14: System Module (Dashboard, Notifications, Settings)

**Dashboard:**
- Endpoint: /v1/dashboard
- Response: Today's tasks, this week's events, goals, health, finance, AI widget

**Notifications:**
- Entity: Notification
- Service: Trigger on events, in-app + push + email delivery
- Endpoints: /v1/notifications/*

**Settings:**
- Entity: UserSettings
- Service: Preferences, export, delete account
- Endpoints: /v1/settings/*

---

### Task 5.15: Inter-Service Integration & Kafka Events

**Steps:**
1. Define Kafka topics:
   - `tasks.recurring-due` (trigger new task creation)
   - `habits.logged` (auto-calendar event)
   - `jobs.scraped` (import jobs)
   - `notifications.send` (trigger notifications)

2. Implement consumers in Core:
   ```java
   @Component
   @RequiredArgsConstructor
   public class TaskRecurringListener {
     @KafkaListener(topics = "tasks.recurring-due")
     public void onRecurringTaskDue(TaskEvent event) {
       // Create next occurrence
     }
   }
   ```

3. Test event flow:
   - Publish test event
   - Verify service processes it
   - Check DB updated

**Success Criteria:**
- [ ] Kafka topics created
- [ ] Consumers implemented
- [ ] Event flow tested end-to-end

---

## Section 6: Mobile App (React Native + Expo)

### Task 6.1: Mobile Scaffolding

**Prerequisites:** Task 5.15 complete (all backend services)

**Steps:**
1. Clean up existing Expo project (or create fresh)
2. Set up pnpm + monorepo integration
3. Install dependencies: `pnpm install`
4. Set up shared packages (api-client, state, types)

**Success Criteria:**
- [ ] `pnpm install` completes without errors
- [ ] `expo start` runs without errors
- [ ] Project loads in iOS Simulator or Android Emulator

---

### Task 6.2: Auth Screens (Login, Register, Biometric)

**Steps:**
1. Create screens:
   - LoginScreen.tsx
   - RegisterScreen.tsx
2. Implement login with JWT storage
3. Implement biometric login (expo-local-authentication)
4. Test flow: Register → Login → Biometric

**Success Criteria:**
- [ ] LoginScreen loads
- [ ] Can register new user (API call)
- [ ] Can login (JWT stored securely)
- [ ] Biometric enrollment works

---

### Task 6.3-6.8: Main Screens (Mirror Backend Modules)

For each module (Tasks, Calendar, Habits, Health, Finance, AI):
1. Create screens (list, detail, edit, create)
2. Connect to backend API via shared api-client
3. Implement state management (Zustand)
4. Style with shared design system
5. Test E2E flow

**Key screens:**
- Tasks: List, Kanban, Calendar, Timeline views
- Calendar: Month/week/day views
- Habits: Daily tracker, streaks
- Health: Vitals, workouts, nutrition
- Finance: Transactions, budget tracker
- AI: Chat screen

**Success Criteria (per screen set):**
- [ ] Screens load and display data
- [ ] CRUD operations work (create, read, update, delete)
- [ ] Offline caching works (WatermelonDB)
- [ ] E2E test flow works

---

### Task 6.9: Navigation & Tabs

**Steps:**
1. Set up 5-tab navigation (Tasks, Calendar, AI, Finance, Settings)
2. Create ScreenHeader component (shared)
3. Test tab switching and data persistence

**Success Criteria:**
- [ ] 5 tabs visible at bottom
- [ ] Tab switching works
- [ ] Data persists when switching tabs

---

### Task 6.10: Mobile Testing & Commit

**Steps:**
1. Run unit tests: `pnpm test`
2. Build for iOS: `eas build --platform ios --profile preview`
3. Build for Android: `eas build --platform android --profile preview`
4. Test on real device or simulator
5. Commit: `git commit -m "feat(mobile): complete mobile app with all modules"`

**Success Criteria:**
- [ ] Unit tests pass
- [ ] iOS build succeeds
- [ ] Android build succeeds
- [ ] App runs on simulator/device
- [ ] No console errors

---

## Section 7: Web App (Next.js)

### Task 7.1-7.5: Web App (Mirror Mobile)

Same structure as mobile, but Next.js instead of React Native.

**Key differences:**
- No biometric auth (use WebAuthn instead, future)
- Server-side rendering (SSR)
- Responsive layout (desktop-first)
- Auth redirects

**Steps (mirror tasks 6.1-6.10):**
1. Scaffold Next.js project
2. Create auth pages
3. Create module screens (Dashboard, Tasks, Finance, AI, etc.)
4. Implement navigation (sidebar)
5. Connect to backend API
6. Test & commit

**Success Criteria:**
- [ ] `npm run dev` runs without errors
- [ ] Pages load and display data
- [ ] API calls work
- [ ] All CRUD operations functional

---

## Section 8: Desktop App (Tauri)

### Task 8.1-8.4: Desktop App (Smaller scope than Web)

**Steps:**
1. Scaffold Tauri project
2. Embed web UI (reuse Next.js components)
3. Add Tauri-specific features (system tray, file dialogs)
4. Test on macOS/Windows
5. Commit

**Success Criteria:**
- [ ] Tauri build succeeds
- [ ] App runs on macOS
- [ ] App runs on Windows
- [ ] System tray works

---

## Section 9: Deployment

### Task 9.1: VPS Docker Setup

**Prerequisites:** All services built & tested

**On VPS (Hostinger):**
1. SSH in
2. Install Docker & Docker Compose
3. Clone repo
4. Set up `.env` with secrets
5. Run `docker-compose up -d`

**Success Criteria:**
- [ ] All containers running on VPS
- [ ] Health checks pass
- [ ] Can curl endpoints from outside VPS

---

### Task 9.2: GitHub Actions Deployment

**Steps:**
1. Set up GitHub secrets (VPS credentials)
2. Trigger deploy on main merge
3. Verify CI/CD runs

**Success Criteria:**
- [ ] GitHub Actions shows deploy workflow
- [ ] Merge to main auto-deploys
- [ ] No manual intervention needed

---

## Testing Summary

**Unit tests:** >80% coverage on all services  
**Integration tests:** Major workflows (auth, crud, events)  
**E2E tests:** Full flows on mobile/web  

**Run before each commit:**
```bash
# Backend
for service in services/*/; do
  cd "$service"
  mvn test
  cd - || return
done

# Frontend
pnpm test
```

---

## Commit Pattern

**After each task (or task section):**
```bash
git add <files>
git commit -m "feat(<layer>): <what>"
# Examples:
# feat(auth): implement user registration
# feat(tasks): add task recurring support
# test(core): add integration tests for goals
# docs(api): add endpoint documentation
```

**Push to trigger CI/CD:**
```bash
git push origin main
```

---

## Troubleshooting Guide

| Issue | Solution |
|-------|----------|
| Docker won't start | Check Docker Desktop, restart, `docker-compose down && up` |
| Port already in use | Kill process on port (e.g., `lsof -i :8001`), or change port in docker-compose |
| Flyway migration fails | Check schema name matches, no duplicate migrations, data consistency |
| Tests fail | Check DB running, environment variables set, test data cleanup |
| Mobile build fails | Run `pnpm install`, clear cache, check Xcode/Android SDK versions |
| API call returns 401 | JWT expired, refresh token, check token storage |

---

## When to Ask Me

**DO ask me if:**
- Unclear about architecture (e.g., "Should Service X call Service Y?")
- API design decision (e.g., "How should pagination work?")
- Data model question (e.g., "How do I model this relationship?")
- Stuck on a problem (after debugging 30+ min)
- Want code review feedback
- Deployment issues

**DON'T ask me if:**
- Clear from this guide (check it first!)
- You can find answer in ARCHITECTURE.md or BUILD_PLAN.md
- Straightforward implementation (tests fail → debug test)
- Docker/npm issues (search StackOverflow)

---

**Follow this guide end-to-end. You've got this!**

Trust the process, commit frequently, write tests, keep moving.

