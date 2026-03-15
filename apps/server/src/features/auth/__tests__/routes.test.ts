import { beforeEach, describe, expect, it, mock } from "bun:test";
import type { MeResponse } from "@mission-control/shared";

// --- env must be set before app is imported ---
process.env.AUTH0_DOMAIN = "test.auth0.com";
process.env.AUTH0_AUDIENCE = "https://test.api";
process.env.DATABASE_URL = "postgresql://localhost/test";

// --- fixtures ---
const FIXED_DATE = new Date("2024-01-01T00:00:00.000Z");

const mockDbUser = {
	id: "user-uuid-1",
	orgId: "org-uuid-1",
	auth0Id: "auth0|user1",
	name: "Alice",
	email: "alice@example.com",
	role: "director" as const,
	createdAt: FIXED_DATE,
};

const mockDbOrg = {
	id: "org-uuid-1",
	name: "ACME Space",
	slug: "acme-space",
	createdAt: FIXED_DATE,
};

// --- mutable state for DB mock ---
let dbRows: { users: typeof mockDbUser; organizations: typeof mockDbOrg }[] = [];

// --- mock jose: hoisted by Bun ---
const mockJwtVerify = mock(async () => ({
	payload: { sub: "auth0|user1" },
}));

mock.module("jose", () => ({
	createRemoteJWKSet: () => "mock-jwks",
	jwtVerify: mockJwtVerify,
}));

// --- mock postgres so drizzle client init doesn't fail ---
mock.module("postgres", () => ({
	default: () => ({}),
}));

// --- mock db: returns whatever dbRows is set to ---
mock.module("../../../db/index.js", () => {
	const chain: Record<string, unknown> = {};
	chain.from = () => chain;
	chain.innerJoin = () => chain;
	chain.where = () => chain;
	// Return a real Promise so .then() is inherited from Promise.prototype,
	// not a plain object property (avoids biome noThenProperty lint rule)
	chain.limit = () => Promise.resolve(dbRows);
	return { db: { select: () => chain } };
});

// --- import app after mocks are registered ---
const { default: app } = await import("../../../app.js");

// -------------------------------------------------------------------

describe("GET /api/auth/me", () => {
	beforeEach(() => {
		dbRows = [{ users: mockDbUser, organizations: mockDbOrg }];
		mockJwtVerify.mockResolvedValue({ payload: { sub: "auth0|user1" } });
	});

	it("returns 401 when Authorization header is absent", async () => {
		const res = await app.request("/api/auth/me");
		expect(res.status).toBe(401);
	});

	it("returns 401 when Authorization header is not Bearer", async () => {
		const res = await app.request("/api/auth/me", {
			headers: { Authorization: "Basic dXNlcjpwYXNz" },
		});
		expect(res.status).toBe(401);
	});

	it("returns 401 when token is invalid (jwtVerify throws)", async () => {
		mockJwtVerify.mockRejectedValueOnce(new Error("Token expired"));
		const res = await app.request("/api/auth/me", {
			headers: { Authorization: "Bearer bad.token.here" },
		});
		expect(res.status).toBe(401);
		const body = await res.json();
		expect(body.error).toBe("Invalid token");
	});

	it("returns 401 when user is not found in DB", async () => {
		dbRows = [];
		const res = await app.request("/api/auth/me", {
			headers: { Authorization: "Bearer valid.token.here" },
		});
		expect(res.status).toBe(401);
		const body = await res.json();
		expect(body.error).toBe("User not found");
	});

	it("returns 200 with user and org for a valid token", async () => {
		const res = await app.request("/api/auth/me", {
			headers: { Authorization: "Bearer valid.token.here" },
		});
		expect(res.status).toBe(200);

		const body = (await res.json()) as MeResponse;
		expect(body.user.id).toBe(mockDbUser.id);
		expect(body.user.orgId).toBe(mockDbUser.orgId);
		expect(body.user.auth0Id).toBe(mockDbUser.auth0Id);
		expect(body.user.name).toBe(mockDbUser.name);
		expect(body.user.email).toBe(mockDbUser.email);
		expect(body.user.role).toBe(mockDbUser.role);
		expect(body.user.createdAt).toBe(FIXED_DATE.toISOString());
		expect(body.org.id).toBe(mockDbOrg.id);
		expect(body.org.name).toBe(mockDbOrg.name);
		expect(body.org.slug).toBe(mockDbOrg.slug);
		expect(body.org.createdAt).toBe(FIXED_DATE.toISOString());
	});

	it("returns 200 for a mission_lead user", async () => {
		dbRows = [
			{
				users: { ...mockDbUser, role: "mission_lead" },
				organizations: mockDbOrg,
			},
		];
		const res = await app.request("/api/auth/me", {
			headers: { Authorization: "Bearer valid.token.here" },
		});
		expect(res.status).toBe(200);
		const body = (await res.json()) as MeResponse;
		expect(body.user.role).toBe("mission_lead");
	});

	it("returns 200 for a crew_member user", async () => {
		dbRows = [
			{
				users: { ...mockDbUser, role: "crew_member" },
				organizations: mockDbOrg,
			},
		];
		const res = await app.request("/api/auth/me", {
			headers: { Authorization: "Bearer valid.token.here" },
		});
		expect(res.status).toBe(200);
		const body = (await res.json()) as MeResponse;
		expect(body.user.role).toBe("crew_member");
	});

	it("orgId in response matches org.id (tenant scoping)", async () => {
		const res = await app.request("/api/auth/me", {
			headers: { Authorization: "Bearer valid.token.here" },
		});
		const body = (await res.json()) as MeResponse;
		expect(body.user.orgId).toBe(body.org.id);
	});
});

describe("GET /health (no auth required)", () => {
	it("returns 200 without a token", async () => {
		const res = await app.request("/health");
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.status).toBe("ok");
	});
});
