import type { UserRole } from "./types/index.js";

export type Permission =
	| "org:settings:manage"
	| "missions:approve"
	| "missions:create"
	| "missions:submit"
	| "crew:manage"
	| "assignments:manage"
	| "profile:edit"
	| "assignments:respond"
	| "dashboard:view";

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
	director: [
		"org:settings:manage",
		"missions:approve",
		"missions:create",
		"crew:manage",
		"assignments:manage",
		"dashboard:view",
	],
	mission_lead: ["missions:create", "missions:submit", "crew:manage", "assignments:manage"],
	crew_member: ["profile:edit", "assignments:respond"],
};

export function hasPermission(role: UserRole, permission: Permission): boolean {
	return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function hasAnyRole(role: UserRole, roles: UserRole[]): boolean {
	return roles.includes(role);
}
