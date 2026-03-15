# Mission Control — Claude Guidelines

## Overview

**Mission Control**, a multi-tenant B2B SaaS platform for space organisations to manage crew assignments to missions, build skill profiles for crew members, manage missions and auto-match crew to mission.

### Entities

- **Organisations** are Space agencies, research labs, private companies. 
- **Crew Members** belong to an organisation. They have skill profiles, availability, and assignment history.
- **Missions** belong to an organisation. They have requirements, timelines, and a lifecycle that includes some form of approval before going active.
- **Assignments** connect crew to missions.

### Roles & Premission

- **Directors** run the organisation. They manage settings, approve missions, and have broad visibility.
- **Mission Leads** plan and manage missions. They define requirements, run the matcher, and submit missions for approval. They should not be able to approve their own missions.
- **Crew Members** manage their own profiles, availability, and respond to assignments. They have limited visibility into the broader organisation.

### Constraint

- All data is strictly scoped to an organisation
- Tenant isolation: Data must never leak across tenants.

### MVP scope

Multi-tenant auth with roles, a mission lifecycle with approval workflow, a crew management system with skill profiles, an auto-matching engine, and a dashboard with org-level metrics.

### Tech Stack

| Layer | Technology |
| --- | --- |
| **Frontend framework** | React + TypeScript + Vite + bun |
| **State — server** | TanStack Query |
| **State — UI** | React Context + Hooks |
| **Routing** | TanStack Router |
| **Forms** | React Hook Form + Zod |
| **UI components** | Shadcn/UI + Tailwind CSS |
| **Backend** | Typescript + Hono + Bun |
| **ORM** | Drizzle ORM |
| **Validation** | Zod (shared frontend + backend) |
| **Database** | PostgreSQL |
| **Authn** | Auth0 |

## User Preferences

Preferred communication style: Simple, everyday language.

## Package Manager — Bun

**Always use Bun.** It is the package manager, runtime, and test runner for this project.

- `bun install` — not npm/yarn/pnpm
- `bun run <script>` — not npm/yarn run
- `bunx <pkg>` — not npx
- `bun test` — not jest/vitest directly
- `bun <file>` — not node/ts-node
- Bun loads `.env` automatically — do not use dotenv

## MCP Tool usage

Always use context7 mcp tool when you need code generation, setup or configuration steps, or library/API documentation.