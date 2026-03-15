# Mission Control Application

## Background

Space organisations need to plan complex missions requiring specific crew capabilities. Crew assignment is currently manual and error-prone — leads spend hours cross-referencing skill profiles, availability calendars, and existing commitments. Multiple organisations will use this platform, each with different crew sizes, skill taxonomies, and approval processes.

## Proposal

Mission Control is a B2B platform that helps organisations manage missions and intelligently assign crew based on skills, availability, and workload.

### Entities

- **Organisations** are Space agencies, research labs, private companies. All data is strictly scoped to an organisation. Data must never leak across tenants.
- **Crew Members** belong to an organisation. They have skill profiles, availability, and assignment history.
- **Missions** belong to an organisation. They have requirements, timelines, and a lifecycle that includes some form of approval before going active.
- **Assignments** connect crew to missions. The platform should include an auto-matching engine that intelligently suggests crew for missions based on skills, availability, and constraints.

### Roles & Premission

- **Directors** run the organisation. They manage settings, approve missions, and have broad visibility.
- **Mission Leads** plan and manage missions. They define requirements, run the matcher, and submit missions for approval. They should not be able to approve their own missions.
- **Crew Members** manage their own profiles, availability, and respond to assignments. They have limited visibility into the broader organisation.

### MVP scope

Multi-tenant auth with roles, a mission lifecycle with approval workflow, a crew management system with skill profiles, an auto-matching engine, and a dashboard with org-level metrics.


### Plan of Action

#### Reasearch key decisions
    - Space organization, skill taxonamy, Selecting Matching algorithm, Mission (done)
    - Auto matching (done)
    - Scale? How many organisations, skills, crew members and missions that will be supported? (done).
    - Authn/z - Auth0 as identity provider and Authorization within the app. (done)
    - Tenant Isolation - (done)
    - Technical stack - Typescript, NodeJS, React, DB - Postgress, skipping caching layer (done )

#### Setup
    -  Deployment - Vercel (frontend) and Railway for backend (to reduce configuration and ops time for the MVP scope)
    - Setup Github repo
    - Setup Auth0
    - Setup Vercel and Railway
    
#### High Level Plan and Documentation
    - Scaffolding 
    - PRD - Functional + Non Functional Requirements, Features (MVP scope) and user stories for each of the feature, Success metric (done)
    - System Architecture - Data Model, Design Decisions, APIs, Tech Stack, Data Flow diagrams and Overall architecture diagram (done)
    - Quality check, Testing and Validation Plan
    - Security checks

#### Feature Implementation Plan & Testing
   TBA