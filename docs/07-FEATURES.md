# Life OS — features, what exists and what's next

Legend: ✅ built · 🆕 new in this overhaul · 🔧 built but flawed (see the finance/email audits) · 💡 proposed

---

## 1. The game layer 🆕

Life OS now plays like a game. **Nothing is stored** — XP, level, rank, streak and attributes are
worked out from what the modules already record, so they can't drift or be cheated and they're
retroactive from day one. (`features/player/player-model.ts`, unit-tested.)

| Thing | How it works |
|---|---|
| **XP** | Task done +15 · workout +50 · habits (share of scheduled done, max) +40/day · a mood/reflection logged +10 |
| **Level** | Cumulative XP to reach level L is `50·L·(L−1)` → L2 100 · L5 1,000 · L10 4,500 · L20 19,000 |
| **Rank** | E Rookie (1–4) · D Apprentice (5–9) · C Adventurer (10–17) · B Veteran (18–27) · A Elite (28–40) · S Legend (41+). Each rank owns a colour |
| **Streak** | Consecutive days with any XP. Today gets a grace so the streak doesn't read 0 every morning |
| **Attributes** (7, 0–100, per week) | STR workouts vs 3 · DIS habit consistency · FOC focus hours vs 10 · EXE tasks done vs due · MND journal entries (4 = full) · WLT share of income kept · CAR applications + interviews. No data → shown as "—", never a fake zero |
| **Quests** | Today's items from every module. **Main** (overdue, urgent, bills, interviews) · **Daily** (habits, due today) · **Side** (coming up). Each pays XP; tasks and habits are completed in place |
| **Boss fights** | Each active goal is a boss whose HP drains as progress rises, with an on-pace / falling-behind flag |
| **Level-up** | Full-screen celebration when your level rises (remembered per browser, never on first visit) |

Screens: **Home = Command Center** (status, XP bar, streak, radar, today's quests, weekly report,
stats, boss fights, alerts, activity log, portals to every module) · **Today = Quest Board**
(progress ring, tiers, in-place completion with XP pop) · header **player chip** on every page ·
**title-screen login** · HUD design system (corner-bracket panels, glow, grid backdrop, display
font, animated XP bars) applied to every existing card and section heading.

---

## 2. Core platform

- ✅ Auth: email/password, rotating refresh tokens, per-device sessions
- ✅ Notifications bell with unread count, read/all-read, **AI-fallback approval** (asks before spending on Claude)
- ✅ **Quick capture**: one line of text → routed by the local model to finance / job / note
- ✅ Module on/off settings and per-module user settings
- ✅ Audit log of security-relevant events, with retention
- ✅ Data management: encrypted backups, export
- ✅ Keyboard shortcuts help dialog
- ✅ Cross-module **Today** aggregation (a module that's down just contributes nothing)
- ✅ **Analytics**: overview, weekly, monthly, trends, insights (correlations), anomalies, goal progress
- ✅ **Automation rules**: triggers (on create / complete / update, scheduled, threshold) → actions (create task or event, notify, link items, update status, generate report), with templates and execution history
- 🆕 **Email hub**: inbox → tasks, bills ("Pay X"), calendar events, subscriptions; approve / dismiss / undo; local model only unless enabled; sidebar badge for items awaiting your OK
- 🔧 Gmail bank-alert import (HDFC, Canara) — only UPI-shaped alerts; see finance audit

## 3. Modules

### Tasks ✅
Today · Upcoming · List · Board (kanban) · Completed · Analytics. Priorities, due date/time,
subtasks, recurring tasks (with pause/resume), snooze, duplicate, bulk edit,
reminders, overdue sweep, Pomodoro-style time tracking, areas/projects/goals pickers, estimates.
🆕 shared reminder picker.

### Calendar ✅
Month · Week · Day · Agenda. Recurring events, drag-to-reschedule on an hour grid, free-slot
finder, time-utilization by category/area, reminders, ICS export, interviews auto-linked from the
job tracker, bridges to tasks, notes and habits.

### Habits ✅
Today · list · weekly grid · calendar heatmap · per-habit detail. Custom frequency, streaks
(current/longest), consistency scores, reminders, milestone badges (3/7/14/30/60/100/365 days),
analytics, logging-time patterns, CSV export.

### Goals ✅
Goals with milestones, metrics (with logged entries), linked tasks/habits/workouts, timeline
view, periodic reviews, progress auto-calculated from links, cross-module overview.

### Notes & Journal ✅
Markdown notes, folders, tags, backlinks and a link **graph**, templates, attachments, full-text
search, note types, module links. **Journal** entries with mood, energy, prompts and goal links.

### Workouts ✅
Routines and starter templates, exercise library, **live session logging** (sets, reps, weight),
personal records, body measurements, analytics, scheduled sessions.

### Finance 🔧
Dashboard · transactions · **subscriptions** (billing cycles, renewal reminders, unused/high-cost
flags, pattern promotion) · budgets · analytics · report (tax-year CSV, PDF) · import (Gmail alerts,
CSV, PDF statements) · rules · accounts · categories · merchants · recurring detection.
See the audit for what's wrong: balances are a stored running number, budgets read a Redis counter,
transfers aren't modelled, salary isn't tied to a pay cycle.

### Password manager ✅
Vault entries, password-health (weak / reused / old), payment cards, security settings, audit log,
data backup. Encrypted at rest.

### Job tracker ✅ / 🆕
Dashboard · Jobs (🆕 responsive table/cards) · 🆕 **Openings** (watch company career boards on
Greenhouse, Ashby, Lever, Workable, Workday, Oracle; daily diff; free skill-match scoring; promote to
pipeline) · Add a job (from link or pasted text) · Resume & career profile · Analytics.
Per job: status pipeline with history, fit score and breakdown, 🆕 **ATS suggestions load
automatically**, cover letter, interviews (auto-added to calendar), 🆕 **referral message card**
(copy-ready, addressed to someone you know) and 🆕 **people you know at the company**, follow-up
dates, offer tracking, email events. 🆕 Applications made elsewhere are created from confirmation
emails. 🗑 Referral contact tracking removed.

### Analytics ✅
See §2.

---

## 4. Known gaps (from the audits)

**Finance integrity** — balance is stored, not derived; no opening-balance concept; transfers move
nothing; merged duplicates still counted; budgets use a Redis counter (volatile, add-only, misses
manually-categorized spend); reports/analytics include duplicates and disputed rows; monthly trends
group in UTC, everything else in IST; salary and other credits treated as recurring bills;
PDF/CSV export injection; `$` shown for rupees.

**Imports** — unparseable / unmatched bank alerts are dropped silently; Kafka sends not awaited
(bank alerts); cross-source duplicates (alert + statement) both counted; alert parsers don't accept
thousands separators or NEFT/ACH salary credits.

**Security** — default JWT secret, internal API key and encryption key are committed; nginx exposes
`/internal/` paths; must be fixed before any public exposure.

**Reliability** — Kafka in Docker drops connections; `OLLAMA_URL` in `.env` points at `localhost`
(unreachable from containers).

---

## 5. Proposed 💡 (S small · M medium · L large)

### Make it more of a game
- **Persistent XP ledger + achievements** (M) — badges (First 100 tasks, 30-day streak, Sub-₹X month…), reusing the habit milestone badges
- **Rewards shop** (M) — define real-world rewards ("movie night = 500 XP"), spend XP on them
- **Weekly raids** (M) — a Sunday-to-Sunday boss with a shared HP pool fed by all modules; loot on victory
- **Streak freezes** (S) — earn a token to protect a streak on a bad day
- **Unlockable themes & avatar** (M) — colourways unlocked by rank; HUD frame per rank
- **Skill trees** (L) — spend attribute points; e.g. Focus unlocks deep-work timers
- **Seasons** (S) — quarterly reset of a leaderboard against your past self
- **Sound + haptics + reduced-motion toggle** (S) — clear, level-up, streak chimes

### Productivity
- **Morning briefing & evening shutdown rituals** (M) — guided, XP-rewarded daily start/finish
- **Weekly review wizard** (M) — pulls wins, slips, next week's top 3 from every module
- **Global search (⌘K)** across tasks, notes, jobs, finance (L)
- **Focus mode** (S) — one task, a timer, everything else dimmed; XP on completion
- **Smart scheduling** (L) — drop tasks into free calendar slots by energy and estimate
- **AI coach / planner** (L) — the vision's Chat/Coach/Planner modes over your real data
- **Reply-needed reminders & follow-ups** from email (M); package/travel tracking (S)
- **Relationships (mini-CRM)** (M) — birthdays, "haven't spoken in 60 days", referral contacts
- **Projects module** (L), **Learning** (M), **Health / Nutrition** (L), **Documents** (M), **Memory / second brain** (L) — all in the original vision, all disabled placeholders today

### Finance
- Derived balances + opening balance, real transfers, pay-cycle budgeting ("salary lands → next month's spend"), budgets from transactions, import-failure inbox, net worth, safe-to-spend today (all from the audit)

### Platform
- **Desktop app** (Tauri) wrapping the web UI, with tray quick-capture and global shortcut (M)
- **Mobile app** (Expo) with push notifications and an installable APK (L)
- **Public access** through a Cloudflare Tunnel at life-os.maarcus.dev with Cloudflare Access in front, `/internal/` blocked, real secrets (S–M)
- **`/files/apk` download path** served by nginx (S)
- Offline support & background sync (L); Google Calendar two-way sync (L)
