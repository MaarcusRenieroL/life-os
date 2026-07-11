# Development Workflow

**Communication, Git discipline, code review, deployment.**

---

## Git Strategy

### Branch Naming

```
feat(mobile): add task kanban view
fix(backend): handle null dueDate in tasks query
refactor(auth): simplify token refresh logic
docs: update architecture diagram
test(core): add integration tests for goals
ci: update github actions workflow
```

**Prefixes:**
- `feat` — new feature
- `fix` — bug fix
- `refactor` — code restructure (no behavior change)
- `docs` — documentation
- `test` — tests
- `ci` — CI/CD updates
- `chore` — dependencies, tooling

**Branch names:** `<type>/<description>`
- ✓ `feat/task-kanban`
- ✓ `fix/token-null-check`
- ✓ `docs/add-api-spec`
- ✗ `my-feature` (too vague)
- ✗ `WIP` (no context)

### Commit Messages

**Format:**
```
<type>(<scope>): <subject>

<body>

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
```

**Subject (50 chars max):**
- Imperative mood ("add" not "adds" or "added")
- No period at end
- Lowercase

**Body (optional, wrap 72 chars):**
- Explain *why*, not *what*
- Reference related issues/PRs

**Examples:**

```
feat(tasks): add recurring task support with RRULE

Implement iCal RRULE parsing for tasks. Users can now set daily/weekly/
custom recurrence patterns. Next occurrence auto-created on completion.

Closes #42
```

```
fix(auth): handle expired refresh token gracefully

Refresh token expiration now clears stored tokens and redirects to login,
instead of throwing unhandled exception. Improves mobile UX on token
rotation edge case.
```

```
test(core): add integration tests for finance budgets

Added testcontainers-based tests for budget CRUD operations with real
PostgreSQL. Verifies auto-calculation of spent amount and alerts.
```

### Pull Request Workflow

1. **Create branch** (from `main`)
   ```bash
   git checkout -b feat/task-kanban
   ```

2. **Make changes** (code + tests)
   ```bash
   git add <files>
   git commit -m "feat(mobile): ..."
   ```

3. **Keep updated** (rebase on main if main changes)
   ```bash
   git fetch origin
   git rebase origin/main
   ```

4. **Push to GitHub**
   ```bash
   git push origin feat/task-kanban
   ```

5. **Create PR** (via GitHub CLI or web)
   ```bash
   gh pr create --title "Add task kanban view" --body "..." --draft
   ```

6. **Address feedback** (push updates to same branch)
   ```bash
   git commit -m "fix: address review feedback"
   git push
   # PR auto-updates
   ```

7. **Merge** (when CI passes + approved)
   ```bash
   gh pr merge --squash
   ```

### Commit Granularity

**Per layer, not per file:**
- ✓ One commit: "feat(auth): add login endpoint" (service layer only)
- ✓ One commit: "feat(mobile): add login screen" (UI layer only)
- ✗ One commit: "feat: add login everywhere" (multiple layers)

**Example workflow for one feature:**
```
commit 1: feat(auth): add user registration + password hashing
commit 2: test(auth): add unit + integration tests for registration
commit 3: feat(mobile): add registration screen
commit 4: test(mobile): add E2E test for registration flow
commit 5: docs: add registration API to spec
```

**Not:**
```
commit 1: feat: add registration (backend + mobile mixed)
```

---

## Code Review Checklist

### Before PR:
- [ ] Follows commit message format
- [ ] All tests pass locally
- [ ] No console.log() or debug code
- [ ] No large commented-out blocks
- [ ] No hard-coded credentials/secrets

### During PR review:
- [ ] Does it solve the stated problem?
- [ ] Are edge cases handled?
- [ ] Is error handling clear?
- [ ] Are tests meaningful (not just coverage)?
- [ ] Code is readable (clear names, not over-commented)
- [ ] No unnecessary refactoring mixed in
- [ ] Follows existing patterns in codebase

### After approval:
- [ ] CI/CD passes
- [ ] Squash merge to main (unless multiple semantic commits needed)
- [ ] Delete branch

---

## Testing Requirements

### Unit Tests

**Minimum:** 80% code coverage (measured via JaCoCo for Java)

**What to test:**
- Business logic (calculations, validation)
- Edge cases (null, empty, boundary values)
- Error paths (exceptions, invalid input)

**What NOT to test:**
- Getters/setters (trivial, trust compiler)
- Framework features (Spring, JPA — trust the framework)
- External API calls (mock them)

**Example:**
```java
@Test
void testTaskStreakCalculation_consecutiveDays() {
  // Given
  task.addLog("2026-07-10", true); // completed
  task.addLog("2026-07-11", true); // completed
  task.addLog("2026-07-12", false); // missed

  // When
  int streak = task.getCurrentStreak();

  // Then
  assertEquals(0, streak); // streak resets on miss
}
```

### Integration Tests

**Minimum:** Major workflows (auth flow, task creation + retrieval, etc.)

**Use:** Testcontainers for real database

**Example:**
```java
@Testcontainers
@DataJpaTest
class TaskRepositoryTests {
  @Container
  static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>(...);

  @Test
  void testFindByUserIdAndStatus() {
    // Given
    taskRepository.save(new Task(userId, "Task 1", DONE));
    taskRepository.save(new Task(userId, "Task 2", TODO));

    // When
    List<Task> tasks = taskRepository.findByUserIdAndStatus(userId, TODO);

    // Then
    assertEquals(1, tasks.size());
  }
}
```

### E2E Tests

**Later phase** (when UI exists). Use Playwright for mobile/web.

---

## CI/CD Pipeline

### GitHub Actions (`.github/workflows/ci.yml`)

**On every push:**
```
1. Lint (spotless, checkstyle)
2. Compile (Maven/Gradle)
3. Unit tests (JUnit + coverage)
4. Integration tests (testcontainers)
5. Build Docker images
6. Push to registry (future)
```

**On PR merge to main:**
```
1. Run all above
2. Deploy to staging (VPS)
3. Run smoke tests
4. Send notification (Slack, email)
```

**On manual trigger (release):**
```
1. Build release Docker images
2. Tag with version
3. Deploy to production
4. Run health checks
```

---

## Deployment Process

### Local Development

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Restart a service
docker-compose restart auth

# Tear down
docker-compose down
```

### VPS Deployment (Manual)

```bash
# SSH to VPS
ssh user@vps.example.com

# Pull latest code
cd /app/life-os
git pull origin main

# Rebuild services
docker-compose build

# Start/restart
docker-compose up -d

# Check health
curl http://localhost/v1/auth/health
```

### VPS Deployment (Via CI/CD)

GitHub Actions (after PR merge):
```
1. Build Docker images
2. Push to registry
3. SSH to VPS, trigger deployment script
4. docker-compose pull && docker-compose up -d
```

---

## Communication Protocol

### Blocker / Need Help

- Create an issue on GitHub (describe problem + attempts)
- Or: Direct message (for sensitive issues)

### Code Review Feedback

- **Request changes:** "This needs X. See [link]. Can you update?"
- **Suggest:** "Consider using X instead of Y for clarity"
- **Approve:** "Looks good, approved"

### Deployment Status

- Green: Merge any time
- Red: Fix before merging
- Orange: In progress, wait for green

---

## Local Development Setup

### Prerequisites
```bash
# Install Docker Desktop
# Install git
# Install pnpm (npm install -g pnpm)
```

### First Time

```bash
# Clone repo
git clone <repo> life-os
cd life-os

# Install dependencies
pnpm install

# Start services
docker-compose up -d

# Check status
docker ps
```

### Daily Development

```bash
# Create feature branch
git checkout -b feat/my-feature

# Make changes in services/{auth,vault,job-tracker,core}/

# Run tests
cd services/core
mvn test

# Commit
git commit -m "feat(core): ..."

# Push
git push origin feat/my-feature

# Create PR on GitHub
gh pr create
```

---

## Documentation

### Update When:
- Adding new module (create module doc)
- Changing API contract (update API spec)
- Changing architecture (update architecture doc)
- Adding deployment step (update deployment guide)

### Where:
- `/docs/*.md` — Reference documentation
- Inline code comments — Only *why*, not *what*
- API spec — OpenAPI/Swagger

---

**Next:** Read SETUP_GUIDE.md to understand directory structure and how to initialize from scratch.
