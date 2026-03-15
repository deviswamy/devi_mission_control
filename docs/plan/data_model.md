# Data Model — Mission Control MVP

Based on research into NASA and ESA crew/mission structures.

---

## Entity Model

---

### `organizations`
| Field | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `name` | string | |
| `slug` | string | unique, for tenant routing |
| `created_at` | timestamp | |

---

### `users`
| Field | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `org_id` | UUID | FK → organizations |
| `auth0_id` | string | unique, from Auth0 |
| `name` | string | |
| `email` | string | |
| `role` | enum | `director`, `mission_lead`, `crew_member` |
| `created_at` | timestamp | |

---

### `skills`
| Field | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `org_id` | UUID | FK → organizations |
| `name` | string | e.g. "EVA Operations" |
| `description` | string | |
| `category` | enum | `technical` (MVP only) |

---

### `skill_proficiency_levels`
Org-configured scale (e.g. 1=Awareness … 5=Expert)

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `org_id` | UUID | FK → organizations |
| `level` | integer | starts at 1, mandatory |
| `label` | string | e.g. "Awareness", "Expert" |
| `description` | string | what this level means |

Unique constraint on `(org_id, level)`.

---

### `crew_skills`
A crew member's proficiency in a skill.

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `user_id` | UUID | FK → users (role = crew_member) |
| `skill_id` | UUID | FK → skills |
| `proficiency_level` | integer | references `skill_proficiency_levels.level` for that org |

Unique constraint on `(user_id, skill_id)`.

---

### `missions`
| Field | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `org_id` | UUID | FK → organizations |
| `name` | string | |
| `objective` | text | |
| `start_date` | date | |
| `end_date` | date | |
| `phase` | enum | `draft`, `submitted`, `active`, `rejected`, `done` |
| `mission_lead_id` | UUID | FK → users (role = mission_lead) |
| `crew_required` | integer | number of crew members needed for the mission |
| `created_by` | UUID | FK → users |
| `created_at` | timestamp | |

Crew assigned starts empty — populated via `assignments`.

---

### `mission_skill_requirements`
Links a mission to the skills it requires, with a minimum proficiency level.

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `mission_id` | UUID | FK → missions |
| `skill_id` | UUID | FK → skills |
| `min_proficiency_level` | integer | references `skill_proficiency_levels.level` for that org |
| `weight` | integer | relative importance of this skill for the mission (e.g. 1–10) |

Unique constraint on `(mission_id, skill_id)`.

- Set by the mission lead during mission planning (Draft phase)
- Used by the auto-matcher to filter eligible crew: crew must have `crew_skills.proficiency_level >= min_proficiency_level` for each required skill

---

### `assignments`
1-to-many: one mission → many crew members.

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `mission_id` | UUID | FK → missions |
| `crew_member_id` | UUID | FK → users (role = crew_member) |
| `assigned_at` | timestamp | |
| `status` | enum | `active`, `completed`, `rejected` |

Unique constraint on `(mission_id, crew_member_id)`.
- When mission → `done`: status → `completed` (retained as history)
- When mission → `rejected`: status → `rejected`, crew unavailability cleared

---

## Relationships Summary

```
organizations
  ├── users (org_id)
  ├── skills (org_id)
  ├── skill_proficiency_levels (org_id)
  └── missions (org_id)
        ├── mission_lead_id → users
        ├── mission_skill_requirements → skills
        └── assignments
              └── crew_member_id → users
                    ├── crew_skills → skills
                    └── crew_unavailability
```

---

## Key Design Decisions

- **Tenant isolation**: every table has `org_id` — no cross-org data leakage
- **Proficiency scale is org-configurable** — not hardcoded, so NASA's 4-level and ESA's 6-level both work
- **Assignment history** is preserved via `status = completed` — no need for a separate "last assigned" table; query assignments where `status = completed`
- **Mission lead constraint** enforced at app layer: mission lead cannot approve their own mission
- **Skill requirements are per-mission**: `mission_skill_requirements` is set during Draft phase by the mission lead; the auto-matcher uses it to filter crew by `proficiency_level >= min_proficiency_level` and ranks candidates using `weight` to score how well a crew member's skills match mission priorities
- **`crew_required` drives staffing tracking and auto-matching**: set by the mission lead during Draft alongside skill requirements. The auto-matcher uses it to know how many eligible crew to select. The assignments view can surface progress (e.g. 3 of 5 assigned) by comparing active assignment count against this target.

---

## Research References

- NASA APPEL 4-level proficiency: Participate → Apply → Manage → Guide
- ESA 6 core behavioral competencies + technical competencies per role
- Space Skills Alliance SpaceCRAFT taxonomy: ~250 competencies, 5-level scale (1=Awareness … 5=Expert)
- NASA mission lifecycle: Pre-A → A → B → C → D → E → F (governed by NPR 7120.5)
- ESA mission lifecycle: Phase 0 → A → B → C → D → E → F (ECSS standard)
- Typical crew pool: 20–50 members per org; 5–20 concurrent missions; 2–7 crew per mission
