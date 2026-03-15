import { describe, expect, it, mock } from "bun:test";
import type { User } from "@mission-control/shared";

const FIXED_DATE = "2024-01-01T00:00:00.000Z";

function makeUser(role: User["role"]): User {
	return {
		id: "user-1",
		orgId: "org-1",
		auth0Id: "auth0|user1",
		name: "Test",
		email: "test@example.com",
		role,
		createdAt: FIXED_DATE,
	};
}

// We test useHasPermission / useHasRole by mocking useAuthContext.
// These hooks have no React state or effects — they are pure function wrappers,
// so calling them outside a component is safe in Bun's test runner.

describe("useHasPermission", () => {
	it("returns true for director with missions:approve", async () => {
		mock.module("../../store/authContext", () => ({
			useAuthContext: () => ({ user: makeUser("director") }),
		}));
		const { useHasPermission } = await import("../usePermissions");
		expect(useHasPermission("missions:approve")).toBe(true);
	});

	it("returns false for mission_lead with missions:approve", async () => {
		mock.module("../../store/authContext", () => ({
			useAuthContext: () => ({ user: makeUser("mission_lead") }),
		}));
		const { useHasPermission } = await import("../usePermissions");
		expect(useHasPermission("missions:approve")).toBe(false);
	});

	it("returns false for crew_member with missions:approve", async () => {
		mock.module("../../store/authContext", () => ({
			useAuthContext: () => ({ user: makeUser("crew_member") }),
		}));
		const { useHasPermission } = await import("../usePermissions");
		expect(useHasPermission("missions:approve")).toBe(false);
	});

	it("returns false when user is null (unauthenticated)", async () => {
		mock.module("../../store/authContext", () => ({
			useAuthContext: () => ({ user: null }),
		}));
		const { useHasPermission } = await import("../usePermissions");
		expect(useHasPermission("missions:approve")).toBe(false);
	});
});

describe("useHasRole", () => {
	it("returns true for director in [director, mission_lead]", async () => {
		mock.module("../../store/authContext", () => ({
			useAuthContext: () => ({ user: makeUser("director") }),
		}));
		const { useHasRole } = await import("../usePermissions");
		expect(useHasRole(["director", "mission_lead"])).toBe(true);
	});

	it("returns true for mission_lead in [director, mission_lead]", async () => {
		mock.module("../../store/authContext", () => ({
			useAuthContext: () => ({ user: makeUser("mission_lead") }),
		}));
		const { useHasRole } = await import("../usePermissions");
		expect(useHasRole(["director", "mission_lead"])).toBe(true);
	});

	it("returns false for crew_member in [director, mission_lead]", async () => {
		mock.module("../../store/authContext", () => ({
			useAuthContext: () => ({ user: makeUser("crew_member") }),
		}));
		const { useHasRole } = await import("../usePermissions");
		expect(useHasRole(["director", "mission_lead"])).toBe(false);
	});

	it("accepts a single role string and returns true on match", async () => {
		mock.module("../../store/authContext", () => ({
			useAuthContext: () => ({ user: makeUser("director") }),
		}));
		const { useHasRole } = await import("../usePermissions");
		expect(useHasRole("director")).toBe(true);
	});

	it("accepts a single role string and returns false on no match", async () => {
		mock.module("../../store/authContext", () => ({
			useAuthContext: () => ({ user: makeUser("mission_lead") }),
		}));
		const { useHasRole } = await import("../usePermissions");
		expect(useHasRole("director")).toBe(false);
	});

	it("returns false when user is null (unauthenticated)", async () => {
		mock.module("../../store/authContext", () => ({
			useAuthContext: () => ({ user: null }),
		}));
		const { useHasRole } = await import("../usePermissions");
		expect(useHasRole(["director", "mission_lead"])).toBe(false);
	});
});
