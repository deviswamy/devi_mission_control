import type { Organization, User } from "@mission-control/shared";
import { eq } from "drizzle-orm";
import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { db } from "../db/index.js";
import { organizations, users } from "../db/schema.js";

const domain = process.env.AUTH0_DOMAIN;
const audience = process.env.AUTH0_AUDIENCE;

if (!domain || !audience) {
	throw new Error("AUTH0_DOMAIN and AUTH0_AUDIENCE must be set");
}

const JWKS = createRemoteJWKSet(new URL(`https://${domain}/.well-known/jwks.json`));

declare module "hono" {
	interface ContextVariableMap {
		user: User;
		org: Organization;
		orgId: string;
	}
}

export const authMiddleware = createMiddleware(async (c, next) => {
	const authHeader = c.req.header("Authorization");
	if (!authHeader?.startsWith("Bearer ")) {
		throw new HTTPException(401, { message: "Missing or invalid Authorization header" });
	}

	const token = authHeader.slice(7);

	let sub: string;
	try {
		const result = await jwtVerify(token, JWKS, {
			audience,
			issuer: `https://${domain}/`,
		});
		sub = result.payload.sub as string;
	} catch {
		throw new HTTPException(401, { message: "Invalid token" });
	}

	const row = await db
		.select()
		.from(users)
		.innerJoin(organizations, eq(users.orgId, organizations.id))
		.where(eq(users.auth0Id, sub))
		.limit(1)
		.then((rows) => rows[0]);

	if (!row) {
		throw new HTTPException(401, { message: "User not found" });
	}

	const user: User = {
		id: row.users.id,
		orgId: row.users.orgId,
		auth0Id: row.users.auth0Id,
		name: row.users.name,
		email: row.users.email,
		role: row.users.role,
		createdAt: row.users.createdAt.toISOString(),
	};

	const org: Organization = {
		id: row.organizations.id,
		name: row.organizations.name,
		slug: row.organizations.slug,
		createdAt: row.organizations.createdAt.toISOString(),
	};

	c.set("user", user);
	c.set("org", org);

	await next();
});
