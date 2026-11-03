# SDD Plan — Achievement System (V1.x)

**Date:** 2026-11-03  
**Phase:** V1.x — Engagement Loop  
**Expected Duration:** 2-3 weeks (5 tasks, ~3-4 days per task)  
**Success Metric:** Achievement unlock logic working end-to-end + 15+ seed achievements

---

## 📋 Overview

The **Achievement System** is the first major feature expansion beyond MVP. Achievements are data-driven templates that unlock automatically when users hit milestones (complete 1st task, reach 7-day streak, level 10, zero infestation 3 days).

### Why Achievements?
- **Retention:** Users stay 10-15% longer when achievements unlock (behavioral psychology: variable rewards)
- **Extensibility:** New achievements = 1 DB INSERT, no code changes
- **Gamification depth:** Dopamine hits from unlocking badges

### Architecture Decision
- **Models:** `Achievement` (templates) + `UserAchievement` (logs)
- **Condition engine:** JSON-based (flexible, no subtables)
- **Service:** `check_and_unlock_achievements(user)` called on every task completion
- **API:** Read-only endpoints for frontend to display unlocked achievements
- **Frontend:** Simple badge list, triggers toast notification on unlock

---

## 🎯 Goals

1. **Core system working:** Models, service, API functional
2. **15+ achievements seeded:** Mix of categories (task, streak, level, infestation)
3. **Frontend display:** Achievement badges render + unlock toast
4. **Data-driven:** Adding new achievement = 1 SQL INSERT (no migration needed)
5. **No regressions:** MVP features still work, build stays green

---

## 📐 Architecture

### Data Model

```
Achievement (template)
├── code (unique: "first_task", "streak_7", etc)
├── name, description, icon (emoji)
├── category (task, streak, level, infestation)
├── condition (JSON: {"type": "task_completed_count", "value": 1})
├── reward_xp (bonus XP on unlock)
└── order, active, timestamps

UserAchievement (log)
├── user (FK)
├── achievement (FK)
├── unlocked_at
└── seen (notification read?)
```

### Condition Types (Extensible)

```json
// Task-based
{"type": "task_completed_count", "value": 1}      // first_task
{"type": "task_completed_count", "value": 50}     // task_master

// Streak-based
{"type": "streak_reached", "value": 7}            // week_warrior
{"type": "streak_reached", "value": 30}           // consistency_king

// Level-based
{"type": "level_reached", "value": 10}            // level_10
{"type": "level_reached", "value": 25}            // level_25

// Infestation-based
{"type": "zero_infestation_days", "value": 3}    // clean_sweep
{"type": "zero_infestation_days", "value": 7}    // spotless_week
```

### Call Flow

```
Task.complete() → check_and_unlock_achievements(user) → UserAchievement.create() → WebSocket/Toast notification
```

---

## 📅 Task Breakdown

### Task 1: Backend Models + Migrations (3-4 days)
**Deliverables:**
- [ ] `gamification/models.py` — `Achievement` + `UserAchievement` models
- [ ] Migration files created
- [ ] Django admin registered
- [ ] SQL indexes added (code, user+achievement unique together)

**Files modified:**
- `backend/gamification/models.py` (create/modify)
- `backend/gamification/admin.py` (register models)

**Verification:**
```bash
python manage.py makemigrations
python manage.py migrate
python manage.py test gamification.tests.TestAchievementModel
```

---

### Task 2: Backend Service + Condition Engine (3-4 days)
**Deliverables:**
- [ ] `gamification/services.py` — `check_and_unlock_achievements(user)` function
- [ ] Condition evaluators for each type (task_completed_count, streak_reached, etc)
- [ ] Helper to fetch user stats (completed tasks, current streak, level, infestation days)
- [ ] Integration hook in `tasks/views.py` on task completion

**Files modified:**
- `backend/gamification/services.py` (create)
- `backend/tasks/views.py` (add service call)
- `backend/gamification/tests/test_services.py` (unit tests)

**Verification:**
```bash
python manage.py test gamification.tests.TestAchievementUnlock
# Should cover all condition types
```

---

### Task 3: API Endpoints + Serializers (2-3 days)
**Deliverables:**
- [ ] `gamification/serializers.py` — `AchievementSerializer`, `UserAchievementSerializer`
- [ ] `gamification/views.py` — `AchievementListView`, `UserAchievementListView`
- [ ] URL routing in `no_rats/urls.py`
- [ ] Endpoints:
  - `GET /api/achievements/` — list all active achievements (template library)
  - `GET /api/user/achievements/` — list unlocked achievements for current user
  - `POST /api/user/achievements/{id}/seen/` — mark as seen (for toast dismissal)

**Files modified:**
- `backend/gamification/serializers.py` (create)
- `backend/gamification/views.py` (create/modify)
- `backend/no_rats/urls.py` (add routes)

**Verification:**
```bash
curl http://localhost:8000/api/achievements/
curl http://localhost:8000/api/user/achievements/
```

---

### Task 4: Frontend Display + Toast Integration (3-4 days)
**Deliverables:**
- [ ] New component `AchievementBadge.jsx` — single badge display
- [ ] New component `AchievementsList.jsx` — grid of user's unlocked achievements
- [ ] Integration in `Dashboard.jsx` — show recent unlocked achievements
- [ ] Integration with `useToast()` hook — trigger toast on unlock
- [ ] Fetch `/api/user/achievements/` on mount, poll for new unlocks
- [ ] Mark achievements as "seen" when toast dismissed

**Files modified:**
- `frontend/src/components/AchievementBadge.jsx` (create)
- `frontend/src/components/AchievementsList.jsx` (create)
- `frontend/src/components/Dashboard.jsx` (modify to show achievements)
- `frontend/src/hooks/useAchievements.js` (create, API calls)

**Verification:**
```bash
npm run dev
# Navigate to dashboard, complete a task
# Should see achievement toast + badge in list
```

---

### Task 5: Seed Data + Testing (2-3 days)
**Deliverables:**
- [ ] Django management command `load_achievements` — populates DB with 15+ achievements
- [ ] Achievement list:
  - first_task (complete 1)
  - task_master (complete 50)
  - week_warrior (streak 7)
  - consistency_king (streak 30)
  - level_10 (reach level 10)
  - level_25 (reach level 25)
  - clean_sweep (zero infestation 3 days)
  - spotless_week (zero infestation 7 days)
  - + 7 more (house categories, speed challenges, etc)
- [ ] End-to-end test: Create user → Complete task → Verify achievement unlocks
- [ ] Idempotent command (safe to run multiple times)

**Files modified:**
- `backend/gamification/management/commands/load_achievements.py` (create)
- `backend/gamification/tests/test_e2e_achievement.py` (create)

**Verification:**
```bash
python manage.py load_achievements
python manage.py test gamification.tests.TestE2EAchievementUnlock
```

---

## 🏗️ Implementation Notes

### Common Pitfalls to Avoid
- **N+1 queries:** Pre-fetch related achievements in list endpoint
- **Race conditions:** Use `get_or_create()` on UserAchievement to avoid duplicates
- **Stat freshness:** Cache user stats (level, streak) in `User` model, update on task completion
- **Toast spam:** Batch unlock notifications, show max 1 toast per session

### Data Migrations Strategy
- Task 1: Migrations created, not applied until Task 5 (seeds depend on models)
- Task 5: Run `load_achievements` after migrations
- Safe to add more achievements later without code changes

### Frontend UX
- Show achievements in a collapsible section (Dashboard bottom)
- Unlock toast: "🏆 Achievement Unlocked: Week Warrior!"
- Badge shows: icon + name + "Unlocked: 2 days ago"
- Click badge to see description + reward XP

---

## 📊 Success Criteria

| Criterion | Target | Verification |
|-----------|--------|---------------|
| Models created | Achievement + UserAchievement | `python manage.py test` passes |
| Unlock logic works | All condition types evaluated correctly | Service unit tests 100% coverage |
| API endpoints | 3 endpoints working | curl tests pass |
| Frontend display | Achievements render without errors | npm run build + visual test |
| Seed data | 15+ achievements in DB | `python manage.py shell` query count |
| Build green | npm + Django test suite | CI/CD passes |
| No regressions | MVP features still work | Manual test: login → create task → complete → check achievements |

---

## 📈 Metrics to Track

- **Unlock rate:** % of users who unlock ≥1 achievement in first 7 days (target: 70%)
- **Average unlocks:** Mean # of achievements per user (target: 5 by day 30)
- **Retention impact:** D30 retention with achievements vs without (target: +5pp)

---

## 🚀 Next Steps After V1.x

- **Push notifications:** "You unlocked an achievement! 🏆"
- **Achievement leaderboard:** "Who has the most rare achievements?"
- **Mini-challenges:** "Complete 5 tasks today for a bonus"
- **Rarity levels:** Common, Rare, Epic, Legendary

---

## Files Checklist

- [ ] `.superpowers/sdd/task-1-brief.md` — Models + migrations
- [ ] `.superpowers/sdd/task-2-brief.md` — Service + conditions
- [ ] `.superpowers/sdd/task-3-brief.md` — API endpoints
- [ ] `.superpowers/sdd/task-4-brief.md` — Frontend display
- [ ] `.superpowers/sdd/task-5-brief.md` — Seed data + testing
- [ ] `.superpowers/sdd/progress.md` — Updated during implementation

---

**Status:** 🟡 Planning complete, ready for Task 1 Brief  
**Author:** Claude Haiku  
**Approval:** Pending first task completion
