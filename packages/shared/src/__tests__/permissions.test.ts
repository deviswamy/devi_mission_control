import { describe, expect, it } from "bun:test";
import type { Permission } from "../permissions.js";
import { hasAnyRole, hasPermission, ROLE_PERMISSIONS } from "../permissions.js";
import type { UserRole } from "../types/index.js";

describe("hasPermission", () => {
	it("returns true for director with missions:approve", () => {
		expect(hasPermission("director", "missions:approve")).toBe(true);
	});

	it("returns false for crew_member with missions:approve", () => {
		expect(hasPermission("crew_member", "missions:approve")).toBe(false);
	});

	it("returns false for mission_lead with missions:approve", () => {
		expect(hasPermission("mission_lead", "missions:approve")).toBe(false);
	});

	it("returns true for crew_member with profile:edit", () => {
		expect(hasPermission("crew_member", "profile:edit")).toBe(true);
	});

	it("returns true for mission_lead with missions:create", () => {
		expect(hasPermission("mission_lead", "missions:create")).toBe(true);
	});

	it("returns true for mission_lead with missions:submit", () => {
		expect(hasPermission("mission_lead", "missions:submit")).toBe(true);
	});

	it("returns false for director with missions:submit (director approves, not submits)", () => {
		expect(hasPermission("director", "missions:submit")).toBe(false);
	});

	it("returns false for mission_lead with missions:approve (cannot approve own missions)", () => {
		expect(hasPermission("mission_lead", "missions:approve")).toBe(false);
	});

	it("returns false (not throw) when role is an unknown value at runtime", () => {
		// Cast to bypass TypeScript — simulates a bad DB value or missing JWT claim
		expect(hasPermission("unknown_role" as UserRole, "missions:approve")).toBe(false);
	});
});

describe("hasAnyRole", () => {
	it("returns true when role is in the list", () => {
		expect(hasAnyRole("mission_lead", ["director", "mission_lead"])).toBe(true);
	});

	it("returns false when role is not in the list", () => {
		expect(hasAnyRole("crew_member", ["director", "mission_lead"])).toBe(false);
	});

	it("returns true for exact single match", () => {
		expect(hasAnyRole("director", ["director"])).toBe(true);
	});
});

describe("ROLE_PERMISSIONS", () => {
	it("all roles have at least one permission", () => {
		for (const [role, perms] of Object.entries(ROLE_PERMISSIONS)) {
			expect(perms.length, `${role} should have at least one permission`).toBeGreaterThan(0);
		}
	});

	it("each permission is granted to at least one role", () => {
		const allPerms = new Set(Object.values(ROLE_PERMISSIONS).flat());
		const defined: Permission[] = [
			"org:settings:manage",
			"missions:approve",
			"missions:create",
			"missions:submit",
			"crew:manage",
			"assignments:manage",
			"profile:edit",
			"assignments:respond",
			"dashboard:view",
		];
		for (const perm of defined) {
			expect(allPerms.has(perm), `${perm} should be granted to at least one role`).toBe(true);
		}
	});
});
