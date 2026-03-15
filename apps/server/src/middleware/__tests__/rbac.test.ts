import { beforeEach, describe, expect, it, mock } from "bun:test";
import type { UserRole } from "@mission-control/shared";
import { Hono } from "hono";

// --- env must be set before app is imported ---
process.env.AUTH0_DOMAIN = "test.auth0.com";
process.env.AUTH0_AUDIENCE = "https://test.api";
process.env.DATABASE_URL = "postgresql://localhost/test";

// --- mock jose ---
mock.module("jose", () => ({
	createRemoteJWKSet: () => "mock-jwks",
	jwtVerify: mock(async () => ({ payload: { sub: "auth0|user1" } })),
}));

// --- mock postgres ---
mock.module("postgres", () => ({
	default: () => ({}),
}));

// --- mock db ---
mock.module("../../../db/index.js", () => ({
	db: { select: () => ({}) },
}));

const { requireRole, requirePermission } = await import("../rbac.js");

// --- helpers ---

function makeApp(role: UserRole | null) {
	const app = new Hono();

	app.use("*", async (c, next) => {
		if (role !== null) {
			c.set("user", {
				id: "user-1",
				orgId: "org-1",
				auth0Id: "auth0|user1",
				name: "Test User",
				email: "test@example.com",
				role,
				createdAt: new Date().toISOString(),
			});
		}
		await next();
	});

	return app;
}

// -------------------------------------------------------------------

describe("requireRole", () => {
	it("passes for director when director is allowed", async () => {
		const app = makeApp("director");
		app.get("/test", requireRole(["director"]), (c) => c.json({ ok: true }));
		const res = await app.request("/test");
		expect(res.status).toBe(200);
	});

	it("returns 403 for mission_lead when only director is allowed", async () => {
		const app = makeApp("mission_lead");
		app.get("/test", requireRole(["director"]), (c) => c.json({ ok: true }));
		const res = await app.request("/test");
		expect(res.status).toBe(403);
	});

	it("returns 403 for crew_member when only director is allowed", async () => {
		const app = makeApp("crew_member");
		app.get("/test", requireRole(["director"]), (c) => c.json({ ok: true }));
		const res = await app.request("/test");
		expect(res.status).toBe(403);
	});

	it("passes for director when director and mission_lead are allowed", async () => {
		const app = makeApp("director");
		app.get("/test", requireRole(["director", "mission_lead"]), (c) => c.json({ ok: true }));
		const res = await app.request("/test");
		expect(res.status).toBe(200);
	});

	it("passes for mission_lead when director and mission_lead are allowed", async () => {
		const app = makeApp("mission_lead");
		app.get("/test", requireRole(["director", "mission_lead"]), (c) => c.json({ ok: true }));
		const res = await app.request("/test");
		expect(res.status).toBe(200);
	});

	it("returns 403 for crew_member when director and mission_lead are allowed", async () => {
		const app = makeApp("crew_member");
		app.get("/test", requireRole(["director", "mission_lead"]), (c) => c.json({ ok: true }));
		const res = await app.request("/test");
		expect(res.status).toBe(403);
	});

	it("returns 401 when user is not in context", async () => {
		const app = makeApp(null);
		app.get("/test", requireRole(["director"]), (c) => c.json({ ok: true }));
		const res = await app.request("/test");
		expect(res.status).toBe(401);
	});
});

describe("requirePermission", () => {
	it("returns 403 for mission_lead with missions:approve", async () => {
		const app = makeApp("mission_lead");
		app.get("/test", requirePermission("missions:approve"), (c) => c.json({ ok: true }));
		const res = await app.request("/test");
		expect(res.status).toBe(403);
	});

	it("returns 403 for crew_member with missions:approve", async () => {
		const app = makeApp("crew_member");
		app.get("/test", requirePermission("missions:approve"), (c) => c.json({ ok: true }));
		const res = await app.request("/test");
		expect(res.status).toBe(403);
	});

	it("returns 200 for director with missions:approve", async () => {
		const app = makeApp("director");
		app.get("/test", requirePermission("missions:approve"), (c) => c.json({ ok: true }));
		const res = await app.request("/test");
		expect(res.status).toBe(200);
	});

	it("passes for crew_member with profile:edit", async () => {
		const app = makeApp("crew_member");
		app.get("/test", requirePermission("profile:edit"), (c) => c.json({ ok: true }));
		const res = await app.request("/test");
		expect(res.status).toBe(200);
	});

	it("returns 403 for mission_lead with missions:approve (submit vs approve boundary)", async () => {
		const app = makeApp("mission_lead");
		app.get("/test", requirePermission("missions:approve"), (c) => c.json({ ok: true }));
		const res = await app.request("/test");
		expect(res.status).toBe(403);
	});

	it("returns 200 for mission_lead with missions:submit", async () => {
		const app = makeApp("mission_lead");
		app.get("/test", requirePermission("missions:submit"), (c) => c.json({ ok: true }));
		const res = await app.request("/test");
		expect(res.status).toBe(200);
	});

	it("returns 403 for director with missions:submit", async () => {
		const app = makeApp("director");
		app.get("/test", requirePermission("missions:submit"), (c) => c.json({ ok: true }));
		const res = await app.request("/test");
		expect(res.status).toBe(403);
	});

	it("returns 401 when user is not in context", async () => {
		const app = makeApp(null);
		app.get("/test", requirePermission("missions:approve"), (c) => c.json({ ok: true }));
		const res = await app.request("/test");
		expect(res.status).toBe(401);
	});
});
