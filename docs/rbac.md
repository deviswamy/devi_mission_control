# Role-Based Access Control (RBAC)

## Roles

| Role | Description |
|---|---|
| `director` | Runs the organisation. Approves missions, manages settings and crew, views the dashboard. |
| `mission_lead` | Plans and manages missions. Can create, submit, and manage crew assignments. Cannot approve their own missions. |
| `crew_member` | Manages their own profile, availability, and responds to assignments. Limited visibility. |

## Permissions

| Permission | Description | Granted to |
|---|---|---|
| `org:settings:manage` | Modify organisation settings | `director` |
| `missions:approve` | Approve missions for activation | `director` |
| `missions:create` | Create new missions | `director`, `mission_lead` |
| `missions:submit` | Submit a mission for approval | `mission_lead` |
| `crew:manage` | View and manage crew members | `director`, `mission_lead` |
| `assignments:manage` | Create and manage crew assignments | `director`, `mission_lead` |
| `profile:edit` | Edit own crew profile | `crew_member` |
| `assignments:respond` | Accept or decline an assignment | `crew_member` |
| `dashboard:view` | View the org-level dashboard | `director` |

## Adding a New Permission

1. Add the permission string to the `Permission` union type in `packages/shared/src/permissions.ts`.
2. Grant it to the appropriate roles in `ROLE_PERMISSIONS`.
3. Use it in backend routes and frontend guards (see below).

## Backend: Protecting a Route

Import `requireRole` or `requirePermission` from `apps/server/src/middleware/rbac.ts` and apply them after `authMiddleware`.

```ts
import { requirePermission, requireRole } from "../middleware/rbac.js";

router
  .use("*", authMiddleware)
  .use("*", tenantMiddleware)
  .post("/approve/:id", requirePermission("missions:approve"), approveMission)
  .post("/",            requirePermission("missions:create"),  createMission)
  .get("/",             requireRole(["director", "mission_lead"]), listMissions)
```

- `requirePermission(p)` — looks up the user's role against `ROLE_PERMISSIONS` and returns 403 if the permission is absent.
- `requireRole(roles)` — returns 403 if the user's role is not in the allowed list.
- Both return 401 if `authMiddleware` has not run (no user in context).

## Frontend: Guarding a Route

Use `beforeLoad` in the route definition. The `context.user` field is available because `RouterContext` includes `user: User | null`.

```ts
import { hasAnyRole } from "@mission-control/shared";
import { createRoute, redirect } from "@tanstack/react-router";

export const Route = createRoute({
  getParentRoute: () => AppRoute,
  path: "/dashboard",
  beforeLoad: ({ context }) => {
    if (!context.user || !hasAnyRole(context.user.role, ["director"])) {
      throw redirect({ to: "/app" }); // /app re-routes by role
    }
  },
  component: Dashboard,
});
```

## Frontend: RequirePermission Component

Use this to conditionally render UI elements based on permissions.

```tsx
import { RequirePermission } from "../components/RequirePermission";

<RequirePermission permission="missions:approve" fallback={<p>No access</p>}>
  <ApproveButton />
</RequirePermission>
```

The `fallback` prop is optional and defaults to nothing.

## Frontend: useHasPermission / useHasRole Hooks

Use these hooks for imperative permission checks inside components.

```tsx
import { useHasPermission, useHasRole } from "../hooks/usePermissions";

function MyComponent() {
  const canApprove = useHasPermission("missions:approve");
  const isStaff = useHasRole(["director", "mission_lead"]);
  // ...
}
```

Both return `false` when the user is not authenticated.
