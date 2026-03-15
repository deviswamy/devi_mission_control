# System Architecture — Mission Control MVP

**Version:** 1.0
**Date:** 2026-03-13
**Author:** Architecture Review

---

## Table of Contents

1. [Overview](#1-overview)
2. [Tech Stack](#2-tech-stack)
3. [Data Model](#3-data-model)
4. [API Reference](#4-api-reference)
5. [Design Decisions](#5-design-decisions)
6. [Data Flow Diagrams](#6-data-flow-diagrams)
7. [Overall Architecture Diagram](#7-overall-architecture-diagram)

---

## 1. Overview

Mission Control is a **multi-tenant B2B SaaS platform** for space organisations. It manages crew assignments to missions by combining a structured mission lifecycle, a skill proficiency system, and an automated crew-matching engine.

### Core capabilities

| Capability | Description |
|---|---|
| Multi-tenant auth | Auth0-based login; all data scoped to `org_id` |
| Mission lifecycle | `draft → submitted → active → rejected → done` with director approval gate |
| Skill management | Org-configurable skill catalogue and proficiency scale |
| Auto-matching engine | Filters by availability + skill proficiency, ranks by weighted excess score |
| Director dashboard | Mission pipeline counts, crew utilisation %, skill gaps, activity feed |

### Deployment topology

```
Browser  →  Vercel (React SPA)  →  Railway (Hono)  →  PostgreSQL (Railway)
                   ↕                         ↕
                Auth0 (JWKS)           Auth0 (JWT validation)
```

---

## 2. Tech Stack

| Layer | Technology | Rationale |
|---|---|---|
| **Frontend framework** | React + TypeScript + Vite | Component model + strict typing + fast HMR |
| **Server state** | TanStack Query | Cache, refetch, and optimistic updates without boilerplate |
| **UI state** | Zustand | Lightweight store for cross-component state (e.g. auth context) |
| **Routing** | Wouter | Minimal router; auth guards wrap protected routes |
| **Forms** | React Hook Form + Zod | Uncontrolled forms + shared schema validation |
| **UI components** | Shadcn/UI + Radix UI + Tailwind CSS | Accessible primitives + utility-first styling |
| **Backend runtime** | Bun | Fast startup, built-in `.env` loading, test runner |
| **Backend framework** | Node.js + Express | Mature middleware ecosystem; straightforward routing |
| **ORM** | Drizzle ORM | Type-safe SQL builder; schema-as-code; easy migrations |
| **Validation** | Zod (shared package) | Single source of truth for request/response shapes on both sides |
| **Database** | PostgreSQL | ACID, FK constraints, `uuid` PKs, `enum` types |
| **Auth** | Auth0 | Managed identity provider; JWT issued per user |
| **Deployment** | Vercel (frontend) + Railway (backend + DB) | Low-config PaaS; GCP requires hours of IAM/VPC/Cloud SQL setup for equivalent infrastructure; single backend service covers all APIs at MVP scale; Postgres runs as a Railway-managed instance in the same project |

### Monorepo structure

mission_control/
├── package.json              # Defines workspaces: ["apps/*", "packages/*"]
├── bun.lock                  # Single lockfile for the whole repo
│
├── apps/
│   ├── client/               # React SPA (Vite + Vercel)
│   │   ├── package.json      # Dependencies: React, TanStack, Shadcn
│   │   └── src/
│   │       ├── routes/       # TanStack Router file-based routing
│   │       ├── components/   # Shadcn UI & shared UI elements
│   │       ├── features/     # Frontend logic (e.g., MissionCard.tsx)
│   │       ├── lib/          # Setup for Hono RPC client (hc) & TanStack Query
│   │       └── store/        # React Context providers (UI state)
│   │
│   └── server/               # Hono API (Bun + Railway)
│       ├── package.json      # Dependencies: Hono, Drizzle, Postgres
│       └── src/
│           ├── index.ts      # Main entry: exports `AppType` for RPC
│           ├── db/           # Drizzle schema, connection, and migrations
│           ├── middleware/   # Auth0 verification, Error handlers
│           └── features/     # Feature-based slicing (The Hono Way)
│               ├── missions/ # Routes, controllers, & queries for missions
│               ├── crew/     # Routes, controllers, & queries for crew
│               └── auth/     # Tenant and role management
│
├── packages/
│   └── shared/               # The "Glue" between Client and Server
│       ├── package.json      # Export definitions
│       └── src/
│           ├── index.ts      # Barrel exports
│           ├── schemas/      # Zod validators (e.g., insertMissionSchema)
│           └── types/        # TypeScript interfaces & Enums
│
└── e2e/                      # Playwright or Cypress tests
---

## 3. Data Model

### Entity Relationship Diagram

```
organizations
├── id (PK, UUID)
├── name
├── slug (unique)
└── created_at

users
├── id (PK, UUID)
├── org_id ─────────────────────────────────→ organizations.id
├── auth0_id (unique)
├── name
├── email
├── role  [director | mission_lead | crew_member]
└── created_at

skills
├── id (PK, UUID)
├── org_id ─────────────────────────────────→ organizations.id
├── name
├── description
└── category  [technical]

skill_proficiency_levels
├── id (PK, UUID)
├── org_id ─────────────────────────────────→ organizations.id
├── level  (integer, starts at 1)
├── label
├── description
└── UNIQUE (org_id, level)

crew_skills
├── id (PK, UUID)
├── user_id ─────────────────────────────────→ users.id
├── skill_id ────────────────────────────────→ skills.id
├── proficiency_level  (integer)
└── UNIQUE (user_id, skill_id)

crew_unavailability
├── id (PK, UUID)
├── user_id ─────────────────────────────────→ users.id
├── unavailable_from  (date)
├── unavailable_to    (date)
└── reason  (optional)

missions
├── id (PK, UUID)
├── org_id ─────────────────────────────────→ organizations.id
├── name
├── objective
├── start_date
├── end_date
├── phase  [draft | submitted | active | rejected | done]
├── mission_lead_id ─────────────────────────→ users.id
├── crew_required  (integer ≥ 1)
├── created_by ──────────────────────────────→ users.id
└── created_at

mission_skill_requirements
├── id (PK, UUID)
├── mission_id ──────────────────────────────→ missions.id
├── skill_id ────────────────────────────────→ skills.id
├── min_proficiency_level  (integer)
├── weight  (1–10)
└── UNIQUE (mission_id, skill_id)

assignments
├── id (PK, UUID)
├── mission_id ──────────────────────────────→ missions.id
├── crew_member_id ──────────────────────────→ users.id
├── assigned_at  (timestamp)
├── status  [active | completed | rejected]
└── UNIQUE (mission_id, crew_member_id)
```

### Table summary

| Table | Purpose |
|---|---|
| `organizations` | Tenant root; all data scoped here |
| `users` | All roles in one table; role enum drives RBAC |
| `skills` | Org-level skill catalogue |
| `skill_proficiency_levels` | Org-configurable rating scale (e.g. 1–5 or 1–4) |
| `crew_skills` | Crew member's proficiency per skill |
| `crew_unavailability` | Date ranges crew are blocked; updated on assignment |
| `missions` | Mission plans with lifecycle state |
| `mission_skill_requirements` | Skills + min proficiency + weight required per mission |
| `assignments` | Crew-to-mission link; status tracks lifecycle |

### State transitions

```
Mission phases
  draft ──→ submitted ──→ active ──→ done
               │                ↑
               └──→ rejected ───┘ (via re-draft, future scope)

Assignment status
  [created] active ──→ completed  (when mission → done)
                  └──→ rejected   (when mission → rejected)
```

---

## 4. API Reference

All endpoints require a valid **Auth0 JWT** in `Authorization: Bearer <token>`. Role enforcement is server-side.

### Auth & Onboarding

| Method | Path | Role | Description |
|---|---|---|---|
| `GET` | `/api/auth/me` | Any | Returns current user record; creates user on first login |
| `POST` | `/api/auth/onboard` | New user | Set role + join/create org |

### Skills & Proficiency

| Method | Path | Role | Description |
|---|---|---|---|
| `GET` | `/api/orgs/:orgId/skills` | Any | List org skills |
| `POST` | `/api/orgs/:orgId/skills` | Director | Create skill |
| `PUT` | `/api/orgs/:orgId/skills/:id` | Director | Update skill |
| `DELETE` | `/api/orgs/:orgId/skills/:id` | Director | Delete skill |
| `GET` | `/api/orgs/:orgId/proficiency-levels` | Any | List org proficiency levels |
| `POST` | `/api/orgs/:orgId/proficiency-levels` | Director | Create level |
| `PUT` | `/api/orgs/:orgId/proficiency-levels/:id` | Director | Update level |

### Crew Management

| Method | Path | Role | Description |
|---|---|---|---|
| `GET` | `/api/crew` | Director | List all crew in org |
| `GET` | `/api/crew/:userId/skills` | Director / Owner | Get crew member's skills |
| `POST` | `/api/crew/:userId/skills` | Crew Member (self) | Add skill to profile |
| `PUT` | `/api/crew/:userId/skills/:skillId` | Crew Member (self) | Update proficiency |
| `DELETE` | `/api/crew/:userId/skills/:skillId` | Crew Member (self) | Remove skill |

### Missions

| Method | Path | Role | Description |
|---|---|---|---|
| `GET` | `/api/missions` | Director (all) / ML (own) | List missions |
| `POST` | `/api/missions` | Mission Lead | Create mission (draft) |
| `GET` | `/api/missions/:id` | Director / ML (own) | Get mission detail |
| `PUT` | `/api/missions/:id` | Mission Lead (draft only) | Edit mission |
| `POST` | `/api/missions/:id/submit` | Mission Lead | `draft → submitted` |
| `POST` | `/api/missions/:id/approve` | Director (not own) | `submitted → active` |
| `POST` | `/api/missions/:id/reject` | Director | `submitted → rejected` |
| `POST` | `/api/missions/:id/done` | Director | `active → done` |

### Mission Skill Requirements

| Method | Path | Role | Description |
|---|---|---|---|
| `GET` | `/api/missions/:id/requirements` | Director / ML (own) | List skill requirements |
| `POST` | `/api/missions/:id/requirements` | Mission Lead (draft) | Add skill requirement |
| `PUT` | `/api/missions/:id/requirements/:reqId` | Mission Lead (draft) | Update requirement |
| `DELETE` | `/api/missions/:id/requirements/:reqId` | Mission Lead (draft) | Remove requirement |

### Auto-Matcher

| Method | Path | Role | Description |
|---|---|---|---|
| `POST` | `/api/missions/:id/match` | Mission Lead | Run auto-match; returns ranked crew |

### Assignments

| Method | Path | Role | Description |
|---|---|---|---|
| `GET` | `/api/missions/:id/assignments` | Director / ML (own) | List crew on mission |
| `POST` | `/api/missions/:id/assignments` | Mission Lead | Assign crew member |
| `DELETE` | `/api/missions/:id/assignments/:assignId` | Mission Lead | Remove assignment |

### Dashboard

| Method | Path | Role | Description |
|---|---|---|---|
| `GET` | `/api/dashboard` | Director | Mission pipeline + crew utilisation + skill gaps + activity feed |

---

## 5. Design Decisions

### DD-1: Tenant isolation via `org_id` on every table

Every table (except `organizations` itself) carries an `org_id` FK. All service-layer queries include `WHERE org_id = :orgId` derived from the authenticated JWT, never from the request body. This makes cross-tenant leakage structurally impossible at the query layer.

*Trade-off*: Adds `org_id` to every join, but eliminates any trust in client-supplied tenant context.

---

### DD-2: Role stored in `users` table, validated server-side

Roles (`director`, `mission_lead`, `crew_member`) are stored in `users.role`, set at onboarding. Every protected endpoint checks the role from the DB record resolved from the JWT — not from a JWT claim — so Auth0 tokens cannot be tampered with to escalate role.

*Trade-off*: Extra DB lookup per request vs. JWT-claim approach, but prevents privilege escalation without DB write.

---

### DD-3: Org-configurable proficiency scale

`skill_proficiency_levels` is a per-org table rather than a hardcoded 1–5 scale. This allows NASA's 4-level scale (Participate → Apply → Manage → Guide) and ESA's 6-level scale to coexist in the same database. The auto-matcher reads `MAX(level)` per org to normalise scores.

*Fallback*: If an org has no levels configured, `maxProficiencyLevel` defaults to 5.

---

### DD-4: Auto-matcher uses weighted excess proficiency, not raw average

Score formula:
```
score = Σ(weight_i × max(0, proficiency_i − min_i)) / Σ(weight_i)
normalizedScore = score / (maxProficiencyLevel − 1)
```

Ranking by *excess above the bar* (not raw proficiency) ensures better differentiation among candidates who all pass the filter. A crew member at exactly the minimum scores 0; one level above scores 1; fully expert scores the max. Weight allows mission leads to signal which skills matter most.

*Trade-off*: More complex formula than average, but avoids the flat-ranking problem where all passing candidates appear equal.

---

### DD-5: Mission lead self-approval blocked at API layer

`POST /api/missions/:id/approve` returns **403** if `mission.mission_lead_id === req.user.id`. Enforced in the service layer, not just the frontend, so it cannot be bypassed via direct API calls.

---

### DD-6: Assignment history preserved, not deleted

When a mission moves to `done`, all `assignments.status` → `completed` (retained). When rejected → `rejected` (retained). No records are deleted. Crew history is queryable at any time by filtering on `assignments.status`.

*Trade-off*: Table grows over time, but supports audit, reporting, and future "past assignments" UX with no schema changes.

---

### DD-7: `crew_unavailability` driven by assignments, not self-reported

In MVP, crew cannot set their own unavailability. Records are created when a crew member is assigned to a mission and cleared when the mission is done or rejected. This keeps the availability model simple: a crew member is unavailable if and only if they have an active assignment covering that date range.

*Post-MVP*: Crew can report unavailability (leave, training, etc.) independently.

---

### DD-8: Shared Zod schemas in `/shared` package

Validation schemas live in the `shared/` workspace and are imported by both the frontend (React Hook Form) and backend (Express middleware). This guarantees a single source of truth for request/response shapes and prevents the frontend and backend from silently drifting.

---

### DD-9: `crew_required` drives auto-matcher top-N selection

`missions.crew_required` is set by the mission lead at planning time. The matcher uses it as N for top-N selection with tie-handling (all candidates tied at position N are included). The assignments view derives progress by comparing the active assignment count against `crew_required`.

---

### DD-10: No caching layer (MVP)

A Redis caching layer was considered and explicitly skipped for MVP. The data set is small (20–50 crew, 5–20 missions per org), queries are already org-scoped and indexed, and PostgreSQL can comfortably handle the expected load within the 500ms p95 target. Caching adds operational complexity that is not justified at this scale.

---

### DD-11: Railway over GCP for backend hosting

Railway was chosen over GCP (Cloud Run / GKE) for the backend and database.

GCP requires configuring IAM roles, VPC networking, Cloud SQL, a load balancer, and secrets management — several hours of infrastructure setup that adds no value at MVP scale. Railway provides a single Express/Bun service and a managed Postgres instance deployable in minutes via environment variables and a minimal `railway.toml`.

A single backend service handles all API routes. There is no need for multi-service orchestration at this scale (20–50 crew, 5–20 missions per org). The Postgres instance lives in the same Railway project and connects via the `DATABASE_URL` environment variable — no cross-cloud networking required.

*Trade-off*: Railway offers less fine-grained infrastructure control than GCP, but that control is not needed until the platform grows beyond MVP scale.

---

## 6. Data Flow Diagrams

### Flow 1: User Authentication

```
Client                Auth0                Hono               PostgreSQL
  │                     │                    │                     │
  │── login() ─────────→│                    │                     │
  │←── JWT ─────────────│                    │                     │
  │                     │                    │                     │
  │── GET /api/auth/me ─────────────────────→│                     │
  │                     │  verify JWT (JWKS) │                     │
  │                     │←──────────────────→│                     │
  │                     │                    │── SELECT users ─────→│
  │                     │                    │   WHERE auth0_id     │
  │                     │                    │←── null (new user) ──│
  │                     │                    │                     │
  │── POST /api/auth/onboard ───────────────→│                     │
  │   { role, orgName | orgId }              │── INSERT users ─────→│
  │                     │                    │   INSERT org (dir)   │
  │                     │                    │←── user record ──────│
  │←── { user, org } ───────────────────────│                     │
```

---

### Flow 2: Mission Planning & Submission

```
Mission Lead (Client)                  Hono               PostgreSQL
        │                               │                           │
        │── POST /api/missions ────────→│                           │
        │   { name, objective,          │── INSERT missions ────────→│
        │     start, end,               │   phase = 'draft'         │
        │     crew_required }           │←── mission record ────────│
        │←── mission ──────────────────│                           │
        │                               │                           │
        │── POST /missions/:id/         │                           │
        │   requirements ─────────────→│── INSERT mission_skill_req→│
        │   { skillId, minLevel,        │                           │
        │     weight }                  │←── requirement record ────│
        │←── requirement ──────────────│                           │
        │                               │                           │
        │── POST /missions/:id/submit ─→│                           │
        │                               │── UPDATE missions ────────→│
        │                               │   phase = 'submitted'     │
        │←── { phase: submitted } ─────│                           │
```

---

### Flow 3: Auto-Matching Engine

```
Mission Lead (Client)               Hono (matcher-service)        PostgreSQL
        │                               │                                   │
        │── POST /missions/:id/match ──→│                                   │
        │                               │── Step 1: load mission + reqs ────→│
        │                               │   (422 if no requirements)         │
        │                               │                                   │
        │                               │── Step 2a: unavailability blocks   │
        │                               │   (Promise.all) ──────────────────→│
        │                               │── Step 2b: active assignment       │
        │                               │   overlaps ───────────────────────→│
        │                               │   merge → excludedIds Set          │
        │                               │                                   │
        │                               │── Step 3a: all crew in org ───────→│
        │                               │   minus excludedIds               │
        │                               │── Step 3b: crew_skills for         │
        │                               │   candidates × required skills ───→│
        │                               │   build Map<userId, Map<skill,lvl>>│
        │                               │   filter: every skill ≥ minLevel   │
        │                               │                                   │
        │                               │── Step 4: score each eligible crew │
        │                               │   Σ(weight × max(0, lvl-min)) /    │
        │                               │   Σ(weight)                       │
        │                               │   sort desc → top-N with ties     │
        │                               │                                   │
        │←── { results: ranked[] } ────│                                   │
```

---

### Flow 4: Mission Approval & Assignment Lifecycle

```
Director (Client)          Mission Lead (Client)        Hono         PostgreSQL
      │                           │                      │                    │
      │                           │── POST /missions/    │                    │
      │                           │   :id/assignments ──→│                    │
      │                           │   { crewMemberId }   │── INSERT assign. ──→│
      │                           │                      │   status='active'  │
      │                           │                      │── INSERT unavail. ─→│
      │                           │                      │   from mission dates│
      │                           │←── assignment ───────│                    │
      │                           │                      │                    │
      │── POST /missions/:id/     │                      │                    │
      │   approve ───────────────────────────────────────→│                    │
      │   (403 if self-approval)  │                      │── UPDATE missions ─→│
      │                           │                      │   phase='active'   │
      │←── { phase: active } ────────────────────────────│                    │
      │                           │                      │                    │
      │── POST /missions/:id/done ───────────────────────→│                    │
      │                           │                      │── UPDATE missions ─→│
      │                           │                      │   phase='done'     │
      │                           │                      │── UPDATE assignments│
      │                           │                      │   status='completed'│
      │                           │                      │── DELETE unavail. ─→│
      │←── { phase: done } ──────────────────────────────│                    │
```

---

### Flow 5: Director Dashboard

```
Director (Client)              Hono             PostgreSQL
       │                        │                        │
       │── GET /api/dashboard ─→│                        │
       │                        │                        │
       │                        │── COUNT missions       │
       │                        │   GROUP BY phase ─────→│
       │                        │                        │
       │                        │── crew utilisation:    │
       │                        │   crew with ≥1 active  │
       │                        │   assignment / total ─→│
       │                        │                        │
       │                        │── skill gaps:          │
       │                        │   skills ORDER BY      │
       │                        │   qualified crew ASC ─→│
       │                        │                        │
       │                        │── activity feed:       │
       │                        │   recent events from   │
       │                        │   missions +           │
       │                        │   assignments ────────→│
       │                        │                        │
       │←── dashboard payload ──│                        │
```

---

## 7. Overall Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           CLIENT  (Vercel)                               │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                     React SPA (Vite + TypeScript)               │    │
│  │                                                                  │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │    │
│  │  │   TanStack   │  │  TanStack    │  | Component + Hook     │  │    │
│  │  │   Router     │  │    Query     │  │  (ui state)          │  │    │
│  │  │              │  │  (API cache) │  │ React                │  │    │
│  │  └──────────────┘  └──────────────┘  └──────────────────────┘  │    │
│  │                                                                  │    │
│  │  ┌──────────────────────────────────────────────────────────┐   │    │
│  │  │  Shadcn/UI + Tailwind CSS                     │   │    │
│  │  │  Pages: Dashboard · Missions · Crew · Skills · Auth      │   │    │
│  │  └──────────────────────────────────────────────────────────┘   │    │
│  │                                                                  │    │
│  │  Shared Zod schemas ←── /shared workspace ──→ Backend           │    │
│  └─────────────────────────────────────────────────────────────────┘    │
└──────────────────────────────┬──────────────────────────────────────────┘
                               │ HTTPS / REST
                               ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         SERVER  (Railway / Bun)                          │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                     Hono                                           │    │
│  │                                                                  │    │
│  │  ┌────────────────────────────────────────────────────────┐     │    │
│  │  │              Middleware Stack                           │     │    │
│  │  │  Auth0 JWT verify → org_id inject → role check → Zod  │     │    │
│  │  └────────────────────────────────────────────────────────┘     │    │
│  │                                                                  │    │
│  │  ┌──────────────────── Route Handlers ────────────────────┐     │    │
│  │  │  /api/auth      /api/missions    /api/crew             │     │    │
│  │  │  /api/skills    /api/assignments /api/dashboard        │     │    │
│  │  └────────────────────────┬───────────────────────────────┘     │    │
│  │                           │                                      │    │
│  │  ┌──────────────────── Services ──────────────────────────┐     │    │
│  │  │  mission-service   crew-service   skill-service        │     │    │
│  │  │  assignment-service              matcher-service       │     │    │
│  │  └────────────────────────┬───────────────────────────────┘     │    │
│  │                           │                                      │    │
│  │  ┌──────────────────── Drizzle ORM ───────────────────────┐     │    │
│  │  │  Type-safe query builder · Schema migrations           │     │    │
│  │  └────────────────────────┬───────────────────────────────┘     │    │
│  └───────────────────────────┼──────────────────────────────────────┘    │
└──────────────────────────────┼──────────────────────────────────────────┘
                               │ SQL (TLS)
                               ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                       DATABASE  (PostgreSQL / Railway)                   │
│                                                                          │
│  organizations → users → missions → assignments                          │
│                       ↘ skills → skill_proficiency_levels                │
│                         crew_skills · crew_unavailability                │
│                         mission_skill_requirements                       │
│                                                                          │
│  Constraints: FK integrity · UNIQUE indexes · org_id on every table     │
└─────────────────────────────────────────────────────────────────────────┘
                               ▲
                               │ JWKS endpoint (JWT public keys)
┌──────────────────────────────┴──────────────┐
│              Auth0 (Managed IdP)             │
│  Login · JWT issuance · JWKS public keys     │
└─────────────────────────────────────────────┘
```

### Request lifecycle (per API call)

```
1. Client sends request + Bearer JWT
2. Auth middleware: verify JWT signature via Auth0 JWKS
3. Extract auth0_id → resolve users record from DB
4. Inject { user, orgId } into request context
5. Role-based middleware: check user.role against endpoint's required role
6. Zod middleware: validate request body/query against shared schema
7. Route handler → Service layer (all queries scoped to orgId)
8. Drizzle ORM → PostgreSQL
9. Response serialised → client
```

### Auto-matcher engine (internal)

```
matcher-service
  │
  ├── 1. Load mission + requirements   → 422 if none
  │
  ├── 2. Filter unavailable crew       → Promise.all
  │       2a. crew_unavailability date overlap
  │       2b. active assignments on overlapping missions
  │       → excludedIds: Set<userId>
  │
  ├── 3. Filter by skill proficiency
  │       → all crew in org minus excludedIds
  │       → bulk-fetch crew_skills
  │       → keep only crew with level ≥ minLevel for every skill
  │       → missing skill row = level 0 = fail
  │
  └── 4. Score + rank
          → score = Σ(weight × max(0, level − min)) / Σ(weight)
          → normalizedScore = score / (maxLevel − 1)
          → sort descending, cutoff at position N
          → ties at boundary: all included, same rank
```

---

*Document generated from: `docs/plan/data_model.md`, `docs/plan/auto-matcher.md`, `docs/plan/prd.md`, `README.md`, `CLAUDE.md`*
