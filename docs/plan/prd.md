# Mission Control — Product Requirements Document (MVP)

**Version:** 1.0
**Date:** 2026-03-13
**Scope:** MVP — multi-tenant crew assignment platform for space organisations

---

## 1. Product Overview

Mission Control is a multi-tenant B2B SaaS platform for space organisations to manage crew assignments to missions, build skill profiles for crew members, manage the mission lifecycle, and auto-match crew to missions.

### Personas

| Persona | Key Need |
|---|---|
| **Director** | Full org visibility, approve/reject missions, manage settings, monitor crew utilisation |
| **Mission Lead** | Plan missions, define skill requirements, run auto-matcher, submit for approval |
| **Crew Member** | Maintain their skill profile, view assigned missions |

---

## 2. Assumptions

- A Mission Lead is not a crew member and cannot be assigned to a mission as crew. Roles are mutually exclusive at the platform level.

---

## 3. Functional Requirements

### FR-1: Multi-Tenant Auth & Onboarding
- Users authenticate via Auth0
- data is seeded, so skip signup. For login, org name/slug is entered, role is determined from database.
- All data is scoped to an `org_id`; no data leaks across tenants
- A user belongs to exactly one organisation

### FR-2: Role-Based Access Control
- **Director**: full org visibility, approve/reject missions, mark active missions as done, access dashboard
- **Mission Lead**: create/edit/submit own missions, define skill requirements, run auto-matcher, assign recommended crew; can only view missions they created/lead; cannot approve their own missions; cannot be assigned as crew
- **Crew Member**: manage own skill profile, view their assigned missions only

### FR-3: Skill & Proficiency Management
- Directors configure org-level skills (name, description, category = `technical` for MVP)
- Directors configure org-level proficiency scale (e.g. 1=Awareness…5=Expert)
- Unique constraint per org: `(org_id, level)` on proficiency levels
- Crew members add skills from the org catalogue to their profile with a proficiency level

### FR-4: Mission Lifecycle
- Mission states: `draft → submitted → active → rejected → done`
- **Mission Lead** actions:
  - Create mission (draft): name, objective, start/end date, crew_required, assign mission_lead
  - Edit mission in draft: all fields + skill requirements
  - Submit mission (draft → submitted)
- **Director** actions:
  - Approve (submitted → active)
  - Reject (submitted → rejected) with optional reason
  - Mark done (active → done) — triggers assignments → completed, unavailability cleared
- Constraint: mission lead cannot approve their own mission

### FR-5: Mission Skill Requirements
- Mission lead sets required skills + minimum proficiency level + weight (1–10) during Draft phase
- Unique per `(mission_id, skill_id)`
- Used by auto-matcher to filter and rank crew

### FR-6: Auto-Matching Engine
- Triggered by mission lead: `POST /api/missions/:missionId/match`
- **Step 1**: Validate mission has skill requirements (422 if none)
- **Step 2**: Filter unavailable crew (unavailability date overlap + active assignments on overlapping missions)
- **Step 3**: Filter by minimum proficiency for every required skill (missing skill = proficiency 0 = fail)
- **Step 4**: Score by weighted excess proficiency, rank top N (N = `crew_required`), ties included
- Response: ranked crew list with scores, normalised scores, ranks, and per-skill breakdowns
- Edge cases handled: empty candidates, fewer eligible than needed, tied scores, no requirements

### FR-7: Assignment Management
- Mission lead assigns crew from the auto-matcher results
- Assignment status: `active` → `completed` (on mission done) or `rejected` (on mission rejected)
- `crew_unavailability` updated on assignment; cleared on mission done/rejected
- Dashboard shows assignment progress: e.g. "3 of 5 crew assigned"
- History preserved: assignments retain `completed` or `rejected` status permanently

### FR-8: Director Dashboard
- **Mission pipeline**: count of missions per phase (draft / submitted / active / done / rejected)
- **Crew utilisation**: % of crew members currently on active assignments
- **Skill coverage gaps**: skills in org catalogue with fewest qualified crew (lowest headcount at min proficiency)
- **Recent activity feed**: timestamped log of key events (mission submitted, approved, rejected, done; crew assigned)

### FR-9: Crew Member View
- View list of missions they are assigned to (active and historical)
- View and manage own skill profile: add skills from org catalogue, set proficiency level, update or remove

---

## 4. Non-Functional Requirements

| ID | Requirement |
|---|---|
| NFR-1 | **Tenant isolation**: every DB query scoped to `org_id`; no cross-tenant data access possible |
| NFR-2 | **Performance**: API p95 response time < 500ms under normal load |
| NFR-3 | **Auth**: all endpoints require valid Auth0 JWT; role checked server-side |
| NFR-4 | **Validation**: all inputs validated via shared Zod schemas (frontend + backend) |
| NFR-5 | **Data integrity**: unique constraints and FK constraints enforced at DB layer (Drizzle + Postgres) |

---

## 5. Features & User Stories

### Feature 1: Authentication & Onboarding

**US-1.1** As a new user, I can sign up and log in via Auth0 so that my identity is securely managed.
*Acceptance*: Auth0 JWT validated on every API call; 401 on invalid/missing token.

**US-1.2** As a new user on first login, I self-select my role (director / mission lead / crew member) so that I am onboarded into the right context.
*Acceptance*: Role stored in `users.role`; user sees role-appropriate UI after selection.

**US-1.2a** As a new **director**, I enter my organisation's name during onboarding so that a new org is created and I am its first member.
*Acceptance*: `organizations` record created; director's `org_id` set to new org.

**US-1.2b** As a new **mission lead or crew member**, I select my organisation from a list of existing orgs during onboarding so that I am associated with the correct tenant.
*Acceptance*: User's `org_id` set to the selected existing org; no new org created.

**US-1.3** As any user, I am only shown and can only access data belonging to my own organisation so that tenant isolation is enforced.
*Acceptance*: All API queries include `WHERE org_id = :orgId`; no data from other orgs returned.

---

### Feature 2: Skill & Proficiency Configuration

**US-2.1** As a director, I can create org-level skills (name, description) so that crew and missions share a common skill catalogue.
*Acceptance*: Skill saved with `org_id`; visible to all users in the org.

**US-2.2** As a director, I can configure the org's proficiency scale (level number + label + description) so that skill ratings are meaningful and consistent.
*Acceptance*: Unique `(org_id, level)` enforced; scale shown wherever proficiency is displayed.

---

### Feature 3: Crew Profile Management

**US-3.1** As a crew member, I can add skills from the org catalogue to my profile and set my proficiency level so that my qualifications are visible to mission leads.
*Acceptance*: `crew_skills` record created; proficiency level validated against org's configured scale.

**US-3.2** As a crew member, I can update or remove skills from my profile so that my profile stays current.
*Acceptance*: Updated immediately; reflected in auto-matcher next run.

**US-3.3** As a crew member, I can view the list of missions I am assigned to (active and historical) so that I know my current and past commitments.
*Acceptance*: Returns assignments filtered by `crew_member_id = me`; shows mission name, dates, status.

---

### Feature 4: Mission Planning (Draft Phase)

**US-4.1** As a mission lead, I can create a new mission (name, objective, start/end date, crew_required) in Draft state so that I can begin planning.
*Acceptance*: Mission created with `phase = draft`, `mission_lead_id = me`, `org_id = myOrg`.

**US-4.2** As a mission lead, I can add skill requirements to a draft mission (skill, minimum proficiency, weight 1–10) so that the auto-matcher knows what crew qualifications are needed.
*Acceptance*: `mission_skill_requirements` records created; unique per `(mission_id, skill_id)`.

**US-4.3** As a mission lead, I can edit mission details and skill requirements while the mission is in Draft so that I can refine the plan before submission.
*Acceptance*: Edit blocked once mission is submitted; returns 403 on edit attempt post-draft.

**US-4.4** As a mission lead, I can only see missions I created or lead so that I am not distracted by other leads' work.
*Acceptance*: Mission list API filters by `mission_lead_id = me` for mission lead role.

---

### Feature 5: Mission Approval Workflow

**US-5.1** As a mission lead, I can submit a draft mission for director approval so that it enters the review queue.
*Acceptance*: Phase transitions `draft → submitted`; director sees it in their approval queue.

**US-5.2** As a director, I can view all submitted missions awaiting approval so that I can review and decide.
*Acceptance*: Returns all missions with `phase = submitted` in the org.

**US-5.3** As a director, I can approve a submitted mission so that it becomes active and crew assignments can be finalised.
*Acceptance*: Phase → `active`; mission lead notified (in-app state update).

**US-5.4** As a director, I can reject a submitted mission (with optional reason) so that the mission lead can revise it.
*Acceptance*: Phase → `rejected`; all active assignments → `rejected`; `crew_unavailability` records cleared.

**US-5.5** As a director, I cannot approve a mission that I am also the mission lead for so that conflicts of interest are prevented.
*Acceptance*: API returns 403 if `mission.mission_lead_id === requestingUserId`.

**US-5.6** As a director, I can mark an active mission as done so that it is closed out and history is preserved.
*Acceptance*: Phase → `done`; all active assignments → `completed`; `crew_unavailability` cleared.

---

### Feature 6: Auto-Matching Engine

**US-6.1** As a mission lead, I can run the auto-matcher on a draft or active mission so that the best-fit available crew are recommended.
*Acceptance*: `POST /api/missions/:missionId/match` returns ranked crew list within 500ms.

**US-6.2** As a mission lead, I can see each candidate's match score, rank, and per-skill breakdown so that I understand why each crew member was recommended.
*Acceptance*: Response includes `score`, `normalizedScore`, `rank`, `skillBreakdown[]` per candidate.

**US-6.3** As a mission lead, I see a clear message when there are no eligible crew so that I know to adjust requirements or crew skills.
*Acceptance*: 200 response with empty `results` array and explanatory `message`.

**US-6.4** As a mission lead, I can assign recommended crew members to the mission from the matcher results so that staffing is captured.
*Acceptance*: `assignments` record created with `status = active`; `crew_unavailability` updated.

---

### Feature 7: Director Dashboard

**US-7.1** As a director, I can see a mission pipeline breakdown (count per phase) so that I understand the current state of all missions.
*Acceptance*: Shows counts for draft / submitted / active / done / rejected; updates in real time.

**US-7.2** As a director, I can see crew utilisation (% of crew on active assignments) so that I can spot capacity constraints.
*Acceptance*: `(crew with ≥1 active assignment) / total crew members * 100`; displayed as %.

**US-7.3** As a director, I can see skill coverage gaps (skills with fewest qualified crew) so that I can prioritise training or hiring.
*Acceptance*: Lists org skills ordered by count of crew meeting minimum proficiency; shows count per skill.

**US-7.4** As a director, I can see a recent activity feed so that I have situational awareness of org events.
*Acceptance*: Chronological list of events: mission submitted/approved/rejected/done, crew assigned; each entry shows actor, action, target, and timestamp.

---

## 6. Out of Scope (MVP)

- Crew member ability to accept/reject assignments
- Crew member ability to set their own unavailability (managed by system on assignment)
- Mission lead visibility into other leads' missions
- Mission lead role being assignable as crew member
- Email/push notifications
- Skills categories beyond `technical`
- Audit log / compliance reporting
- WCAG accessibility compliance (deferred post-MVP)
- Self-service org creation / billing

---

## 7. Success Metrics

| Metric | Target | Measurement |
|---|---|---|
| **Mission approval cycle time** | Median < 24h from submitted → decision | Timestamp delta in `missions` |
| **Auto-matcher adoption** | ≥ 80% of active missions use matcher at least once | Count missions with ≥1 match run |
| **Crew utilisation visibility** | Directors can view utilisation within 2 clicks of login | UX acceptance test |
| **Skill profile completeness** | ≥ 70% of crew members have ≥ 3 skills on profile within 30 days of org onboarding | `crew_skills` count per user |
| **Tenant isolation** | Zero cross-tenant data incidents | Security review + integration test suite |
| **API performance** | p95 response time < 500ms across all endpoints | Load test results |
| **Onboarding completion** | ≥ 90% of invited users complete role selection + profile setup | Funnel analytics |

---

## 8. Data Model Reference

Entities: `organizations`, `users`, `skills`, `skill_proficiency_levels`, `crew_skills`, `crew_unavailability`, `missions`, `mission_skill_requirements`, `assignments`

Full schema: `docs/plan/data_model.md`
Auto-matcher algorithm: `docs/plan/auto-matcher.md`

---
